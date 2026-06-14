-- ============================================================
-- MANNER DATABASE SCHEMA for Supabase
-- 
-- INSTRUCTIONS:
-- 1. Open: https://supabase.com/dashboard/project/qrhfasizkcrkckvpycts/sql/new
-- 2. Paste this ENTIRE file content into the SQL editor
-- 3. Click the green "Run" button
-- 4. Then restart your server: node server.js
-- ============================================================

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  category TEXT NOT NULL,
  price NUMERIC NOT NULL,
  old_price NUMERIC,
  image_url TEXT,
  sizes JSONB DEFAULT '[]',
  colors JSONB DEFAULT '[]',
  stock INTEGER DEFAULT 0,
  bestseller BOOLEAN DEFAULT false,
  new_arrival BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Admins table (for backend JWT authentication)
CREATE TABLE IF NOT EXISTS admins (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT DEFAULT 'Administrator',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  customer_address TEXT,
  items JSONB DEFAULT '[]',
  subtotal NUMERIC DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pending',
  payment_method TEXT DEFAULT 'cod',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Disable Row Level Security (backend handles auth via JWT)
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE admins DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- After running the above, your tables are ready!
-- Run: node db/seed.js   to populate with sample products
-- Run: node server.js    to start the backend
-- ============================================================
