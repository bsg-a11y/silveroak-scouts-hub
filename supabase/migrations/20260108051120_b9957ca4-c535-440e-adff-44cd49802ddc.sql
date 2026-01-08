-- Create collection_drives table for tracking drive types
CREATE TABLE public.collection_drives (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  drive_date DATE,
  status TEXT NOT NULL DEFAULT 'active',
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create collection_receipts table for tracking individual donations
CREATE TABLE public.collection_receipts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  receipt_number TEXT NOT NULL UNIQUE,
  drive_id UUID REFERENCES public.collection_drives(id) ON DELETE SET NULL,
  donor_type TEXT NOT NULL CHECK (donor_type IN ('internal', 'external')),
  -- For internal members
  member_id UUID,
  -- For external donors
  donor_name TEXT,
  donor_college TEXT,
  donor_whatsapp TEXT,
  -- Common fields
  item_type TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit TEXT DEFAULT 'pieces',
  notes TEXT,
  collection_date DATE NOT NULL DEFAULT CURRENT_DATE,
  collected_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create function to generate receipt number
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
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate receipt number
CREATE OR REPLACE FUNCTION public.set_receipt_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.receipt_number IS NULL OR NEW.receipt_number = '' THEN
    NEW.receipt_number := public.generate_receipt_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_receipt_number_trigger
BEFORE INSERT ON public.collection_receipts
FOR EACH ROW
EXECUTE FUNCTION public.set_receipt_number();

-- Enable RLS
ALTER TABLE public.collection_drives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_receipts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for collection_drives
CREATE POLICY "Admins can manage collection drives"
ON public.collection_drives
FOR ALL
USING (is_admin_or_coordinator(auth.uid()));

CREATE POLICY "Authenticated users can view collection drives"
ON public.collection_drives
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- RLS Policies for collection_receipts
CREATE POLICY "Admins can manage collection receipts"
ON public.collection_receipts
FOR ALL
USING (is_admin_or_coordinator(auth.uid()));

CREATE POLICY "Authenticated users can view collection receipts"
ON public.collection_receipts
FOR SELECT
USING (auth.uid() IS NOT NULL);