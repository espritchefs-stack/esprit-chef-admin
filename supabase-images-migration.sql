-- 1. Create a bucket named "recipe-photos" inside the Supabase Storage Dashboard FIRST (Must be 'Public'!)
-- 2. Then run this SQL to allow administrative uploads from the web app
CREATE POLICY "Allow anon upload recipe-photos" 
ON storage.objects 
FOR INSERT TO public 
WITH CHECK (bucket_id = 'recipe-photos');
