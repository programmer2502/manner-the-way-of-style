// db/supabase_client.js — Supabase client singleton with SQLite fallback
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');
const { initDb, getDb } = require('./database');

let client = null;
const dbMode = process.env.DB_MODE || 'local';

async function initLocalDb() {
  if (dbMode === 'local') {
    await initDb();
  }
}

class QueryBuilder {
  constructor(table) {
    this.table = table;
    this.operation = 'select';
    this.selectColumns = '*';
    this.filters = []; // { col, val }
    this.orFilter = null;
    this.orderings = []; // { col, ascending }
    this.limitCount = null;
    this.offset = null;
    this.isSingle = false;
    this.insertData = null;
    this.updateData = null;
    this.countOption = null;
  }

  select(columns = '*', options = {}) {
    // Only set operation to 'select' if we are not already doing a write operation
    if (this.operation === 'select') {
      this.selectColumns = columns;
      if (options.count === 'exact') {
        this.countOption = 'exact';
      }
    } else {
      this.selectColumns = columns;
    }
    return this;
  }

  insert(rows) {
    this.operation = 'insert';
    this.insertData = Array.isArray(rows) ? rows : [rows];
    return this;
  }

  update(updates) {
    this.operation = 'update';
    this.updateData = updates;
    return this;
  }

  delete() {
    this.operation = 'delete';
    return this;
  }

  upsert(rows, options = {}) {
    this.operation = 'upsert';
    this.insertData = Array.isArray(rows) ? rows : [rows];
    return this;
  }

  eq(col, val) {
    this.filters.push({ col, val });
    return this;
  }

  or(filterString) {
    this.orFilter = filterString;
    return this;
  }

  order(col, { ascending = true } = {}) {
    this.orderings.push({ col, ascending });
    return this;
  }

  range(from, to) {
    this.offset = from;
    this.limitCount = to - from + 1;
    return this;
  }

