-- Fix the trigger to allow is_program_officer updates and use admin bypass
CREATE OR REPLACE FUNCTION public.restrict_user_profile_updates()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
  -- Allow system-level operations (migrations)
  IF current_setting('session_replication_role', true) = 'replica' THEN
    RETURN NEW;
  END IF;
  
  -- If there's no auth context, block the update
  IF auth.uid() IS NULL THEN
    RETURN NEW;  -- Allow for migrations/admin operations
  END IF;
  
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
    
    IF NEW.is_program_officer IS DISTINCT FROM OLD.is_program_officer THEN
      RAISE EXCEPTION 'You cannot modify program officer status';
    END IF;
    
    RETURN NEW;
  END IF;
  
  -- Deny all other updates
  RAISE EXCEPTION 'Unauthorized profile update';
END;
$function$;