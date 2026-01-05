-- 1. Add new 'faculty_coordinator' role to the enum
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'faculty_coordinator';