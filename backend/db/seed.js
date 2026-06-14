// db/seed.js — Creates Supabase tables and seeds default products + admin
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { getSupabaseClient } = require('./supabase_client');

const now = new Date().toISOString();

const DEFAULT_PRODUCTS = [
  {
    id: 'palazzo', name: 'High Waisted Palazzo', category: 'womens',
    description: 'Wide-leg trousers crafted from breathable crepe fabric for an elongated silhouette.',
    price: 2999.00, old_price: 4499.00, image_url: '/images/product_palazzo.png',
    sizes: ['XS','S','M','L','XL'],
    colors: [{name:'Off-White',hex:'#f5f5f0'},{name:'Black',hex:'#000000'}],
    stock: 12, bestseller: false, new_arrival: true, created_at: now, updated_at: now
  },
  {
    id: 'dress', name: 'Silk Slip Dress', category: 'womens',
    description: 'Elegant biased-cut silk providing a fluid drape and luxurious feel for evening events.',
    price: 4499.00, old_price: 6999.00, image_url: '/images/product_dress.png',
    sizes: ['XS','S','M','L'],
    colors: [{name:'Rust',hex:'#b85d3b'},{name:'Champagne',hex:'#f1e3d3'}],
    stock: 8, bestseller: false, new_arrival: true, created_at: now, updated_at: now
  },
  {
    id: 'blazer', name: 'Cropped Boxy Blazer', category: 'womens',
    description: 'Sharp tailoring meets contemporary cropped length, perfect from office to dinner.',
    price: 5499.00, old_price: 7999.00, image_url: '/images/product_blazer.png',
    sizes: ['S','M','L','XL'],
    colors: [{name:'Charcoal',hex:'#3a3a3b'},{name:'Black',hex:'#000000'}],
    stock: 5, bestseller: true, new_arrival: false, created_at: now, updated_at: now
  },
  {
    id: 'cargo', name: 'Urban Utility Cargo', category: 'mens',
    description: 'Tactical design meets modern street style with durable water-resistant fabric.',
    price: 3299.00, old_price: 4999.00, image_url: '/images/product_cargo.png',
    sizes: ['S','M','L','XL','XXL'],
    colors: [{name:'Olive',hex:'#556b2f'},{name:'Black',hex:'#000000'}],
    stock: 15, bestseller: false, new_arrival: true, created_at: now, updated_at: now
  },
  {
    id: 'chinos', name: 'Relaxed Tapered Chinos', category: 'mens',
    description: 'Versatile cotton-twill trousers with clean taper and stretch for all-day comfort.',
    price: 2499.00, old_price: 3499.00, image_url: '/images/product_chinos.png',
    sizes: ['S','M','L','XL'],
    colors: [{name:'Khaki',hex:'#c3b091'},{name:'Navy',hex:'#000080'}],
    stock: 10, bestseller: false, new_arrival: true, created_at: now, updated_at: now
  },
  {
    id: 'shorts', name: 'French Terry Shorts', category: 'mens',
    description: 'Premium lounge shorts with relaxed hem and adjustable drawstring for comfort.',
    price: 1499.00, old_price: 2299.00, image_url: '/images/product_shorts.png',
    sizes: ['S','M','L','XL'],
    colors: [{name:'Heather Grey',hex:'#b3b3b3'},{name:'Black',hex:'#000000'}],
    stock: 20, bestseller: false, new_arrival: true, created_at: now, updated_at: now
  },
  {
    id: 'midi', name: 'Ribbed Knit Midi', category: 'womens',
    description: 'Figure-hugging ribbed texture in a sophisticated midi length — comfort meets feminine style.',
    price: 3599.00, old_price: 5499.00, image_url: '/images/product_midi.png',
    sizes: ['XS','S','M','L'],
    colors: [{name:'Sage Green',hex:'#87a96b'},{name:'Cream',hex:'#fffdd0'}],
    stock: 6, bestseller: false, new_arrival: true, created_at: now, updated_at: now
  },
  {
    id: 'vest', name: 'Hooded Puffer Vest', category: 'childrens',
    description: 'Lightweight synthetic down insulation for core warmth without restricting movement.',
    price: 1799.00, old_price: 2999.00, image_url: '/images/product_vest.png',
    sizes: ['2T','3T','4T','5','6'],
    colors: [{name:'Blue Grey',hex:'#667c89'},{name:'Yellow',hex:'#ffd700'}],
    stock: 4, bestseller: true, new_arrival: false, created_at: now, updated_at: now
  }
];

async function seedSupabase() {
  const supabase = getSupabaseClient();

  console.log('\n📦 Setting up Supabase tables...');
  console.log('  ℹ️  Note: Create these tables in your Supabase SQL Editor if they don\'t exist:');
  console.log('     https://supabase.com/dashboard/project/qrhfasizkcrkckvpycts/sql\n');

  // Try to seed products (if table exists)
  try {
    const { error: insertErr } = await supabase.from('products').upsert(DEFAULT_PRODUCTS, { onConflict: 'id' });
    if (insertErr) {
      console.log('  ⚠️  Could not seed products:', insertErr.message);
      console.log('  → Please create the products table first (see schema below)');
    } else {
      console.log('  ✓ Seeded', DEFAULT_PRODUCTS.length, 'products into Supabase');
    }
  } catch (e) {
    console.log('  ⚠️  Products table error:', e.message);
  }

  // Try to seed admin
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@manner.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'manner2025';
    const hash = bcrypt.hashSync(adminPassword, 10);

    const { error: adminErr } = await supabase.from('admins').upsert([{
      id: uuidv4(), email: adminEmail, password_hash: hash,
      name: 'Administrator', created_at: now
    }], { onConflict: 'email', ignoreDuplicates: true });

    if (adminErr) {
      console.log('  ⚠️  Could not seed admin:', adminErr.message);
      console.log('  → Please create the admins table first (see schema below)');
    } else {
      console.log('  ✓ Admin account ready:', adminEmail);
    }
  } catch (e) {
    console.log('  ⚠️  Admins table error:', e.message);
  }
}

async function seedIfEmpty() {
  const supabase = getSupabaseClient();
  try {
    const { data } = await supabase.from('products').select('id').limit(1);
    if (!data || data.length === 0) {
      console.log('  Database empty, seeding default data...');
      await seedSupabase();
    } else {
      console.log('  ✓ Database has', data.length > 0 ? 'existing' : 'no', 'products');
    }
  } catch (e) {
    console.warn('  seedIfEmpty error:', e.message);
  }
}

// Export for use by server.js
module.exports = { seedSupabase, seedIfEmpty };

// Run directly: node db/seed.js
if (require.main === module) {
  seedSupabase().then(() => {
    console.log('\n✅ Supabase seed complete!\n');
    process.exit(0);
  }).catch(err => {
    console.error('\n❌ Seed failed:', err.message);
    console.log('\n📋 REQUIRED SUPABASE SQL SCHEMA:');
    console.log('   Run this in your Supabase SQL Editor:\n');
    console.log(`-- Products table
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

-- Admins table
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

-- Disable RLS for admin access (or configure policies as needed)
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE admins DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
`);
    process.exit(1);
  });
}
