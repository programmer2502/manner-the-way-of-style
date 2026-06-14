// db/database.js — sql.js (pure JS SQLite) with file persistence
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'manner.db');

let db = null;
let SQL = null;

async function initDb() {
  if (db) return db;

  const initSqlJs = require('sql.js');
  SQL = await initSqlJs();

  // Load existing DB file or create new
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // Enable WAL-equivalent (sql.js is in-memory, we persist manually)
  createTables();
  saveDb(); // Save initial state

  return db;
}

function createTables() {
  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      category TEXT NOT NULL,
      price REAL NOT NULL,
      old_price REAL,
      image_url TEXT,
      sizes TEXT DEFAULT '[]',
      colors TEXT DEFAULT '[]',
      stock INTEGER DEFAULT 0,
      bestseller INTEGER DEFAULT 0,
      new_arrival INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      customer_name TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      customer_phone TEXT,
      customer_address TEXT,
      items TEXT NOT NULL DEFAULT '[]',
      subtotal REAL NOT NULL DEFAULT 0,
      total_amount REAL NOT NULL DEFAULT 0,
      status TEXT DEFAULT 'pending',
      payment_method TEXT DEFAULT 'cod',
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS admins (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT DEFAULT 'Administrator',
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
}

// Persist in-memory database to file
function saveDb() {
  if (!db) return;
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

// Wrap sql.js to look like better-sqlite3 (synchronous API)
function getDb() {
  if (!db) throw new Error('Database not initialized. Call initDb() first.');
  return {
    prepare: (sql) => ({
      run: (...params) => {
        db.run(sql, params);
        saveDb();
        return { changes: db.getRowsModified() };
      },
      get: (...params) => {
        const res = db.exec(sql, params);
        if (!res || res.length === 0) return undefined;
        const { columns, values } = res[0];
        if (!values || values.length === 0) return undefined;
        return Object.fromEntries(columns.map((col, i) => [col, values[0][i]]));
      },
      all: (...params) => {
        const res = db.exec(sql, params);
        if (!res || res.length === 0) return [];
        const { columns, values } = res[0];
        return values.map(row => Object.fromEntries(columns.map((col, i) => [col, row[i]])));
      }
    }),
    exec: (sql) => { db.run(sql); saveDb(); },
    transaction: (fn) => (...args) => { fn(...args); saveDb(); }
  };
}

module.exports = { initDb, getDb, saveDb };
