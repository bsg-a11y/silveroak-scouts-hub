-- Create activity_suggestions table
CREATE TABLE public.activity_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  suggested_date TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_response TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.activity_suggestions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can create suggestions" 
ON public.activity_suggestions 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Users can view own suggestions or admins view all" 
ON public.activity_suggestions 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND (user_id = auth.uid() OR is_admin_or_coordinator(auth.uid())));

CREATE POLICY "Admins can update suggestions" 
ON public.activity_suggestions 
FOR UPDATE 
USING (auth.uid() IS NOT NULL AND is_admin_or_coordinator(auth.uid()));

CREATE POLICY "Admins can delete suggestions" 
ON public.activity_suggestions 
FOR DELETE 
USING (auth.uid() IS NOT NULL AND is_admin_or_coordinator(auth.uid()));