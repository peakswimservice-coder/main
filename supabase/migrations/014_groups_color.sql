-- Add color column to groups table
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#3B82F6';
