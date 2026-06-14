// routes/stats.js — Admin dashboard stats using Supabase
const express = require('express');
const { getSupabaseClient } = require('../db/supabase_client');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/stats
router.get('/', requireAuth, async (req, res) => {
  try {
    const supabase = getSupabaseClient();

    // Product stats
    const { data: products } = await supabase.from('products').select('stock, category');
    const totalProducts = products?.length || 0;
    const totalStock = products?.reduce((s, p) => s + (p.stock || 0), 0) || 0;
    const outOfStock = products?.filter(p => p.stock === 0).length || 0;
    const lowStock = products?.filter(p => p.stock > 0 && p.stock <= 5).length || 0;

    // Category breakdown
    const categoryMap = {};
    products?.forEach(p => {
      if (!categoryMap[p.category]) categoryMap[p.category] = { count: 0, total_stock: 0 };
      categoryMap[p.category].count++;
      categoryMap[p.category].total_stock += p.stock || 0;
    });
    const categoryBreakdown = Object.entries(categoryMap).map(([category, data]) => ({ category, ...data }));

    // Order stats
    const { data: orders } = await supabase.from('orders').select('status, total_amount, customer_name, customer_email, id, created_at');
    const totalOrders = orders?.length || 0;
    const pendingOrders = orders?.filter(o => o.status === 'pending').length || 0;
    const revenue = orders?.filter(o => o.status !== 'cancelled').reduce((s, o) => s + (o.total_amount || 0), 0) || 0;
    const recentOrders = (orders || []).slice(-5).reverse().map(o => ({
      id: o.id, customer_name: o.customer_name, customer_email: o.customer_email,
      total_amount: o.total_amount, status: o.status, created_at: o.created_at
    }));

    res.json({
      products: { total: totalProducts, total_stock: totalStock, out_of_stock: outOfStock, low_stock: lowStock },
      orders: { total: totalOrders, pending: pendingOrders, revenue: parseFloat(revenue.toFixed(2)) },
      recent_orders: recentOrders,
      category_breakdown: categoryBreakdown
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
