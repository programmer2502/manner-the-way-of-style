// test_api.js - Tests all API endpoints
async function runTests() {
  const BASE = 'http://localhost:3001';
  let token = null;

  console.log('\n=== MANNER BACKEND API TESTS ===\n');

  // 1. Health check
  try {
    const r = await fetch(BASE + '/api');
    const d = await r.json();
    console.log('[PASS] GET /api -', d.status, '| Version:', d.version);
  } catch(e) { console.log('[FAIL] GET /api -', e.message); }

  // 2. Get products
  try {
    const r = await fetch(BASE + '/api/products');
    const d = await r.json();
    console.log('[PASS] GET /api/products -', d.products.length, 'products returned');
    d.products.slice(0,2).forEach(p => console.log('       -', p.name, '| ₹' + p.price, '| Stock:', p.stock));
  } catch(e) { console.log('[FAIL] GET /api/products -', e.message); }

  // 3. Get categories
  try {
    const r = await fetch(BASE + '/api/categories');
    const d = await r.json();
    console.log('[PASS] GET /api/categories -', d.categories.length, 'categories');
    d.categories.forEach(c => console.log('       -', c.label, '(' + c.product_count + ' items)'));
  } catch(e) { console.log('[FAIL] GET /api/categories -', e.message); }

  // 4. Admin login
  try {
    const r = await fetch(BASE + '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@manner.com', password: 'manner2025' })
    });
    const d = await r.json();
    if (r.ok && d.token) {
      token = d.token;
      console.log('[PASS] POST /api/auth/login - Token received for:', d.admin.email);
    } else {
      console.log('[FAIL] POST /api/auth/login -', d.error);
    }
  } catch(e) { console.log('[FAIL] POST /api/auth/login -', e.message); }

  // 5. Auth/me
  if (token) {
    try {
      const r = await fetch(BASE + '/api/auth/me', {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      const d = await r.json();
      console.log('[PASS] GET /api/auth/me - Admin:', d.admin.email);
    } catch(e) { console.log('[FAIL] GET /api/auth/me -', e.message); }

    // 6. Admin stats
    try {
      const r = await fetch(BASE + '/api/stats', {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      const d = await r.json();
      console.log('[PASS] GET /api/stats - Products:', d.products.total, '| Orders:', d.orders.total, '| Revenue: ₹' + d.orders.revenue);
    } catch(e) { console.log('[FAIL] GET /api/stats -', e.message); }

    // 7. Create a test order (public endpoint)
    try {
      const r = await fetch(BASE + '/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: 'Test Customer',
          customer_email: 'test@example.com',
          customer_phone: '+91-9876543210',
          customer_address: '123 MG Road, Bangalore',
          items: [{ id: 'shorts', quantity: 1, size: 'M', color: 'Black' }],
          payment_method: 'cod'
        })
      });
      const d = await r.json();
      if (r.ok) {
        console.log('[PASS] POST /api/orders - Order created:', d.order_id, '| Total: ₹' + d.order.total_amount);
      } else {
        console.log('[FAIL] POST /api/orders -', d.error);
      }
    } catch(e) { console.log('[FAIL] POST /api/orders -', e.message); }

    // 8. View orders (admin)
    try {
      const r = await fetch(BASE + '/api/orders', {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      const d = await r.json();
      console.log('[PASS] GET /api/orders - Total orders:', d.pagination.total);
      if (d.orders.length > 0) {
        console.log('       Latest order from:', d.orders[0].customer_name, '| Status:', d.orders[0].status);
      }
    } catch(e) { console.log('[FAIL] GET /api/orders -', e.message); }

    // 9. Wrong password test
    try {
      const r = await fetch(BASE + '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@manner.com', password: 'wrongpassword' })
      });
      const d = await r.json();
      if (!r.ok) console.log('[PASS] Auth security - Wrong password correctly rejected:', d.error);
      else console.log('[FAIL] Auth security - Wrong password was NOT rejected!');
    } catch(e) { console.log('[FAIL] Auth security test -', e.message); }
  }

  console.log('\n=== ALL TESTS COMPLETE ===\n');
}

runTests();
