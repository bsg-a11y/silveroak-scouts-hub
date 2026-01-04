-- Create certificate_requests table for member requests
CREATE TABLE public.certificate_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  activity_id uuid REFERENCES public.activities(id) ON DELETE CASCADE,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  admin_comment text,
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.certificate_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can create own certificate requests"
ON public.certificate_requests
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Users can view own requests or admins view all"
ON public.certificate_requests
FOR SELECT
USING (auth.uid() IS NOT NULL AND (user_id = auth.uid() OR is_admin_or_coordinator(auth.uid())));

CREATE POLICY "Admins can update certificate requests"
ON public.certificate_requests
FOR UPDATE
USING (auth.uid() IS NOT NULL AND is_admin_or_coordinator(auth.uid()));

CREATE POLICY "Admins can delete certificate requests"
ON public.certificate_requests
FOR DELETE
USING (auth.uid() IS NOT NULL AND is_admin_or_coordinator(auth.uid()));

-- Add employee_id field to profiles for program officer
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS employee_id text;

-- Add is_program_officer flag to profiles to identify BSG000
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_program_officer boolean DEFAULT false;