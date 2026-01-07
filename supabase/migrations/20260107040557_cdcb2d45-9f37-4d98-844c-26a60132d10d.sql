-- Add academic_department column to profiles for storing the department
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS academic_department text;