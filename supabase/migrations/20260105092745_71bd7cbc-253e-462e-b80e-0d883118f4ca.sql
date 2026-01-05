-- Update profiles RLS policy to allow faculty coordinators to view profiles
DROP POLICY IF EXISTS "Users can view own profile or admins view all" ON public.profiles;

CREATE POLICY "Users can view profiles based on role"
ON public.profiles
FOR SELECT
USING (
  (auth.uid() IS NOT NULL) AND (
    user_id = auth.uid() OR 
    has_role(auth.uid(), 'admin'::user_role) OR
    is_admin_or_coordinator(auth.uid()) OR
    is_faculty_coordinator(auth.uid())
  )
);

-- Add email column to profiles if it doesn't exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;