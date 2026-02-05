-- Create table to store application type settings
CREATE TABLE public.application_type_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  application_type text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.application_type_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can view settings
CREATE POLICY "Everyone can view application type settings"
ON public.application_type_settings
FOR SELECT
USING (true);

-- Only admins can manage settings
CREATE POLICY "Admins can manage application type settings"
ON public.application_type_settings
FOR ALL
USING (is_admin_or_coordinator(auth.uid()));

-- Insert default settings for each application type
INSERT INTO public.application_type_settings (application_type, is_active) VALUES
  ('core', true),
  ('executive', true),
  ('institute_coordinator', true);