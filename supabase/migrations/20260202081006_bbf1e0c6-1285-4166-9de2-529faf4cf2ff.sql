-- Student Reports: where students upload their activity reports
CREATE TABLE public.student_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  status TEXT NOT NULL DEFAULT 'submitted',
  admin_comment TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Consent Forms: admin uploads consent form templates
CREATE TABLE public.consent_forms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  form_type TEXT NOT NULL DEFAULT 'general',
  file_url TEXT NOT NULL,
  file_type TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  uploaded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.student_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consent_forms ENABLE ROW LEVEL SECURITY;

-- Student Reports Policies
CREATE POLICY "Users can create own student reports" 
  ON public.student_reports 
  FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Users can view own reports or admins view all" 
  ON public.student_reports 
  FOR SELECT 
  USING (auth.uid() IS NOT NULL AND (user_id = auth.uid() OR is_admin_or_coordinator(auth.uid())));

CREATE POLICY "Admins can update student reports" 
  ON public.student_reports 
  FOR UPDATE 
  USING (auth.uid() IS NOT NULL AND is_admin_or_coordinator(auth.uid()));

CREATE POLICY "Users can delete own reports" 
  ON public.student_reports 
  FOR DELETE 
  USING (auth.uid() IS NOT NULL AND (user_id = auth.uid() OR is_admin_or_coordinator(auth.uid())));

-- Consent Forms Policies
CREATE POLICY "Admins can manage consent forms" 
  ON public.consent_forms 
  FOR ALL 
  USING (is_admin_or_coordinator(auth.uid()));

CREATE POLICY "Authenticated users can view active consent forms" 
  ON public.consent_forms 
  FOR SELECT 
  USING (auth.uid() IS NOT NULL AND is_active = true);

-- Create storage bucket for student reports
INSERT INTO storage.buckets (id, name, public) VALUES ('student-reports', 'student-reports', false);

-- Create storage bucket for consent forms
INSERT INTO storage.buckets (id, name, public) VALUES ('consent-forms', 'consent-forms', false);

-- Storage policies for student-reports bucket
CREATE POLICY "Users can upload own student reports"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'student-reports' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own student reports or admins view all"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'student-reports' AND (auth.uid()::text = (storage.foldername(name))[1] OR is_admin_or_coordinator(auth.uid())));

CREATE POLICY "Users can delete own student reports"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'student-reports' AND (auth.uid()::text = (storage.foldername(name))[1] OR is_admin_or_coordinator(auth.uid())));

-- Storage policies for consent-forms bucket
CREATE POLICY "Admins can upload consent forms"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'consent-forms' AND is_admin_or_coordinator(auth.uid()));

CREATE POLICY "Authenticated users can view consent forms"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'consent-forms' AND auth.uid() IS NOT NULL);

CREATE POLICY "Admins can delete consent forms"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'consent-forms' AND is_admin_or_coordinator(auth.uid()));