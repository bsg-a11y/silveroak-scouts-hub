-- Add joining_date column to profiles table
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS joining_date DATE DEFAULT NULL;