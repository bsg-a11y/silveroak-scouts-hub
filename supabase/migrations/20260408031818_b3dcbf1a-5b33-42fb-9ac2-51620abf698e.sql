
ALTER TABLE public.custom_forms
ADD COLUMN visibility_type TEXT NOT NULL DEFAULT 'everyone',
ADD COLUMN assigned_member_ids UUID[] DEFAULT '{}';
