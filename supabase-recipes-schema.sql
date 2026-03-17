-- 1. Ensure all columns needed by the mobile app AND the web admin exist.
-- If they already exist, 'ADD COLUMN IF NOT EXISTS' will safely skip them.
ALTER TABLE public.recipes 
ADD COLUMN IF NOT EXISTS title TEXT,  -- Just in case we use a unified title 
ADD COLUMN IF NOT EXISTS title_en TEXT,
ADD COLUMN IF NOT EXISTS title_ko TEXT,
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS pdf_url TEXT,
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS prep_time INTEGER,
ADD COLUMN IF NOT EXISTS cook_time INTEGER,
ADD COLUMN IF NOT EXISTS difficulty TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS week TEXT,
ADD COLUMN IF NOT EXISTS chefs_note TEXT;

-- 2. Ensure JSONB columns for dynamic lists
ADD COLUMN IF NOT EXISTS ingredients JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS steps JSONB DEFAULT '[]'::jsonb;
