-- 2. Create colleges reference table
CREATE TABLE public.colleges (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    short_code text NOT NULL UNIQUE,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Insert all colleges
INSERT INTO public.colleges (name, short_code) VALUES
('Silver Oak College Of Engineering & Technology', 'SOCET'),
('Aditya Silver Oak Institute of Technology', 'ASOIT'),
('Silver Oak College of Humanities & Social Sciences', 'SOCHSS'),
('Silver Oak College of Computer Applications', 'SOCCA'),
('Silver Oak Institute of Science', 'SOIS'),
('Silver Oak Institute of Management', 'SOIM'),
('Silver Oak Commerce College', 'SOCC'),
('Silver Oak College of Vocational Education', 'SOCVE'),
('Silver Oak Law College', 'SOLC'),
('Silver Oak College of Physiotherapy', 'SOCP'),
('Silver Oak Pharmacy College', 'SOPC'),
('Silver Oak College of Nursing', 'SOCN'),
('Silver Oak Institute of Business Management', 'SOIBM'),
('Silver Oak College of Liberal Studies', 'SOCLS'),
('Silver Oak College of Animation & Multimedia', 'SOCAM'),
('Silver Oak College of Aviation & Technology', 'SOCAT'),
('Silver Oak Institute of Design', 'SOID');

-- Enable RLS
ALTER TABLE public.colleges ENABLE ROW LEVEL SECURITY;

-- Everyone can view colleges
CREATE POLICY "Everyone can view colleges" ON public.colleges
FOR SELECT USING (true);

-- 3. Create committee departments table
CREATE TABLE public.committee_departments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    committee_type text NOT NULL CHECK (committee_type IN ('executive', 'core')),
    display_order int NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Insert default departments for Executive Committee
INSERT INTO public.committee_departments (name, committee_type, display_order) VALUES
('Research, Development & Brainstorming', 'executive', 1),
('Designing & Graphics', 'executive', 2),
('Outreach', 'executive', 3),
('Social Media', 'executive', 4);

-- Insert default departments for Core Committee
INSERT INTO public.committee_departments (name, committee_type, display_order) VALUES
('Research, Development & Brainstorming', 'core', 1),
('Designing & Graphics', 'core', 2),
('Outreach', 'core', 3),
('Social Media', 'core', 4);

ALTER TABLE public.committee_departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view committee departments" ON public.committee_departments
FOR SELECT USING (true);

CREATE POLICY "Admins can manage committee departments" ON public.committee_departments
FOR ALL USING (is_admin_or_coordinator(auth.uid()));

-- 4. Create committee positions table
CREATE TABLE public.committee_positions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    position_type text NOT NULL CHECK (position_type IN ('institute_coordinator', 'executive', 'core')),
    position_title text,
    department_id uuid REFERENCES public.committee_departments(id) ON DELETE SET NULL,
    email text,
    phone text,
    display_order int NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(user_id, position_type)
);

ALTER TABLE public.committee_positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view committee positions" ON public.committee_positions
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage committee positions" ON public.committee_positions
FOR ALL USING (is_admin_or_coordinator(auth.uid()));

-- 5. Create activity_departments junction table
CREATE TABLE public.activity_departments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id uuid NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
    department_id uuid NOT NULL REFERENCES public.committee_departments(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(activity_id, department_id)
);

ALTER TABLE public.activity_departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view activity departments" ON public.activity_departments
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage activity departments" ON public.activity_departments
FOR ALL USING (is_admin_or_coordinator(auth.uid()));

-- 6. Add faculty_college_id to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS faculty_college_id uuid REFERENCES public.colleges(id);

-- 7. Create function to check if user is a faculty coordinator
CREATE OR REPLACE FUNCTION public.is_faculty_coordinator(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'faculty_coordinator'
  )
$$;

-- 8. Create function to get faculty coordinator's college
CREATE OR REPLACE FUNCTION public.get_faculty_college_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT faculty_college_id
  FROM public.profiles
  WHERE user_id = _user_id
$$;

-- 9. Update activity_registrations RLS to allow faculty coordinators
DROP POLICY IF EXISTS "Users can view own registrations or admins view all" ON public.activity_registrations;

CREATE POLICY "Users can view own registrations or admins view all" ON public.activity_registrations
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    user_id = auth.uid() OR 
    is_admin_or_coordinator(auth.uid()) OR
    is_faculty_coordinator(auth.uid())
  )
);

-- 10. Create trigger to update updated_at on committee_positions
CREATE TRIGGER update_committee_positions_updated_at
BEFORE UPDATE ON public.committee_positions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 11. Function to generate faculty UID with college prefix
CREATE OR REPLACE FUNCTION public.generate_faculty_uid(_college_short_code text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  last_num INTEGER;
  next_num INTEGER;
  candidate_uid TEXT;
  prefix TEXT;
BEGIN
  prefix := 'SOFAC' || SUBSTRING(_college_short_code FROM 1 FOR 3);
  
  SELECT MAX(
    CAST(SUBSTRING(uid FROM LENGTH(prefix) + 1) AS INTEGER)
  ) INTO last_num 
  FROM public.profiles 
  WHERE uid LIKE prefix || '%';
  
  IF last_num IS NULL THEN
    last_num := 0;
  END IF;
  
  next_num := last_num + 1;
  candidate_uid := prefix || LPAD(next_num::TEXT, 3, '0');
  
  RETURN candidate_uid;
END;
$$;