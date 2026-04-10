
-- Drop the existing attendance SELECT policy and recreate with faculty coordinator access
DROP POLICY IF EXISTS "Users can view own attendance" ON public.attendance;

CREATE POLICY "Users can view own attendance"
ON public.attendance
FOR SELECT
TO public
USING (
  (auth.uid() IS NOT NULL) AND (
    (user_id = auth.uid()) OR 
    is_admin_or_coordinator(auth.uid()) OR 
    is_faculty_coordinator(auth.uid())
  )
);
