-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Everyone can view committee positions" ON public.committee_positions;

-- Create a new policy that allows all authenticated users to view committee positions
CREATE POLICY "Everyone can view committee positions" 
ON public.committee_positions 
FOR SELECT 
USING (true);