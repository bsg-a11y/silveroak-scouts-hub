-- Fix function search_path security for generate_receipt_number
CREATE OR REPLACE FUNCTION public.generate_receipt_number()
RETURNS TEXT AS $$
DECLARE
  today_str TEXT;
  seq_num INTEGER;
  receipt_num TEXT;
BEGIN
  today_str := TO_CHAR(CURRENT_DATE, 'DDMMYY');
  
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(receipt_number FROM 'BSGSOU/REC/' || today_str || '/(\d+)') AS INTEGER)
  ), 0) + 1
  INTO seq_num
  FROM public.collection_receipts
  WHERE receipt_number LIKE 'BSGSOU/REC/' || today_str || '/%';
  
  receipt_num := 'BSGSOU/REC/' || today_str || '/' || LPAD(seq_num::TEXT, 4, '0');
  
  RETURN receipt_num;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Fix function search_path security for set_receipt_number
CREATE OR REPLACE FUNCTION public.set_receipt_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.receipt_number IS NULL OR NEW.receipt_number = '' THEN
    NEW.receipt_number := public.generate_receipt_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Fix the profile visibility - allow all authenticated users to view basic profile data
-- for Our Team page (committee positions need to show profile info)
DROP POLICY IF EXISTS "Users can view profiles based on role" ON public.profiles;

CREATE POLICY "Users can view profiles based on role"
ON public.profiles
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND (
    user_id = auth.uid() 
    OR has_role(auth.uid(), 'admin'::user_role) 
    OR is_admin_or_coordinator(auth.uid()) 
    OR is_faculty_coordinator(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.committee_positions cp 
      WHERE cp.user_id = profiles.user_id
    )
  )
);