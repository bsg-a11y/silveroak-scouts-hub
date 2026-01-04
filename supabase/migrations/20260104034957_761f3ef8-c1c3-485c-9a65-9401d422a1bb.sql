-- Drop the existing user update policy and create a more restrictive approach
DROP POLICY IF EXISTS "Users can update own non-sensitive profile fields" ON public.profiles;

-- Create a trigger function to restrict which fields users can update
CREATE OR REPLACE FUNCTION public.restrict_user_profile_updates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If user is admin or coordinator, allow all updates
  IF is_admin_or_coordinator(auth.uid()) THEN
    RETURN NEW;
  END IF;
  
  -- For regular users updating their own profile, restrict sensitive fields
  IF auth.uid() = OLD.user_id THEN
    -- Prevent modification of sensitive/admin-controlled fields
    IF NEW.uid IS DISTINCT FROM OLD.uid THEN
      RAISE EXCEPTION 'You cannot modify your UID';
    END IF;
    
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'You cannot modify your status';
    END IF;
    
    IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
      RAISE EXCEPTION 'You cannot modify user_id';
    END IF;
    
    IF NEW.aadhaar_number IS DISTINCT FROM OLD.aadhaar_number THEN
      RAISE EXCEPTION 'You cannot modify your Aadhaar number. Contact admin.';
    END IF;
    
    IF NEW.enrollment_number IS DISTINCT FROM OLD.enrollment_number THEN
      RAISE EXCEPTION 'You cannot modify your enrollment number. Contact admin.';
    END IF;
    
    RETURN NEW;
  END IF;
  
  -- Deny all other updates
  RAISE EXCEPTION 'Unauthorized profile update';
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS enforce_profile_update_restrictions ON public.profiles;
CREATE TRIGGER enforce_profile_update_restrictions
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.restrict_user_profile_updates();

-- Now create a simple user update policy (the trigger handles field restrictions)
CREATE POLICY "Users can update own profile with restrictions"
ON public.profiles
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create a view for non-admin users that masks sensitive data (optional extra layer)
CREATE OR REPLACE VIEW public.profiles_safe AS
SELECT 
  id,
  user_id,
  uid,
  first_name,
  middle_name,
  last_name,
  gender,
  date_of_birth,
  course_duration,
  college_name,
  current_semester,
  -- Mask Aadhaar: only show last 4 digits
  CASE 
    WHEN is_admin_or_coordinator(auth.uid()) OR user_id = auth.uid() 
    THEN aadhaar_number
    ELSE 'XXXX-XXXX-' || RIGHT(COALESCE(aadhaar_number, ''), 4)
  END as aadhaar_number,
  enrollment_number,
  class_coordinator_name,
  hod_name,
  principal_name,
  -- Mask WhatsApp: only show last 4 digits for non-owners
  CASE 
    WHEN is_admin_or_coordinator(auth.uid()) OR user_id = auth.uid() 
    THEN whatsapp_number
    ELSE 'XXXXXX' || RIGHT(COALESCE(whatsapp_number, ''), 4)
  END as whatsapp_number,
  blood_group,
  profile_photo_url,
  status,
  created_at,
  updated_at
FROM public.profiles;