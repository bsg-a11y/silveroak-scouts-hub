-- Drop the public access policy and create authenticated-only policy for activities
DROP POLICY IF EXISTS "Anyone can view activities" ON public.activities;

CREATE POLICY "Authenticated users can view activities" 
ON public.activities 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Also fix announcements, meetings, and resources tables for consistency
DROP POLICY IF EXISTS "Anyone can view announcements" ON public.announcements;

CREATE POLICY "Authenticated users can view announcements" 
ON public.announcements 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Anyone can view meetings" ON public.meetings;

CREATE POLICY "Authenticated users can view meetings" 
ON public.meetings 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Anyone can view resources" ON public.resources;

CREATE POLICY "Authenticated users can view resources" 
ON public.resources 
FOR SELECT 
USING (auth.uid() IS NOT NULL);