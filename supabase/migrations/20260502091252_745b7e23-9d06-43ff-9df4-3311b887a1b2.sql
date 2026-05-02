CREATE TABLE public.office_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  weekly_hours_target numeric NOT NULL DEFAULT 0,
  monthly_hours_target numeric NOT NULL DEFAULT 0,
  open_time time NOT NULL DEFAULT '09:00',
  close_time time NOT NULL DEFAULT '18:00',
  enforce_window boolean NOT NULL DEFAULT false,
  rules_text text NOT NULL DEFAULT '',
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.office_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view office rules"
  ON public.office_rules FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins manage office rules"
  ON public.office_rules FOR ALL
  USING (is_admin_or_coordinator(auth.uid()))
  WITH CHECK (is_admin_or_coordinator(auth.uid()));

CREATE TRIGGER trg_office_rules_updated_at
  BEFORE UPDATE ON public.office_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- seed singleton row
INSERT INTO public.office_rules (id) VALUES (gen_random_uuid());

-- realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.office_rules;