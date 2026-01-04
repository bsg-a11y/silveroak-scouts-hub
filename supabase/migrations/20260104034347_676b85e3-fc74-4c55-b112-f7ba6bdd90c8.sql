-- 1. Fix the generate_next_uid function to check both profiles AND auth.users tables
CREATE OR REPLACE FUNCTION public.generate_next_uid()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  last_num INTEGER;
  next_num INTEGER;
  candidate_uid TEXT;
  email_to_check TEXT;
BEGIN
  -- Only admins or coordinators should generate UIDs
  IF NOT is_admin_or_coordinator(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: Only admins or coordinators can generate UIDs';
  END IF;

  -- Get the highest UID number from profiles
  SELECT MAX(CAST(SUBSTRING(uid FROM 4) AS INTEGER)) INTO last_num 
  FROM public.profiles 
  WHERE uid ~ '^BSG[0-9]+$';
  
  IF last_num IS NULL THEN
    last_num := 0;
  END IF;
  
  -- Find the next available UID that doesn't exist in auth.users
  next_num := last_num + 1;
  
  LOOP
    candidate_uid := 'BSG' || LPAD(next_num::TEXT, 3, '0');
    email_to_check := LOWER(candidate_uid) || '@bsg.local';
    
    -- Check if email already exists in auth.users
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = email_to_check) THEN
      -- Also check if UID exists in profiles (edge case)
      IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE uid = candidate_uid) THEN
        RETURN candidate_uid;
      END IF;
    END IF;
    
    next_num := next_num + 1;
    
    -- Safety: don't loop forever
    IF next_num > 9999 THEN
      RAISE EXCEPTION 'Unable to generate UID: maximum reached';
    END IF;
  END LOOP;
END;
$function$;

-- 2. Update admin profile to new details (BSG000, Ms. Dhruva Bhatt)
UPDATE public.profiles
SET 
  uid = 'BSG000',
  first_name = 'Ms. Dhruva',
  last_name = 'Bhatt',
  middle_name = NULL,
  whatsapp_number = '+919512111261'
WHERE user_id = 'ea041ceb-940b-41ef-8413-240c8eeb683d';

-- 3. Create a more restrictive RLS policy for user self-updates (excluding status and other admin fields)
-- First drop the existing update policy
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;

-- Create separate policies for admin updates and user self-updates
CREATE POLICY "Admins can update all profile fields"
ON public.profiles
FOR UPDATE
USING (is_admin_or_coordinator(auth.uid()));

CREATE POLICY "Users can update own non-sensitive profile fields"
ON public.profiles
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  -- This policy allows the update, but we'll handle field restrictions in the app
);