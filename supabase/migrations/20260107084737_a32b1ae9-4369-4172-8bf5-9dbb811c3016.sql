-- Create tasks table for task allocation
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- 'social_media', 'outreach', 'designing', 'research'
  task_type TEXT NOT NULL, -- 'poster_creation', 'story_creation', etc.
  status TEXT NOT NULL DEFAULT 'allotted', -- 'allotted', 'in_process', 'in_approval', 'approved', 'posted'
  assigned_to UUID NOT NULL,
  assigned_by UUID,
  file_url TEXT,
  comments TEXT,
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create task comments for review feedback
CREATE TABLE public.task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on tasks
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

-- RLS policies for tasks
-- Admins and executives can manage all tasks
CREATE POLICY "Admins can manage all tasks"
ON public.tasks FOR ALL
USING (is_admin_or_coordinator(auth.uid()) OR has_role(auth.uid(), 'executive'::user_role));

-- Assigned members can view their tasks
CREATE POLICY "Members can view their own tasks"
ON public.tasks FOR SELECT
USING (auth.uid() = assigned_to);

-- Assigned members can update their tasks (for file upload and status changes)
CREATE POLICY "Members can update their own tasks"
ON public.tasks FOR UPDATE
USING (auth.uid() = assigned_to);

-- RLS policies for task_comments
CREATE POLICY "Admins and executives can manage task comments"
ON public.task_comments FOR ALL
USING (is_admin_or_coordinator(auth.uid()) OR has_role(auth.uid(), 'executive'::user_role));

CREATE POLICY "Members can view comments on their tasks"
ON public.task_comments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tasks 
    WHERE tasks.id = task_comments.task_id 
    AND tasks.assigned_to = auth.uid()
  )
);

-- Add collaboration fields to activities table
ALTER TABLE public.activities 
  ADD COLUMN IF NOT EXISTS collaboration_college TEXT,
  ADD COLUMN IF NOT EXISTS collaboration_department TEXT;

-- Create storage bucket for task files if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('task-files', 'task-files', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for task files
CREATE POLICY "Authenticated users can upload task files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'task-files');

CREATE POLICY "Users can view their own task files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'task-files');

CREATE POLICY "Users can update their own task files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'task-files');

-- Add trigger for updated_at on tasks
CREATE TRIGGER update_tasks_updated_at
BEFORE UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();