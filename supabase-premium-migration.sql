-- Add subscription columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS subscription_id TEXT,
ADD COLUMN IF NOT EXISTS polar_customer_id TEXT;

-- For RLS, allow users to read their own premium status (already covered if they can read their own profile)