  limit(count) {
    this.limitCount = count;
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  // Promise-like then method
  async then(onfulfilled, onrejected) {
    try {
      const res = await this.execute();
      return onfulfilled ? onfulfilled(res) : res;
    } catch (err) {
      if (onrejected) return onrejected(err);
      throw err;
    }
  }

  async execute() {
    // Ensure DB is initialized (useful if helper scripts run directly)
    await initLocalDb();
    const sqliteDb = getDb();
    const table = this.table;

    // Helper to serialize inputs
    const toDbRow = (row) => {
      const serialized = { ...row };
      if (table === 'products') {
        if (serialized.sizes !== undefined) {
          serialized.sizes = (Array.isArray(serialized.sizes) || typeof serialized.sizes === 'object')
            ? JSON.stringify(serialized.sizes) : serialized.sizes;
        }
        if (serialized.colors !== undefined) {
          serialized.colors = (Array.isArray(serialized.colors) || typeof serialized.colors === 'object')
            ? JSON.stringify(serialized.colors) : serialized.colors;
        }
        if (serialized.bestseller !== undefined) {
          serialized.bestseller = serialized.bestseller ? 1 : 0;
        }
        if (serialized.new_arrival !== undefined) {
          serialized.new_arrival = serialized.new_arrival ? 1 : 0;
        }
      } else if (table === 'orders') {
        if (serialized.items !== undefined) {
          serialized.items = (Array.isArray(serialized.items) || typeof serialized.items === 'object')
            ? JSON.stringify(serialized.items) : serialized.items;
        }
      }
      return serialized;
    };

    // Helper to deserialize outputs
    const fromDbRow = (row) => {
      if (!row) return row;
      const deserialized = { ...row };
      if (table === 'products') {
        if (typeof deserialized.sizes === 'string') {
          try { deserialized.sizes = JSON.parse(deserialized.sizes); } catch(e) {}
        }
        if (typeof deserialized.colors === 'string') {
          try { deserialized.colors = JSON.parse(deserialized.colors); } catch(e) {}
        }
        if (deserialized.bestseller !== undefined) {
          deserialized.bestseller = Boolean(deserialized.bestseller);
        }
        if (deserialized.new_arrival !== undefined) {
          deserialized.new_arrival = Boolean(deserialized.new_arrival);
        }
      } else if (table === 'orders') {
        if (typeof deserialized.items === 'string') {
          try { deserialized.items = JSON.parse(deserialized.items); } catch(e) {}
        }
      }
      return deserialized;
    };

    // Construct WHERE clause
    const whereParts = [];
    const params = [];

    for (const filter of this.filters) {
      whereParts.push(`${filter.col} = ?`);
      params.push(filter.val);
    }

    if (this.orFilter) {
      const parts = this.orFilter.split(',');
      const subParts = [];
      for (const part of parts) {
        const sub = part.split('.');
        if (sub.length >= 3) {
          const col = sub[0];
          const op = sub[1];
          const pattern = sub.slice(2).join('.');
          if (op === 'ilike' || op === 'like') {
            subParts.push(`${col} LIKE ?`);
            params.push(pattern.replace(/%/g, '%'));
          } else {
            subParts.push(`${col} = ?`);
            params.push(pattern);
          }
        }
      }
      if (subParts.length > 0) {
        whereParts.push(`(${subParts.join(' OR ')})`);
      }
    }

    const whereClause = whereParts.length > 0 ? `WHERE ${whereParts.join(' AND ')}` : '';

    if (this.operation === 'select') {
      // 1. Get exact count if requested
      let totalCount = null;
      if (this.countOption === 'exact') {
        const countSql = `SELECT COUNT(*) as count FROM ${table} ${whereClause}`;
        const countRow = sqliteDb.prepare(countSql).get(...params);
        totalCount = countRow ? countRow.count : 0;
      }

      // 2. Build full select
      let sql = `SELECT ${this.selectColumns} FROM ${table} ${whereClause}`;

      // Orderings
      if (this.orderings.length > 0) {
        const orderParts = this.orderings.map(o => `${o.col} ${o.ascending ? 'ASC' : 'DESC'}`);
        sql += ` ORDER BY ${orderParts.join(', ')}`;
      }

      // Limit/Offset
      if (this.limitCount !== null) {
        sql += ` LIMIT ${this.limitCount}`;
      }
      if (this.offset !== null) {
        sql += ` OFFSET ${this.offset}`;
      }

      const rows = sqliteDb.prepare(sql).all(...params);
      const data = rows.map(fromDbRow);

      if (this.isSingle) {
        return {
          data: data.length > 0 ? data[0] : null,
          error: data.length > 0 ? null : { message: 'Row not found' }
        };
      }

      return { data, error: null, count: totalCount };
    }

    if (this.operation === 'insert') {
      const insertedRows = [];
      for (const row of this.insertData) {
        const dbRow = toDbRow(row);
        const keys = Object.keys(dbRow);
        const columnsStr = keys.join(', ');
        const placeholdersStr = keys.map(() => '?').join(', ');
        const sql = `INSERT INTO ${table} (${columnsStr}) VALUES (${placeholdersStr})`;
        sqliteDb.prepare(sql).run(...Object.values(dbRow));

        // Retrieve inserted row
        const selectSql = `SELECT * FROM ${table} WHERE id = ?`;
        const inserted = sqliteDb.prepare(selectSql).get(dbRow.id);
        insertedRows.push(fromDbRow(inserted));
      }

      if (this.isSingle) {
        return { data: insertedRows[0], error: null };
      }
      return { data: insertedRows, error: null };
    }

    if (this.operation === 'upsert') {
      const upsertedRows = [];
      for (const row of this.insertData) {
        const dbRow = toDbRow(row);
        const keys = Object.keys(dbRow);
        const columnsStr = keys.join(', ');
        const placeholdersStr = keys.map(() => '?').join(', ');
        const sql = `INSERT OR REPLACE INTO ${table} (${columnsStr}) VALUES (${placeholdersStr})`;
        sqliteDb.prepare(sql).run(...Object.values(dbRow));

        // Retrieve upserted row
        const selectSql = `SELECT * FROM ${table} WHERE id = ?`;
        const upserted = sqliteDb.prepare(selectSql).get(dbRow.id);
        upsertedRows.push(fromDbRow(upserted));
      }
      return { data: upsertedRows, error: null };
    }

    if (this.operation === 'update') {
      const dbUpdates = toDbRow(this.updateData);
      const keys = Object.keys(dbUpdates);
      const setClause = keys.map(k => `${k} = ?`).join(', ');
      
      const updateSql = `UPDATE ${table} SET ${setClause} ${whereClause}`;
      const updateParams = [...Object.values(dbUpdates), ...params];
      
      sqliteDb.prepare(updateSql).run(...updateParams);

      // Find which IDs were updated to select and return them
      const selectSql = `SELECT * FROM ${table} ${whereClause}`;
      const updatedRows = sqliteDb.prepare(selectSql).all(...params).map(fromDbRow);

      if (this.isSingle) {
        return { data: updatedRows[0] || null, error: updatedRows.length > 0 ? null : { message: 'Row not found' } };
      }
      return { data: updatedRows, error: null };
    }

    if (this.operation === 'delete') {
      // Find rows before deletion to return them (if needed) or just confirm
      const selectSql = `SELECT * FROM ${table} ${whereClause}`;
      const rowsToDelete = sqliteDb.prepare(selectSql).all(...params).map(fromDbRow);

      const deleteSql = `DELETE FROM ${table} ${whereClause}`;
      sqliteDb.prepare(deleteSql).run(...params);

      return { data: rowsToDelete, error: null };
    }
  }
}

const mockStorage = {
  from: (bucket) => ({
    upload: async (path, buffer, options) => {
      return { data: { path }, error: null };
    },
    getPublicUrl: (path) => {
      return { data: { publicUrl: null } };
    }
  })
};

const mockSupabaseClient = {
  from: (table) => new QueryBuilder(table),
  storage: mockStorage
};

function getSupabaseClient() {
  if (dbMode === 'supabase') {
    if (!client) {
      const url = process.env.SUPABASE_URL;
      const key = process.env.SUPABASE_ANON_KEY;
      if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY must be set in .env');
      client = createClient(url, key);
    }
    return client;
  } else {
    return mockSupabaseClient;
  }
}

module.exports = { getSupabaseClient, initLocalDb };
