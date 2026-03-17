-- 1. Add the pdf_url column to your recipes table
ALTER TABLE public.recipes 
ADD COLUMN IF NOT EXISTS pdf_url TEXT;

-- 2. Once this is run, please create a Storage Bucket named 'recipe-pdfs' in your Supabase Dashboard
-- Make sure to set the bucket to "Public" so users can download and view the PDFs.
