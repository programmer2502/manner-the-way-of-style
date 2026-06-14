// routes/orders.js — Order management using Supabase
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getSupabaseClient } = require('../db/supabase_client');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function parseOrder(row) {
  if (!row) return null;
  return {
    ...row,
    items: Array.isArray(row.items) ? row.items : JSON.parse(row.items || '[]')
  };
}

// POST /api/orders — Place a new order (public)
router.post('/', async (req, res) => {
  const { customer_name, customer_email, customer_phone, customer_address, items, payment_method, notes } = req.body;

  if (!customer_name || !customer_email || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Customer name, email, and at least one item are required.' });
  }

  try {
    const supabase = getSupabaseClient();
    let subtotal = 0;
    const orderItems = [];

    // Validate products and compute totals
    for (const item of items) {
      const { data: product, error } = await supabase.from('products').select('*').eq('id', item.id).single();
      if (error || !product) {
        return res.status(400).json({ error: `Product "${item.id}" not found.` });
      }
      const qty = parseInt(item.quantity) || 1;
      if (product.stock < qty) {
        return res.status(400).json({
          error: `Insufficient stock for "${product.name}". Only ${product.stock} units available.`
        });
      }
      const lineTotal = product.price * qty;
      subtotal += lineTotal;
      orderItems.push({
        id: product.id, name: product.name, image_url: product.image_url,
        price: product.price, quantity: qty,
        size: item.size || null, color: item.color || null,
        line_total: lineTotal
      });
    }

    // Deduct stock for each item
    for (const item of orderItems) {
      await supabase.from('products')
        .update({ stock: supabase.rpc ? undefined : 0, updated_at: new Date().toISOString() })
        .eq('id', item.id);

      // Use raw decrement approach
      const { data: prod } = await supabase.from('products').select('stock').eq('id', item.id).single();
      if (prod) {
        await supabase.from('products')
          .update({ stock: Math.max(0, prod.stock - item.quantity), updated_at: new Date().toISOString() })
          .eq('id', item.id);
      }
    }

    // Insert order
    const orderId = uuidv4();
    const now = new Date().toISOString();
    const { data: order, error: orderErr } = await supabase.from('orders').insert([{
      id: orderId,
      customer_name, customer_email,
      customer_phone: customer_phone || null,
      customer_address: customer_address || null,
      items: orderItems,
      subtotal, total_amount: subtotal,
      status: 'pending',
      payment_method: payment_method || 'cod',
      notes: notes || null,
      created_at: now, updated_at: now
    }]).select().single();

    if (orderErr) throw orderErr;

    res.status(201).json({
      message: 'Order placed successfully!',
      order_id: orderId,
      order: parseOrder(order)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/orders — List all orders (admin)
router.get('/', requireAuth, async (req, res) => {
  try {
    const supabase = getSupabaseClient();
    const { status, page = 1, limit = 20 } = req.query;
    const from = (parseInt(page) - 1) * parseInt(limit);
    const to = from + parseInt(limit) - 1;

    let query = supabase.from('orders').select('*', { count: 'exact' }).order('created_at', { ascending: false }).range(from, to);
    if (status) query = query.eq('status', status);

    const { data, error, count } = await query;
    if (error) throw error;

    res.json({
      orders: (data || []).map(parseOrder),
      pagination: { page: parseInt(page), limit: parseInt(limit), total: count || 0 }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/orders/:id — Single order (admin)
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from('orders').select('*').eq('id', req.params.id).single();
    if (error || !data) return res.status(404).json({ error: 'Order not found.' });
    res.json({ order: parseOrder(data) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/orders/:id/status — Update order status (admin)
router.patch('/:id/status', requireAuth, async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
  }
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: `Order status updated to "${status}".`, status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/orders/:id — Cancel & restore stock (admin)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const supabase = getSupabaseClient();
    const { data: order } = await supabase.from('orders').select('*').eq('id', req.params.id).single();
    if (!order) return res.status(404).json({ error: 'Order not found.' });

    // Restore stock if still active
    if (['pending', 'confirmed', 'processing'].includes(order.status)) {
      const items = Array.isArray(order.items) ? order.items : JSON.parse(order.items || '[]');
      for (const item of items) {
        const { data: prod } = await supabase.from('products').select('stock').eq('id', item.id).single();
        if (prod) {
          await supabase.from('products')
            .update({ stock: prod.stock + item.quantity, updated_at: new Date().toISOString() })
            .eq('id', item.id);
        }
      }
    }

    const { error } = await supabase.from('orders').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Order deleted and stock restored.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
