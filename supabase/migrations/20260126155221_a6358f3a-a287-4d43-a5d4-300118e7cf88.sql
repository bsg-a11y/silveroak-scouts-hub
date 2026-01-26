-- =====================================================
-- 1. Committee Interest Forms Tables
-- =====================================================

-- Create committee applications table
CREATE TABLE public.committee_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  application_type TEXT NOT NULL, -- 'core', 'executive', 'institute_coordinator'
  interested_department_id UUID REFERENCES public.committee_departments(id),
  reason TEXT NOT NULL,
  skill_ratings JSONB NOT NULL DEFAULT '{}'::jsonb, -- e.g., {"leadership": 4, "communication": 5}
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'reviewed', 'accepted', 'rejected'
  admin_comment TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on committee_applications
ALTER TABLE public.committee_applications ENABLE ROW LEVEL SECURITY;

-- Users can create their own applications
CREATE POLICY "Users can create own committee applications"
ON public.committee_applications FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- Users can view own applications, admins can view all
CREATE POLICY "Users can view own applications or admins view all"
ON public.committee_applications FOR SELECT
USING (auth.uid() IS NOT NULL AND (user_id = auth.uid() OR is_admin_or_coordinator(auth.uid())));

-- Admins can update applications
CREATE POLICY "Admins can update committee applications"
ON public.committee_applications FOR UPDATE
USING (auth.uid() IS NOT NULL AND is_admin_or_coordinator(auth.uid()));

-- Admins can delete applications
CREATE POLICY "Admins can delete committee applications"
ON public.committee_applications FOR DELETE
USING (auth.uid() IS NOT NULL AND is_admin_or_coordinator(auth.uid()));

-- =====================================================
-- 2. Activity Photos Tables
-- =====================================================

-- Create activity photos table
CREATE TABLE public.activity_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  caption TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  uploaded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on activity_photos
ALTER TABLE public.activity_photos ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can view photos
CREATE POLICY "Authenticated users can view activity photos"
ON public.activity_photos FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Admins can manage photos
CREATE POLICY "Admins can manage activity photos"
ON public.activity_photos FOR ALL
USING (is_admin_or_coordinator(auth.uid()));

-- =====================================================
-- 3. Activity Reports Tables
-- =====================================================

-- Create activity reports table
CREATE TABLE public.activity_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  report_type TEXT NOT NULL DEFAULT 'report', -- 'report', 'summary', 'documentation'
  file_url TEXT NOT NULL,
  file_type TEXT, -- 'pdf', 'docx', etc.
  uploaded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on activity_reports
ALTER TABLE public.activity_reports ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can view reports (including faculty)
CREATE POLICY "Authenticated users can view activity reports"
ON public.activity_reports FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Admins can manage reports
CREATE POLICY "Admins can manage activity reports"
ON public.activity_reports FOR ALL
USING (is_admin_or_coordinator(auth.uid()));

-- =====================================================
-- 4. Storage Buckets
-- =====================================================

-- Create storage bucket for activity photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('activity-photos', 'activity-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for activity reports
INSERT INTO storage.buckets (id, name, public)
VALUES ('activity-reports', 'activity-reports', false)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 5. Storage Policies for Activity Photos
-- =====================================================

-- Allow authenticated users to view photos
CREATE POLICY "Authenticated users can view activity photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'activity-photos' AND auth.uid() IS NOT NULL);

-- Allow admins to upload photos
CREATE POLICY "Admins can upload activity photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'activity-photos' 
  AND auth.uid() IS NOT NULL 
  AND public.is_admin_or_coordinator(auth.uid())
);

-- Allow admins to delete photos
CREATE POLICY "Admins can delete activity photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'activity-photos' 
  AND auth.uid() IS NOT NULL 
  AND public.is_admin_or_coordinator(auth.uid())
);

-- =====================================================
-- 6. Storage Policies for Activity Reports
-- =====================================================

-- Allow authenticated users to view reports
CREATE POLICY "Authenticated users can view activity reports"
ON storage.objects FOR SELECT
USING (bucket_id = 'activity-reports' AND auth.uid() IS NOT NULL);

-- Allow admins to upload reports
CREATE POLICY "Admins can upload activity reports"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'activity-reports' 
  AND auth.uid() IS NOT NULL 
  AND public.is_admin_or_coordinator(auth.uid())
);

-- Allow admins to delete reports
CREATE POLICY "Admins can delete activity reports"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'activity-reports' 
  AND auth.uid() IS NOT NULL 
  AND public.is_admin_or_coordinator(auth.uid())
);

-- =====================================================
-- 7. Fix examination materials to use correct bucket
-- =====================================================
-- (No changes needed for existing bucket, just ensure uploads use examination-materials)