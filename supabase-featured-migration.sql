-- Add is_featured column to recipes table
ALTER TABLE public.recipes 
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;
