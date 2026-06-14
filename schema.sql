-- ============================================================
-- MANNER — Supabase Database Schema & Security Policies
-- ============================================================

-- Enable UUID extension (useful for generating random UUID keys)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── 1. Products Table Schema ───
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    category TEXT NOT NULL,
    image_url TEXT NOT NULL,
    stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable Row Level Security (RLS) on Products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- ─── 2. Products Table RLS Policies ───

-- Policy A: Allow anyone (public/anon) to read products
CREATE POLICY "Allow public read access to products" 
ON public.products 
FOR SELECT 
USING (true);

-- Policy B: Allow only authenticated users (admins) to write/modify products
CREATE POLICY "Allow authenticated admins full access to products" 
ON public.products 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);


-- ─── 3. Supabase Storage Configuration (Bucket: "product-images") ───

-- Note: The "product-images" bucket needs to be created in your Supabase dashboard under Storage.
-- Once created, you can execute the following policies to restrict writes to authenticated admins.

-- Policy A: Allow public read access to product-images bucket
CREATE POLICY "Allow public select from product-images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'product-images');

-- Policy B: Allow authenticated admins to upload images
CREATE POLICY "Allow authenticated admins to insert to product-images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'product-images');

-- Policy C: Allow authenticated admins to replace/update existing images
CREATE POLICY "Allow authenticated admins to update product-images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'product-images')
WITH CHECK (bucket_id = 'product-images');

-- Policy D: Allow authenticated admins to delete images
CREATE POLICY "Allow authenticated admins to delete product-images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'product-images');
