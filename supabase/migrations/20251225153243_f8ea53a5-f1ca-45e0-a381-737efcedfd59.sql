-- Fix 1: Restrict profiles SELECT policy to protect PII
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

CREATE POLICY "Users can view own profile or admins view all" ON public.profiles 
FOR SELECT TO authenticated 
USING (user_id = auth.uid() OR is_admin_or_coordinator(auth.uid()));

-- Fix 2: Restrict notifications INSERT to admins only
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;

CREATE POLICY "Admins can create notifications" ON public.notifications 
FOR INSERT TO authenticated 
WITH CHECK (is_admin_or_coordinator(auth.uid()));

-- Fix 3: Add authorization check to generate_next_uid function
CREATE OR REPLACE FUNCTION public.generate_next_uid()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  last_uid TEXT;
  next_num INTEGER;
BEGIN
  -- Only admins or coordinators should generate UIDs
  IF NOT is_admin_or_coordinator(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: Only admins or coordinators can generate UIDs';
  END IF;

  SELECT uid INTO last_uid FROM public.profiles ORDER BY created_at DESC LIMIT 1;
  IF last_uid IS NULL THEN
    RETURN 'BSG001';
  END IF;
  next_num := CAST(SUBSTRING(last_uid FROM 4) AS INTEGER) + 1;
  RETURN 'BSG' || LPAD(next_num::TEXT, 3, '0');
END;
$$;