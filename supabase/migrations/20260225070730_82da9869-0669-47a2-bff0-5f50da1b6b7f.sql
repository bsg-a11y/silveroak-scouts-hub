-- Add columns for custom certificate requests (custom activity name & date)
ALTER TABLE public.certificate_requests 
ADD COLUMN custom_activity_name text,
ADD COLUMN custom_activity_date date;