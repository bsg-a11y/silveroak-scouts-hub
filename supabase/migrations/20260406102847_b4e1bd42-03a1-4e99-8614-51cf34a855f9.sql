
CREATE TABLE public.external_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_id UUID REFERENCES public.activities(id) ON DELETE CASCADE,
  meeting_id UUID REFERENCES public.meetings(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  enrollment_number TEXT,
  college_name TEXT,
  department TEXT,
  semester INTEGER,
  pdf_url TEXT,
  added_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.external_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage external participants"
  ON public.external_participants
  FOR ALL
  USING (is_admin_or_coordinator(auth.uid()));

CREATE POLICY "Authenticated users can view external participants"
  ON public.external_participants
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE INDEX idx_external_participants_activity ON public.external_participants(activity_id);
CREATE INDEX idx_external_participants_meeting ON public.external_participants(meeting_id);
