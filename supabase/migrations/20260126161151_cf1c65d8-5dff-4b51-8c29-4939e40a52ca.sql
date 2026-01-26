-- Create custom_forms table for admin-created forms
CREATE TABLE public.custom_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  form_type text NOT NULL DEFAULT 'general',
  fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create form submissions table
CREATE TABLE public.form_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL REFERENCES public.custom_forms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  responses jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'submitted',
  reviewed_by uuid,
  reviewed_at timestamptz,
  admin_comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.custom_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;

-- RLS policies for custom_forms
CREATE POLICY "Admins can manage custom forms"
  ON public.custom_forms FOR ALL
  USING (is_admin_or_coordinator(auth.uid()));

CREATE POLICY "Authenticated users can view active forms"
  ON public.custom_forms FOR SELECT
  USING (auth.uid() IS NOT NULL AND is_active = true);

-- RLS policies for form_submissions
CREATE POLICY "Users can create own submissions"
  ON public.form_submissions FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Users can view own submissions or admins view all"
  ON public.form_submissions FOR SELECT
  USING (auth.uid() IS NOT NULL AND (user_id = auth.uid() OR is_admin_or_coordinator(auth.uid())));

CREATE POLICY "Admins can update submissions"
  ON public.form_submissions FOR UPDATE
  USING (auth.uid() IS NOT NULL AND is_admin_or_coordinator(auth.uid()));

CREATE POLICY "Admins can delete submissions"
  ON public.form_submissions FOR DELETE
  USING (auth.uid() IS NOT NULL AND is_admin_or_coordinator(auth.uid()));

-- Add trigger for updated_at
CREATE TRIGGER update_custom_forms_updated_at
  BEFORE UPDATE ON public.custom_forms
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();