-- Drop the existing SELECT policy on activity_registrations
DROP POLICY IF EXISTS "Users can view registrations" ON public.activity_registrations;

-- Create new restrictive SELECT policy - only own registrations or admin/coordinator
CREATE POLICY "Users can view own registrations or admins view all"
ON public.activity_registrations
FOR SELECT
USING (
  (user_id = auth.uid()) OR is_admin_or_coordinator(auth.uid())
);