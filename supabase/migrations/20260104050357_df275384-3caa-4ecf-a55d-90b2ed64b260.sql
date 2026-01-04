-- Create a UID generator that can be called from backend functions using service privileges
-- while still enforcing that only admins/coordinators can request it.

CREATE OR REPLACE FUNCTION public.generate_next_uid_for(_caller uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  last_num INTEGER;
  next_num INTEGER;
  candidate_uid TEXT;
  email_to_check TEXT;
BEGIN
  -- Only admins or coordinators should generate UIDs
  IF NOT public.is_admin_or_coordinator(_caller) THEN
    RAISE EXCEPTION 'Unauthorized: Only admins or coordinators can generate UIDs';
  END IF;

  -- Get the highest UID number from profiles
  SELECT MAX(CAST(SUBSTRING(uid FROM 4) AS INTEGER))
    INTO last_num
  FROM public.profiles
  WHERE uid ~ '^BSG[0-9]+$';

  IF last_num IS NULL THEN
    last_num := 0;
  END IF;

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

    IF next_num > 9999 THEN
      RAISE EXCEPTION 'Unable to generate UID: maximum reached';
    END IF;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.generate_next_uid_for(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_next_uid_for(uuid) TO authenticated;