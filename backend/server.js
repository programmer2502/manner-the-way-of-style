// server.js — Manner Backend: Express + Supabase (with graceful degradation)
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Middleware ───────────────────────────────────────────────
app.use(cors({ origin: '*', methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'], allowedHeaders: ['Content-Type','Authorization'] }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Serve Static Images ──────────────────────────────────────
const IMAGES_DIR = path.join(__dirname, '..', 'images');
if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR, { recursive: true });
app.use('/images', express.static(IMAGES_DIR));

// Copy root images to /images
const ROOT_DIR = path.join(__dirname, '..');
try {
  fs.readdirSync(ROOT_DIR).filter(f => /\.(png|jpg|jpeg|webp)$/i.test(f)).forEach(file => {
    const dest = path.join(IMAGES_DIR, file);
    if (!fs.existsSync(dest)) fs.copyFileSync(path.join(ROOT_DIR, file), dest);
  });
} catch(e) { console.warn('Image copy:', e.message); }

// ─── Serve Frontend ───────────────────────────────────────────
app.use(express.static(ROOT_DIR, { index: false }));

// ─── API Routes ───────────────────────────────────────────────
app.use('/api/products',   require('./routes/products'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/auth',       require('./routes/auth'));
app.use('/api/orders',     require('./routes/orders'));
app.use('/api/stats',      require('./routes/stats'));

app.get('/api', (req, res) => res.json({
  name: 'Manner API', version: '1.0.0', status: 'running',
  database: 'Supabase — ' + (process.env.SUPABASE_URL || 'not configured')
}));

app.get('/admin', (req, res) => res.sendFile(path.join(ROOT_DIR, 'admin.html')));
app.get('/admin.html', (req, res) => res.sendFile(path.join(ROOT_DIR, 'admin.html')));
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found.' });
  res.sendFile(path.join(ROOT_DIR, 'index.html'));
});

app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: err.message });
});

// ─── Start ────────────────────────────────────────────────────
async function start() {
  // Test connection or load local DB
  let supabaseReady = false;
  const isLocal = process.env.DB_MODE === 'local';
  try {
    const { getSupabaseClient, initLocalDb } = require('./db/supabase_client');
    if (isLocal) {
      await initLocalDb();
    }
    const sb = getSupabaseClient();
    const { data, error } = await sb.from('products').select('id').limit(1);
    if (error) {
      if (!isLocal && (error.code === 'PGRST205' || error.message.includes('schema cache'))) {
        console.log('\n⚠️  Supabase tables not found.');
        console.log('   Run the schema SQL first — see: backend/db/schema.sql');
        console.log('   URL: https://supabase.com/dashboard/project/qrhfasizkcrkckvpycts/sql/new\n');
      } else {
        console.log('\n⚠️  Database warning:', error.message, '\n');
      }
    } else {
      supabaseReady = true;
      console.log('✓ Database connected —', data.length, 'products found');
      // Auto-seed if empty
      if (data.length === 0) {
        console.log('  Seeding default products...');
        try { await require('./db/seed').seedSupabase(); } catch(e) { console.warn('  Seed warning:', e.message); }
      }
    }
  } catch(err) {
    console.warn('\n⚠️  Database init failed:', err.message);
  }

  app.listen(PORT, () => {
    let dbStatus = '⚠ Supabase tables needed (see below)';
    if (isLocal) {
      dbStatus = '✓ Local SQLite Connected';
    } else if (supabaseReady) {
      dbStatus = '✓ Supabase Connected';
    }
    console.log('\n╔══════════════════════════════════════════════════╗');
    console.log('║        MANNER Backend — Node.js + ' + (isLocal ? 'SQLite' : 'Supabase').padEnd(8) + '       ║');
    console.log('╠══════════════════════════════════════════════════╣');
    console.log('║  ✓ Storefront:  http://localhost:' + PORT + '          ║');
    console.log('║  ✓ Admin:       http://localhost:' + PORT + '/admin    ║');
    console.log('║  ✓ API:         http://localhost:' + PORT + '/api      ║');
    console.log('║  DB: ' + dbStatus.padEnd(43) + '║');
    console.log('╚══════════════════════════════════════════════════╝');
    if (!isLocal && !supabaseReady) {
      console.log('\n  📋 To complete setup, run schema.sql in Supabase:');
      console.log('  https://supabase.com/dashboard/project/qrhfasizkcrkckvpycts/sql/new\n');
    } else {
      console.log('\n  Admin login: admin@manner.com / manner2025\n');
    }
  });
}

start();
