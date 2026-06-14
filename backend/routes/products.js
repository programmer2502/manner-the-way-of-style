// routes/products.js — Full CRUD using Supabase
const express = require('express');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { getSupabaseClient } = require('../db/supabase_client');
const { requireAuth } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

const router = express.Router();

function getCategoryLabel(cat) {
  const labels = {
    womens: "Women's Wear", mens: "Men's Wear",
    childrens: "Children's Wear", accessories: 'Accessories', event: 'Event Wear'
  };
  return labels[cat] || (cat ? cat.charAt(0).toUpperCase() + cat.slice(1) : 'Fashion');
}

function parseProduct(row) {
  if (!row) return null;
  return {
    ...row,
    sizes: Array.isArray(row.sizes) ? row.sizes : JSON.parse(row.sizes || '[]'),
    colors: Array.isArray(row.colors) ? row.colors : JSON.parse(row.colors || '[]'),
    bestseller: Boolean(row.bestseller),
    new_arrival: Boolean(row.new_arrival),
    categoryLabel: getCategoryLabel(row.category)
  };
}

// GET /api/products
router.get('/', async (req, res) => {
  try {
    const supabase = getSupabaseClient();
    const { category, search, sort } = req.query;
    let query = supabase.from('products').select('*');

    if (category && category !== 'all') query = query.eq('category', category);
    if (search) query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%,category.ilike.%${search}%`);
    if (sort === 'price_asc') query = query.order('price', { ascending: true });
    else if (sort === 'price_desc') query = query.order('price', { ascending: false });
    else if (sort === 'name') query = query.order('name', { ascending: true });
    else query = query.order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) throw error;
    res.json({ products: (data || []).map(parseProduct) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/products/:id
router.get('/:id', async (req, res) => {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from('products').select('*').eq('id', req.params.id).single();
    if (error || !data) return res.status(404).json({ error: 'Product not found.' });
    res.json({ product: parseProduct(data) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/products
router.post('/', requireAuth, async (req, res) => {
  try {
    const { name, description, category, price, old_price, sizes, colors, stock, bestseller, new_arrival, image_url } = req.body;
    if (!name || !category || price === undefined) {
      return res.status(400).json({ error: 'Name, category, and price are required.' });
    }
    const supabase = getSupabaseClient();
    const id = uuidv4();
    const now = new Date().toISOString();
    const { data, error } = await supabase.from('products').insert([{
      id, name, description: description || '', category,
      price: parseFloat(price),
      old_price: old_price ? parseFloat(old_price) : null,
      image_url: image_url || null,
      sizes: sizes || [],
      colors: colors || [],
      stock: parseInt(stock) || 0,
      bestseller: Boolean(bestseller),
      new_arrival: new_arrival !== false,
      created_at: now, updated_at: now
    }]).select().single();
    if (error) throw error;
    res.status(201).json({ product: parseProduct(data) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/products/:id
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const supabase = getSupabaseClient();
    const { data: existing, error: fetchErr } = await supabase.from('products').select('*').eq('id', req.params.id).single();
    if (fetchErr || !existing) return res.status(404).json({ error: 'Product not found.' });

    const { name, description, category, price, old_price, image_url, sizes, colors, stock, bestseller, new_arrival } = req.body;
    const updates = {
      name: name ?? existing.name,
      description: description ?? existing.description,
      category: category ?? existing.category,
      price: price !== undefined ? parseFloat(price) : existing.price,
      old_price: old_price !== undefined ? (old_price ? parseFloat(old_price) : null) : existing.old_price,
      image_url: image_url !== undefined ? image_url : existing.image_url,
      sizes: sizes !== undefined ? sizes : existing.sizes,
      colors: colors !== undefined ? colors : existing.colors,
      stock: stock !== undefined ? parseInt(stock) : existing.stock,
      bestseller: bestseller !== undefined ? Boolean(bestseller) : existing.bestseller,
      new_arrival: new_arrival !== undefined ? Boolean(new_arrival) : existing.new_arrival,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase.from('products').update(updates).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json({ product: parseProduct(data) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/products/:id
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const supabase = getSupabaseClient();
    const { data: existing } = await supabase.from('products').select('*').eq('id', req.params.id).single();
    if (!existing) return res.status(404).json({ error: 'Product not found.' });

    // Delete local image if uploaded
    if (existing.image_url && existing.image_url.startsWith('/images/product_')) {
      const fp = path.join(__dirname, '..', '..', existing.image_url);
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    }

    const { error } = await supabase.from('products').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Product deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/products/:id/image — Upload image, also upload to Supabase Storage
router.post('/:id/image', requireAuth, upload.single('image'), async (req, res) => {
  try {
    const supabase = getSupabaseClient();
    const { data: existing } = await supabase.from('products').select('*').eq('id', req.params.id).single();
    if (!existing) return res.status(404).json({ error: 'Product not found.' });
    if (!req.file) return res.status(400).json({ error: 'No image file uploaded.' });

    // Delete old local image
    if (existing.image_url && existing.image_url.startsWith('/images/product_')) {
      const oldPath = path.join(__dirname, '..', '..', existing.image_url);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    let imageUrl = `/images/${req.file.filename}`;

    // Also upload to Supabase Storage (products bucket)
    try {
      const fileBuffer = fs.readFileSync(req.file.path);
      const ext = path.extname(req.file.originalname).toLowerCase();
      const storagePath = `products/${req.params.id}${ext}`;
      const { data: storageData, error: storageError } = await supabase.storage
        .from('products')
        .upload(storagePath, fileBuffer, {
          contentType: req.file.mimetype,
          upsert: true
        });
      if (!storageError && storageData) {
        const { data: urlData } = supabase.storage.from('products').getPublicUrl(storagePath);
        if (urlData?.publicUrl) imageUrl = urlData.publicUrl;
      }
    } catch (storageErr) {
      console.warn('Supabase Storage upload failed, using local path:', storageErr.message);
    }

    const { error } = await supabase.from('products')
      .update({ image_url: imageUrl, updated_at: new Date().toISOString() })
      .eq('id', req.params.id);
    if (error) throw error;

    res.json({ image_url: imageUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/products/:id/stock
router.patch('/:id/stock', requireAuth, async (req, res) => {
  try {
    const { stock } = req.body;
    if (stock === undefined) return res.status(400).json({ error: 'Stock value required.' });
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('products')
      .update({ stock: parseInt(stock), updated_at: new Date().toISOString() })
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Stock updated.', stock: parseInt(stock) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
