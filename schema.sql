-- ============================================================
-- MANNER — Unified Supabase Database Schema & Security Policies
-- ============================================================

-- Enable UUID extension (useful for generating random UUID keys)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── 1. Products Table Schema ───
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    old_price NUMERIC(10, 2) CHECK (old_price >= 0),
    category TEXT NOT NULL,
    image_url TEXT,
    image_url_2 TEXT,
    image_url_3 TEXT,
    sizes JSONB DEFAULT '[]',
    colors JSONB DEFAULT '[]',
    stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    bestseller BOOLEAN DEFAULT false,
    new_arrival BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ─── 2. Admins Table Schema ───
CREATE TABLE IF NOT EXISTS public.admins (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT DEFAULT 'Administrator',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ─── 3. Orders Table Schema ───
CREATE TABLE IF NOT EXISTS public.orders (
    id TEXT PRIMARY KEY,
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_phone TEXT,
    customer_address TEXT,
    items JSONB DEFAULT '[]',
    subtotal NUMERIC(10, 2) DEFAULT 0,
    total_amount NUMERIC(10, 2) DEFAULT 0,
    status TEXT DEFAULT 'pending',
    payment_method TEXT DEFAULT 'cod',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ─── 4. Security & Access Control (RLS Policies) ───

-- Disable RLS to allow backend access via anonymous key
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;

-- If RLS is enabled, apply basic policies:
-- ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "Allow public read access to products" ON public.products;
-- CREATE POLICY "Allow public read access to products" ON public.products FOR SELECT USING (true);
-- DROP POLICY IF EXISTS "Allow authenticated admins full access to products" ON public.products;
-- CREATE POLICY "Allow authenticated admins full access to products" ON public.products FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- ─── 5. Supabase Storage Configuration (Bucket: "product-images") ───

-- Note: Create a public storage bucket named "product-images" in your Supabase dashboard first.
-- Then execute the following policies to restrict writes to authenticated users.

-- Policy A: Allow public read access to product-images bucket
DROP POLICY IF EXISTS "Allow public select from product-images" ON storage.objects;
CREATE POLICY "Allow public select from product-images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'product-images');

-- Policy B: Allow authenticated admins to upload images
DROP POLICY IF EXISTS "Allow authenticated admins to insert to product-images" ON storage.objects;
CREATE POLICY "Allow authenticated admins to insert to product-images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'product-images');

-- Policy C: Allow authenticated admins to replace/update existing images
DROP POLICY IF EXISTS "Allow authenticated admins to update product-images" ON storage.objects;
CREATE POLICY "Allow authenticated admins to update product-images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'product-images')
WITH CHECK (bucket_id = 'product-images');

-- Policy D: Allow authenticated admins to delete images
DROP POLICY IF EXISTS "Allow authenticated admins to delete product-images" ON storage.objects;
CREATE POLICY "Allow authenticated admins to delete product-images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'product-images');
