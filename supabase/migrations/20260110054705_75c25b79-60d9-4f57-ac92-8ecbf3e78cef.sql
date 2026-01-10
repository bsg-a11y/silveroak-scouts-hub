-- Add policy for admins to view all task files
CREATE POLICY "Admins can view all task files"
ON storage.objects
FOR SELECT
USING (bucket_id = 'task-files' AND is_admin_or_coordinator(auth.uid()));