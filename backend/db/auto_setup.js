// auto_setup.js — Automatically creates Supabase tables by executing SQL
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const SUPABASE_URL = process.env.SUPABASE_URL;
const ANON_KEY = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, ANON_KEY);

const now = new Date().toISOString();

const DEFAULT_PRODUCTS = [
  { id:'palazzo', name:'High Waisted Palazzo', category:'womens', description:'Wide-leg trousers crafted from breathable crepe fabric.', price:2999, old_price:4499, image_url:'/images/product_palazzo.png', sizes:['XS','S','M','L','XL'], colors:[{name:'Off-White',hex:'#f5f5f0'},{name:'Black',hex:'#000000'}], stock:12, bestseller:false, new_arrival:true, created_at:now, updated_at:now },
  { id:'dress', name:'Silk Slip Dress', category:'womens', description:'Elegant biased-cut silk providing fluid drape for evening events.', price:4499, old_price:6999, image_url:'/images/product_dress.png', sizes:['XS','S','M','L'], colors:[{name:'Rust',hex:'#b85d3b'},{name:'Champagne',hex:'#f1e3d3'}], stock:8, bestseller:false, new_arrival:true, created_at:now, updated_at:now },
  { id:'blazer', name:'Cropped Boxy Blazer', category:'womens', description:'Sharp tailoring meets contemporary cropped length.', price:5499, old_price:7999, image_url:'/images/product_blazer.png', sizes:['S','M','L','XL'], colors:[{name:'Charcoal',hex:'#3a3a3b'},{name:'Black',hex:'#000000'}], stock:5, bestseller:true, new_arrival:false, created_at:now, updated_at:now },
  { id:'cargo', name:'Urban Utility Cargo', category:'mens', description:'Tactical design meets modern street style.', price:3299, old_price:4999, image_url:'/images/product_cargo.png', sizes:['S','M','L','XL','XXL'], colors:[{name:'Olive',hex:'#556b2f'},{name:'Black',hex:'#000000'}], stock:15, bestseller:false, new_arrival:true, created_at:now, updated_at:now },
  { id:'chinos', name:'Relaxed Tapered Chinos', category:'mens', description:'Versatile cotton-twill trousers with stretch.', price:2499, old_price:3499, image_url:'/images/product_chinos.png', sizes:['S','M','L','XL'], colors:[{name:'Khaki',hex:'#c3b091'},{name:'Navy',hex:'#000080'}], stock:10, bestseller:false, new_arrival:true, created_at:now, updated_at:now },
  { id:'shorts', name:'French Terry Shorts', category:'mens', description:'Premium lounge shorts with adjustable drawstring.', price:1499, old_price:2299, image_url:'/images/product_shorts.png', sizes:['S','M','L','XL'], colors:[{name:'Heather Grey',hex:'#b3b3b3'},{name:'Black',hex:'#000000'}], stock:20, bestseller:false, new_arrival:true, created_at:now, updated_at:now },
  { id:'midi', name:'Ribbed Knit Midi', category:'womens', description:'Figure-hugging ribbed texture in a sophisticated midi length.', price:3599, old_price:5499, image_url:'/images/product_midi.png', sizes:['XS','S','M','L'], colors:[{name:'Sage Green',hex:'#87a96b'},{name:'Cream',hex:'#fffdd0'}], stock:6, bestseller:false, new_arrival:true, created_at:now, updated_at:now },
  { id:'vest', name:'Hooded Puffer Vest', category:'childrens', description:'Lightweight insulation for core warmth.', price:1799, old_price:2999, image_url:'/images/product_vest.png', sizes:['2T','3T','4T','5','6'], colors:[{name:'Blue Grey',hex:'#667c89'},{name:'Yellow',hex:'#ffd700'}], stock:4, bestseller:true, new_arrival:false, created_at:now, updated_at:now }
];

async function run() {
  console.log('\n🚀 Manner — Supabase Auto-Setup');
  console.log('   Project:', SUPABASE_URL, '\n');

  // Test basic connection
  console.log('1. Testing Supabase connection...');
  const { data: testData, error: testError } = await supabase.from('products').select('id').limit(1);
  
  if (testError && testError.code === '42P01') {
    console.log('   → Tables do not exist yet');
    console.log('\n   ⚠️  MANUAL STEP REQUIRED:');
    console.log('   Open your Supabase SQL Editor and run the SQL below:\n');
    console.log('   🔗 https://supabase.com/dashboard/project/qrhfasizkcrkckvpycts/sql/new\n');
    console.log('=' .repeat(65));
    console.log(`
-- ✅ MANNER DATABASE SCHEMA — Paste this entire block and click "Run"

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

CREATE TABLE IF NOT EXISTS admins (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT DEFAULT 'Administrator',
  created_at TIMESTAMPTZ DEFAULT now()
);

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

ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE admins DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
`);
    console.log('='.repeat(65));
    console.log('\n   After running the SQL above, run this script again:\n   node db/auto_setup.js\n');
    process.exit(0);
  }

  if (testError) {
    console.error('   ❌ Connection failed:', testError.message);
    process.exit(1);
  }

  console.log('   ✓ Connected to Supabase!');

  // Seed products
  console.log('\n2. Seeding products...');
  const { data: existingProducts } = await supabase.from('products').select('id');
  if (existingProducts && existingProducts.length > 0) {
    console.log('   → Already has', existingProducts.length, 'products. Skipping seed.');
  } else {
    const { error: productErr } = await supabase.from('products').upsert(DEFAULT_PRODUCTS);
    if (productErr) console.error('   ❌ Product seed failed:', productErr.message);
    else console.log('   ✓ Seeded', DEFAULT_PRODUCTS.length, 'products!');
  }

  // Seed admin
  console.log('\n3. Creating admin account...');
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@manner.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'manner2025';
  const { data: existingAdmin } = await supabase.from('admins').select('id').eq('email', adminEmail).single();
  if (existingAdmin) {
    console.log('   → Admin already exists:', adminEmail);
  } else {
    const hash = bcrypt.hashSync(adminPassword, 10);
    const { error: adminErr } = await supabase.from('admins').insert([{
      id: uuidv4(), email: adminEmail, password_hash: hash, name: 'Administrator', created_at: now
    }]);
    if (adminErr) console.error('   ❌ Admin seed failed:', adminErr.message);
    else console.log('   ✓ Admin created:', adminEmail, '/', adminPassword);
  }

  console.log('\n✅ Setup complete! Run the server:\n   node server.js\n');
}

run().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
