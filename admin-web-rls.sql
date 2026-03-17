-- 1. Allow anyone to upload PDF files to the 'recipe-pdfs' bucket
CREATE POLICY "Allow anon upload recipe-pdfs" 
ON storage.objects 
FOR INSERT TO public 
WITH CHECK (bucket_id = 'recipe-pdfs');

-- 2. Allow anyone to insert rows into the 'recipes' table from the web admin
CREATE POLICY "Allow anon recipes insert" 
ON public.recipes 
FOR INSERT TO public 
WITH CHECK (true);
