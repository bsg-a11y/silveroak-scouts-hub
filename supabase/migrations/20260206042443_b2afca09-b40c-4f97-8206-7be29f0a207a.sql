-- Create table to store Google Sheets integration settings
CREATE TABLE public.google_sheets_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sheet_id text,
  sheet_url text,
  sheet_name text NOT NULL DEFAULT 'BSG Members',
  is_enabled boolean NOT NULL DEFAULT false,
  last_synced_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid,
  CONSTRAINT single_settings_row CHECK (id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid)
);

-- Insert default row (only one row allowed)
INSERT INTO public.google_sheets_settings (id, sheet_name) 
VALUES ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'BSG Members');

-- Enable RLS
ALTER TABLE public.google_sheets_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins can manage google sheets settings"
ON public.google_sheets_settings
FOR ALL
USING (is_admin_or_coordinator(auth.uid()));

CREATE POLICY "Authenticated users can view google sheets settings"
ON public.google_sheets_settings
FOR SELECT
USING (auth.uid() IS NOT NULL);