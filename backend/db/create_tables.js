// create_tables.js — Creates Supabase tables via SQL (uses service role key if available, or anon key)
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const ANON_KEY = process.env.SUPABASE_ANON_KEY;

const SQL = `
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

-- Disable RLS for backend access
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE admins DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
`;

async function createTables() {
  console.log('\n🔧 Creating Supabase tables...');
  console.log('   Project:', SUPABASE_URL);
  
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/query`, {
      method: 'POST',
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: SQL })
    });
    
    if (!response.ok) {
      const text = await response.text();
      console.log('  → RPC method not available (this is normal)');
      console.log('  → Please run the SQL manually in Supabase SQL Editor:\n');
      console.log('     URL: https://supabase.com/dashboard/project/qrhfasizkcrkckvpycts/sql/new\n');
      console.log('─'.repeat(70));
      console.log(SQL);
      console.log('─'.repeat(70));
    } else {
      console.log('  ✓ Tables created!');
    }
  } catch (err) {
    console.log('\n  📋 Please run this SQL in your Supabase dashboard:');
    console.log('  URL: https://supabase.com/dashboard/project/qrhfasizkcrkckvpycts/sql/new\n');
    console.log('─'.repeat(70));
    console.log(SQL);
    console.log('─'.repeat(70));
    console.log('\n  Then run: node db/seed.js\n');
  }
}

createTables();
