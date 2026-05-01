-- Office attendance logs (BSG office daily check-in/check-out)
CREATE TABLE public.office_attendance_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  check_in_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  check_out_at TIMESTAMP WITH TIME ZONE,
  log_date DATE GENERATED ALWAYS AS ((check_in_at AT TIME ZONE 'Asia/Kolkata')::date) STORED,
  marked_by UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_office_att_user_date ON public.office_attendance_logs(user_id, log_date);
CREATE INDEX idx_office_att_open ON public.office_attendance_logs(user_id) WHERE check_out_at IS NULL;

ALTER TABLE public.office_attendance_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage office attendance"
ON public.office_attendance_logs FOR ALL
USING (is_admin_or_coordinator(auth.uid()))
WITH CHECK (is_admin_or_coordinator(auth.uid()));

CREATE POLICY "Users view own office attendance"
ON public.office_attendance_logs FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND (user_id = auth.uid() OR is_admin_or_coordinator(auth.uid()) OR is_faculty_coordinator(auth.uid()))
);

CREATE TRIGGER update_office_att_updated_at
BEFORE UPDATE ON public.office_attendance_logs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.office_attendance_logs;
ALTER TABLE public.office_attendance_logs REPLICA IDENTITY FULL;