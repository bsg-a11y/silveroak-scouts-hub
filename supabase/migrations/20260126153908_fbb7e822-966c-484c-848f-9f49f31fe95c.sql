-- Create storage bucket for examination materials
INSERT INTO storage.buckets (id, name, public)
VALUES ('examination-materials', 'examination-materials', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for examination materials bucket
-- Allow authenticated users to view materials
CREATE POLICY "Authenticated users can view examination materials"
ON storage.objects FOR SELECT
USING (bucket_id = 'examination-materials' AND auth.uid() IS NOT NULL);

-- Allow admins/coordinators to upload materials
CREATE POLICY "Admins can upload examination materials"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'examination-materials' 
  AND auth.uid() IS NOT NULL 
  AND public.is_admin_or_coordinator(auth.uid())
);

-- Allow admins/coordinators to update materials
CREATE POLICY "Admins can update examination materials"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'examination-materials' 
  AND auth.uid() IS NOT NULL 
  AND public.is_admin_or_coordinator(auth.uid())
);

-- Allow admins/coordinators to delete materials
CREATE POLICY "Admins can delete examination materials"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'examination-materials' 
  AND auth.uid() IS NOT NULL 
  AND public.is_admin_or_coordinator(auth.uid())
);