// run_schema.js — Execute schema SQL via Supabase pg REST endpoint
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL;
const ANON_KEY = process.env.SUPABASE_ANON_KEY;

// Extract project ref from URL: https://xxxx.supabase.co -> xxxx
const projectRef = SUPABASE_URL.replace('https://', '').split('.')[0];

const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS products (
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
  )`,
  `CREATE TABLE IF NOT EXISTS admins (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT DEFAULT 'Administrator',
    created_at TIMESTAMPTZ DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS orders (
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
  )`,
  `ALTER TABLE products DISABLE ROW LEVEL SECURITY`,
  `ALTER TABLE admins DISABLE ROW LEVEL SECURITY`,
  `ALTER TABLE orders DISABLE ROW LEVEL SECURITY`
];

async function runSQL(sql) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
    method: 'POST',
    headers: {
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({ query: sql })
  });
  return res;
}

async function tryPgSql() {
  // Try the pg endpoint 
  for (const sql of STATEMENTS) {
    const name = sql.trim().split('\n')[0].slice(0, 50);
    try {
      const res = await fetch(`${SUPABASE_URL}/pg/query`, {
        method: 'POST',
        headers: {
          'apikey': ANON_KEY,
          'Authorization': `Bearer ${ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query: sql })
      });
      const text = await res.text();
      console.log(res.ok ? `  ✓ ${name}` : `  ✗ ${name}: ${text.slice(0,100)}`);
    } catch(e) {
      console.log(`  ✗ ${name}: ${e.message}`);
    }
  }
}

console.log('\n🔧 Attempting to create Supabase tables...');
console.log('   Project:', projectRef, '\n');

tryPgSql().then(() => {
  console.log('\nIf tables still don\'t exist, run schema.sql manually at:');
  console.log('https://supabase.com/dashboard/project/' + projectRef + '/sql/new\n');
});
