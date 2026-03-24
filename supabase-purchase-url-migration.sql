-- Add purchase_url column to recipes table
ALTER TABLE public.recipes 
ADD COLUMN IF NOT EXISTS purchase_url TEXT;

-- Update the TypeScript interface in the frontend (optional reminder for frontend code, but nice to have in SQL as a comment)
-- type Recipe = { ... purchase_url?: string | null }
