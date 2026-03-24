-- Create app_settings table to store global configurations
CREATE TABLE IF NOT EXISTS public.app_settings (
    id TEXT PRIMARY KEY DEFAULT 'global',
    schedule_image_url TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Insert a default row if it doesn't exist
INSERT INTO public.app_settings (id) 
VALUES ('global') 
ON CONFLICT (id) DO NOTHING;
