-- Update generate_next_uid() function to use BSGSOU prefix
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
  IF NOT is_admin_or_coordinator(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: Only admins or coordinators can generate UIDs';
  END IF;

  -- Check for both old BSG and new BSGSOU formats to get the highest number
  SELECT MAX(
    CASE 
      WHEN uid ~ '^BSGSOU[0-9]+$' THEN CAST(SUBSTRING(uid FROM 7) AS INTEGER)
      WHEN uid ~ '^BSG[0-9]+$' THEN CAST(SUBSTRING(uid FROM 4) AS INTEGER)
    END
  ) INTO last_num 
  FROM public.profiles 
  WHERE uid ~ '^BSG(SOU)?[0-9]+$';
  
  IF last_num IS NULL THEN
    last_num := -1;
  END IF;
  
  next_num := last_num + 1;
  
  LOOP
    -- New format: BSGSOU + 3-digit number
    candidate_uid := 'BSGSOU' || LPAD(next_num::TEXT, 3, '0');
    email_to_check := LOWER(candidate_uid) || '@bsg.local';
    
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = email_to_check) THEN
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
$function$;

-- Update generate_next_uid_for() function to use BSGSOU prefix
CREATE OR REPLACE FUNCTION public.generate_next_uid_for(_caller uuid)
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
  IF NOT is_admin_or_coordinator(_caller) THEN
    RAISE EXCEPTION 'Unauthorized: Only admins or coordinators can generate UIDs';
  END IF;

  -- Check for both old BSG and new BSGSOU formats to get the highest number
  SELECT MAX(
    CASE 
      WHEN uid ~ '^BSGSOU[0-9]+$' THEN CAST(SUBSTRING(uid FROM 7) AS INTEGER)
      WHEN uid ~ '^BSG[0-9]+$' THEN CAST(SUBSTRING(uid FROM 4) AS INTEGER)
    END
  ) INTO last_num 
  FROM public.profiles 
  WHERE uid ~ '^BSG(SOU)?[0-9]+$';
  
  IF last_num IS NULL THEN
    last_num := -1;
  END IF;
  
  next_num := last_num + 1;
  
  LOOP
    -- New format: BSGSOU + 3-digit number
    candidate_uid := 'BSGSOU' || LPAD(next_num::TEXT, 3, '0');
    email_to_check := LOWER(candidate_uid) || '@bsg.local';
    
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = email_to_check) THEN
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
$function$;

-- Migrate existing UIDs from BSG to BSGSOU format
UPDATE public.profiles SET uid = 'BSGSOU' || SUBSTRING(uid FROM 4) WHERE uid ~ '^BSG[0-9]+$';