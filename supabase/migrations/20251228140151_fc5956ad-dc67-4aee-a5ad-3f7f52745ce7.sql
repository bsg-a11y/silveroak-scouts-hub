-- Drop the existing SELECT policy on user_roles
DROP POLICY IF EXISTS "Users can view roles" ON public.user_roles;

-- Create new restrictive SELECT policy - only own roles or admin
CREATE POLICY "Users can view own roles or admins view all"
ON public.user_roles
FOR SELECT
USING (
  (user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::user_role)
);