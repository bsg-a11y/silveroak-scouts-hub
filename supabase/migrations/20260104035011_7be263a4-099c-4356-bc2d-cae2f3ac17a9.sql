-- Drop the security definer view and recreate without security definer
DROP VIEW IF EXISTS public.profiles_safe;

-- Create a regular view (inherits invoker's permissions, which is safer)
CREATE VIEW public.profiles_safe 
WITH (security_invoker = true)
AS
SELECT 
  id,
  user_id,
  uid,
  first_name,
  middle_name,
  last_name,
  gender,
  date_of_birth,
  course_duration,
  college_name,
  current_semester,
  -- Mask Aadhaar: only show last 4 digits for non-owners/non-admins
  CASE 
    WHEN is_admin_or_coordinator(auth.uid()) OR user_id = auth.uid() 
    THEN aadhaar_number
    ELSE 'XXXX-XXXX-' || RIGHT(COALESCE(aadhaar_number, ''), 4)
  END as aadhaar_number,
  enrollment_number,
  class_coordinator_name,
  hod_name,
  principal_name,
  -- Mask WhatsApp: only show last 4 digits for non-owners/non-admins
  CASE 
    WHEN is_admin_or_coordinator(auth.uid()) OR user_id = auth.uid() 
    THEN whatsapp_number
    ELSE 'XXXXXX' || RIGHT(COALESCE(whatsapp_number, ''), 4)
  END as whatsapp_number,
  blood_group,
  profile_photo_url,
  status,
  created_at,
  updated_at
FROM public.profiles;