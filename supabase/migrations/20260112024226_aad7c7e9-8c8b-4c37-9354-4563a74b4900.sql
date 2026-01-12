-- Create examination stages reference table
CREATE TABLE public.examination_stages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  display_order integer NOT NULL DEFAULT 0,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Insert the 6 BSG examination stages
INSERT INTO public.examination_stages (name, display_order, description) VALUES
  ('Joining', 1, 'Initial joining stage for all BSG members'),
  ('Pravesh', 2, 'Pravesh examination stage'),
  ('Nipun', 3, 'Nipun examination stage'),
  ('Rajyapuraskar', 4, 'Rajyapuraskar examination stage'),
  ('Rashtrapti Puraskar', 5, 'Rashtrapti Puraskar (President''s Award) examination stage'),
  ('Ranger Rover', 6, 'Ranger Rover advanced examination stage');

-- Enable RLS
ALTER TABLE public.examination_stages ENABLE ROW LEVEL SECURITY;

-- Everyone can view examination stages
CREATE POLICY "Everyone can view examination stages"
  ON public.examination_stages
  FOR SELECT
  USING (true);

-- Create examination materials table (for notes and logbooks uploaded by admin)
CREATE TABLE public.examination_materials (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stage_id uuid NOT NULL REFERENCES public.examination_stages(id) ON DELETE CASCADE,
  title text NOT NULL,
  material_type text NOT NULL CHECK (material_type IN ('notes', 'logbook', 'other')),
  file_url text NOT NULL,
  description text,
  uploaded_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.examination_materials ENABLE ROW LEVEL SECURITY;

-- Everyone can view examination materials
CREATE POLICY "Everyone can view examination materials"
  ON public.examination_materials
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Admins can manage examination materials
CREATE POLICY "Admins can manage examination materials"
  ON public.examination_materials
  FOR ALL
  USING (is_admin_or_coordinator(auth.uid()));

-- Create member examination status table
CREATE TABLE public.member_examinations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stage_id uuid NOT NULL REFERENCES public.examination_stages(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'ongoing' CHECK (status IN ('ongoing', 'complete')),
  exam_year integer NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::integer,
  applied_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone,
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, stage_id)
);

-- Enable RLS
ALTER TABLE public.member_examinations ENABLE ROW LEVEL SECURITY;

-- Users can view their own examination status
CREATE POLICY "Users can view own examination status"
  ON public.member_examinations
  FOR SELECT
  USING (auth.uid() IS NOT NULL AND (user_id = auth.uid() OR is_admin_or_coordinator(auth.uid()) OR is_faculty_coordinator(auth.uid())));

-- Admins can manage member examination status
CREATE POLICY "Admins can manage member examination status"
  ON public.member_examinations
  FOR ALL
  USING (is_admin_or_coordinator(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_examination_materials_updated_at
  BEFORE UPDATE ON public.examination_materials
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_member_examinations_updated_at
  BEFORE UPDATE ON public.member_examinations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();