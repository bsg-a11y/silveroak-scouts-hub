-- Drop the existing SELECT policy on profiles
DROP POLICY IF EXISTS "Users can view own profile or admins view all" ON public.profiles;

-- Create new restrictive SELECT policy - only own profile or admin
CREATE POLICY "Users can view own profile or admins view all"
ON public.profiles
FOR SELECT
USING (
  (user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::user_role)
);