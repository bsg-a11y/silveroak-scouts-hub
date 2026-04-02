
-- Drop existing foreign keys and re-add with CASCADE
ALTER TABLE public.attendance DROP CONSTRAINT IF EXISTS attendance_activity_id_fkey;
ALTER TABLE public.attendance ADD CONSTRAINT attendance_activity_id_fkey 
  FOREIGN KEY (activity_id) REFERENCES public.activities(id) ON DELETE CASCADE;

ALTER TABLE public.attendance DROP CONSTRAINT IF EXISTS attendance_meeting_id_fkey;
ALTER TABLE public.attendance ADD CONSTRAINT attendance_meeting_id_fkey 
  FOREIGN KEY (meeting_id) REFERENCES public.meetings(id) ON DELETE CASCADE;
