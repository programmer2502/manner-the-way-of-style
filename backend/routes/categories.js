// routes/categories.js — Category management using Supabase
const express = require('express');
const { getSupabaseClient } = require('../db/supabase_client');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function getCategoryLabel(cat) {
  const labels = {
    womens: "Women's Wear", mens: "Men's Wear",
    childrens: "Children's Wear", accessories: 'Accessories', event: 'Event Wear'
  };
  return labels[cat] || (cat ? cat.charAt(0).toUpperCase() + cat.slice(1) : 'Uncategorized');
}

// GET /api/categories — list all active categories with product counts
router.get('/', async (req, res) => {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from('products').select('category');
    if (error) throw error;

    // Group by category
    const counts = {};
    (data || []).forEach(p => {
      counts[p.category] = (counts[p.category] || 0) + 1;
    });

    const categories = Object.entries(counts)
      .map(([slug, product_count]) => ({ slug, label: getCategoryLabel(slug), product_count }))
      .sort((a, b) => b.product_count - a.product_count);

    res.json({ categories });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/categories/:slug — delete all products in a category (admin)
router.delete('/:slug', requireAuth, async (req, res) => {
  try {
    const supabase = getSupabaseClient();
    const { slug } = req.params;

    const { data: existing, error: countErr } = await supabase
      .from('products').select('id').eq('category', slug);
    if (countErr) throw countErr;
    if (!existing || existing.length === 0) {
      return res.status(404).json({ error: 'Category not found or already empty.' });
    }

    const { error } = await supabase.from('products').delete().eq('category', slug);
    if (error) throw error;

    res.json({
      message: `Category "${getCategoryLabel(slug)}" and ${existing.length} products deleted.`,
      deleted_count: existing.length
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
