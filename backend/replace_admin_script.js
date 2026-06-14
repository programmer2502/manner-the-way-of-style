// replace_admin_script.js — Replaces the old admin script with new API-driven version
const fs = require('fs');
const path = require('path');

const adminPath = path.join('c:\\Users\\ARIKITHOTA HEMA\\Desktop\\manner the way of style\\admin.html');
let content = fs.readFileSync(adminPath, 'utf8');
const lines = content.split('\n');

const newScript = `
  <script>
    // --- Backend API Configuration ---
    const API_BASE = '';
    let adminToken = localStorage.getItem('manner_admin_token');
    let products = [];
    let editProductId = null;
    let activeSearch = '';
    let selectedImageFile = null;
    let existingImageUrl = null;

    async function apiFetch(path, options = {}) {
      const headers = { ...(options.headers || {}) };
      if (!(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';
      if (adminToken) headers['Authorization'] = 'Bearer ' + adminToken;
      const res = await fetch(API_BASE + path, { ...options, headers });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'HTTP ' + res.status);
      return json;
    }

    const STANDARD_CATEGORIES = [
      { value: 'womens',      label: "Women's Wear" },
      { value: 'mens',        label: "Men's Wear" },
      { value: 'childrens',   label: "Children's Wear" },
      { value: 'accessories', label: 'Accessories' },
      { value: 'event',       label: 'Event Wear' }
    ];

    function getCategoryLabel(cat) {
      if (!cat) return 'Fashion';
      const found = STANDARD_CATEGORIES.find(s => s.value === cat);
      if (found) return found.label;
      return cat.charAt(0).toUpperCase() + cat.slice(1);
    }

    function isLoggedIn() { return !!adminToken; }

    async function checkAuth() {
      if (!adminToken) { openLoginModal(); return false; }
      try {
        await apiFetch('/api/auth/me');
        closeLoginModal();
        document.getElementById('btn-admin-logout').style.display = 'inline-block';
        document.getElementById('supabase-status-text').innerHTML =
          '<span class="supabase-status-dot connected"></span> Manner Backend connected &mdash; Admin authenticated.';
        return true;
      } catch {
        adminToken = null;
        localStorage.removeItem('manner_admin_token');
        openLoginModal();
        return false;
      }
    }

    function openLoginModal() {
      document.getElementById('login-modal').classList.add('active');
      document.getElementById('login-modal-overlay').classList.add('active');
    }
    function closeLoginModal() {
      document.getElementById('login-modal').classList.remove('active');
      document.getElementById('login-modal-overlay').classList.remove('active');
    }

    async function loadProducts() {
      try {
        const data = await apiFetch('/api/products');
        products = data.products.map(p => ({
          id: p.id, name: p.name, category: p.category,
          categoryLabel: getCategoryLabel(p.category),
          description: p.description,
          price: parseFloat(p.price),
          oldPrice: p.old_price ? parseFloat(p.old_price) : null,
          image: p.image_url,
          sizes: p.sizes || [], colors: p.colors || [],
          stock: parseInt(p.stock),
          bestseller: p.bestseller || false,
          newArrival: p.new_arrival || false
        }));
      } catch (err) {
        console.error('Failed to load products:', err);
        products = [];
      }
      updateStats(); renderCatalog(); populateCategorySelect();
    }

    function updateStats() {
      document.getElementById('stats-total-products').textContent = products.length;
      document.getElementById('stats-total-stock').textContent = products.reduce((s, p) => s + p.stock, 0);
      const oos = products.filter(p => p.stock === 0).length;
      document.getElementById('stats-out-of-stock').textContent = oos;
      document.getElementById('out-of-stock-card').classList.toggle('alert', oos > 0);
    }

    function renderCatalog() {
      const tbody = document.getElementById('admin-table-body');
      tbody.innerHTML = '';
      let list = products;
      if (activeSearch) {
        const q = activeSearch.toLowerCase();
        list = list.filter(p => p.name.toLowerCase().includes(q) || p.categoryLabel.toLowerCase().includes(q));
      }
      if (list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--gray-mid);">No products found.</td></tr>';
        return;
      }
      list.forEach(p => {
        const stockClass = p.stock === 0 ? 'danger' : p.stock <= 5 ? 'warning' : 'ok';
        const sizesHTML = p.sizes.map(s => '<span class="badge-tag">' + s + '</span>').join(' ');
        const colorsHTML = p.colors.map(c =>
          '<span class="badge-tag" style="display:inline-flex;align-items:center;gap:4px;"><span class="color-swatch-mini" style="background:' + c.hex + ';"></span>' + c.name + '</span>'
        ).join(' ');
        const tr = document.createElement('tr');
        tr.innerHTML =
          '<td><div class="table-thumbnail"><img src="' + p.image + '" alt="' + p.name + '" onerror="this.parentElement.style.background=\'#eee\'"></div></td>' +
          '<td><div class="prod-details"><span class="prod-name-title">' + p.name + '</span><span class="prod-cat-badge">' + p.categoryLabel + '</span></div></td>' +
          '<td style="font-weight:600;">&#8377;' + p.price.toFixed(2) + '</td>' +
          '<td><span class="stock-badge-pill ' + stockClass + '">' + p.stock + ' units</span></td>' +
          '<td><div class="options-badges"><div class="options-badges-row"><span class="options-title-small">Sizes:</span> ' + sizesHTML + '</div><div class="options-badges-row" style="margin-top:4px;"><span class="options-title-small">Colors:</span> ' + colorsHTML + '</div></div></td>' +
          '<td style="text-align:right;"><div class="table-actions" style="justify-content:flex-end;"><button class="btn-table-action edit" onclick="openEditForm(\'' + p.id + '\')">Edit</button><button class="btn-table-action delete" onclick="confirmDeleteProduct(\'' + p.id + '\')">Delete</button></div></td>';
        tbody.appendChild(tr);
      });
    }

    function populateCategorySelect(selectedValue) {
      const select = document.getElementById('form-category');
      if (!select) return;
      const customCats = [];
      products.forEach(p => {
        const isStd = STANDARD_CATEGORIES.some(sc => sc.value === p.category);
        if (!isStd && p.category && !customCats.includes(p.category)) customCats.push(p.category);
      });
      let html = STANDARD_CATEGORIES.map(sc => '<option value="' + sc.value + '">' + sc.label + '</option>').join('\\n');
      if (customCats.length > 0) {
        html += '\\n<optgroup label="Custom Categories">';
        customCats.forEach(cat => { html += '\\n<option value="' + cat + '">' + getCategoryLabel(cat) + '</option>'; });
        html += '\\n</optgroup>';
      }
      html += '\\n<option value="custom_category">[Add New Custom Category...]</option>';
      select.innerHTML = html;
      if (selectedValue) select.value = selectedValue;
    }

    const modal = document.getElementById('form-modal');
    const overlay = document.getElementById('form-modal-overlay');
    const form = document.getElementById('product-form');

    function openAddForm() {
      if (!isLoggedIn()) { openLoginModal(); return; }
      editProductId = null;
      document.getElementById('form-modal-title').textContent = 'Add New Product';
      form.reset();
      selectedImageFile = null; existingImageUrl = null;
      document.getElementById('form-image-file').value = '';
      document.getElementById('form-image-preview').src = '';
      document.getElementById('form-image-preview-wrap').style.display = 'none';
      populateCategorySelect();
      document.getElementById('form-category-custom-wrap').style.display = 'none';
      document.getElementById('form-category-custom').value = '';
      document.getElementById('form-category-custom').required = false;
      document.querySelectorAll('#sizes-choices input').forEach(c => { c.checked = ["XS","S","M","L","XL"].includes(c.value); });
      document.querySelectorAll('#colors-choices input').forEach(c => { c.checked = ["Black|#000000","Off-White|#f5f5f0"].includes(c.value); });
      modal.classList.add('active'); overlay.classList.add('active');
    }

    window.openEditForm = function(id) {
      if (!isLoggedIn()) { openLoginModal(); return; }
      editProductId = id;
      const p = products.find(prod => prod.id === id);
      if (!p) return;
      document.getElementById('form-modal-title').textContent = 'Edit: ' + p.name;
      document.getElementById('form-name').value = p.name;
      document.getElementById('form-desc').value = p.description;
      document.getElementById('form-price').value = p.price;
      document.getElementById('form-oldprice').value = p.oldPrice || '';
      document.getElementById('form-stock').value = p.stock;
      const stdCats = STANDARD_CATEGORIES.map(sc => sc.value);
      populateCategorySelect(p.category);
      const catSelect = document.getElementById('form-category');
      const customWrap = document.getElementById('form-category-custom-wrap');
      const customInput = document.getElementById('form-category-custom');
      if (stdCats.includes(p.category) || catSelect.value === p.category) {
        customWrap.style.display = 'none'; customInput.value = ''; customInput.required = false;
      } else {
        catSelect.value = 'custom_category'; customWrap.style.display = 'block';
        customInput.value = p.category; customInput.required = true;
      }
      selectedImageFile = null; existingImageUrl = p.image;
      document.getElementById('form-image-file').value = '';
      document.getElementById('form-image-preview').src = p.image;
      document.getElementById('form-image-preview-wrap').style.display = 'block';
      document.querySelectorAll('#sizes-choices input').forEach(cb => { cb.checked = p.sizes.includes(cb.value); });
      document.querySelectorAll('#colors-choices input').forEach(cb => {
        cb.checked = p.colors.some(c => c.name === cb.value.split('|')[0]);
      });
      modal.classList.add('active'); overlay.classList.add('active');
    };

    function closeModal() {
      modal.classList.remove('active'); overlay.classList.remove('active');
      editProductId = null; selectedImageFile = null; existingImageUrl = null;
    }

    window.openDeleteCatModal = function() {
      if (!isLoggedIn()) { openLoginModal(); return; }
      const select = document.getElementById('delete-cat-select');
      select.innerHTML = '';
      const cats = [...new Set(products.map(p => p.category))];
      if (cats.length === 0) { alert('No active categories to remove.'); return; }
      select.innerHTML = cats.map(cat =>
        '<option value="' + cat + '">' + getCategoryLabel(cat) + ' (' + products.filter(p => p.category === cat).length + ' items)</option>'
      ).join('');
      document.getElementById('delete-cat-modal').classList.add('active');
      document.getElementById('delete-cat-modal-overlay').classList.add('active');
    };

    window.closeDeleteCatModal = function() {
      document.getElementById('delete-cat-modal').classList.remove('active');
      document.getElementById('delete-cat-modal-overlay').classList.remove('active');
    };

    async function handleDeleteCatFormSubmit(e) {
      e.preventDefault();
      const cat = document.getElementById('delete-cat-select').value;
      if (!cat) return;
      const count = products.filter(p => p.category === cat).length;
      if (!confirm('Delete category "' + getCategoryLabel(cat) + '" and all ' + count + ' products? Cannot be undone.')) return;
      const deleteBtn = document.querySelector('#delete-cat-form button[type="submit"]');
      deleteBtn.textContent = 'Deleting...'; deleteBtn.disabled = true;
      try {
        await apiFetch('/api/categories/' + cat, { method: 'DELETE' });
        alert('Category deleted successfully.');
        closeDeleteCatModal(); await loadProducts();
      } catch (err) { alert('Failed: ' + err.message); }
      finally { deleteBtn.textContent = 'Delete Category & Products'; deleteBtn.disabled = false; }
    }

    window.confirmDeleteProduct = async function(id) {
      if (!isLoggedIn()) { openLoginModal(); return; }
      const p = products.find(prod => prod.id === id);
      if (!p || !confirm('Delete "' + p.name + '"? Cannot be undone.')) return;
      try { await apiFetch('/api/products/' + id, { method: 'DELETE' }); await loadProducts(); }
      catch (err) { alert('Failed: ' + err.message); }
    };

    document.addEventListener('DOMContentLoaded', async () => {
      await checkAuth();
      await loadProducts();

      document.getElementById('form-image-file').addEventListener('change', (e) => {
        const file = e.target.files[0]; if (!file) return;
        if (!['image/jpeg','image/png','image/webp'].includes(file.type)) { alert('Only JPG, PNG, WEBP.'); e.target.value = ''; return; }
        if (file.size > 10 * 1024 * 1024) { alert('Max 10MB.'); e.target.value = ''; return; }
        selectedImageFile = file;
        const reader = new FileReader();
        reader.onload = ev => { document.getElementById('form-image-preview').src = ev.target.result; document.getElementById('form-image-preview-wrap').style.display = 'block'; };
        reader.readAsDataURL(file);
      });

      document.getElementById('form-category').addEventListener('change', () => {
        const val = document.getElementById('form-category').value;
        const wrap = document.getElementById('form-category-custom-wrap');
        const input = document.getElementById('form-category-custom');
        if (val === 'custom_category') { wrap.style.display = 'block'; input.required = true; input.focus(); }
        else { wrap.style.display = 'none'; input.required = false; input.value = ''; }
      });

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!isLoggedIn()) { openLoginModal(); return; }
        let cat = document.getElementById('form-category').value;
        if (cat === 'custom_category') {
          cat = document.getElementById('form-category-custom').value.trim().toLowerCase();
          if (!cat) { alert('Enter a custom category name.'); return; }
        }
        const sizes = []; document.querySelectorAll('#sizes-choices input:checked').forEach(c => sizes.push(c.value));
        const colors = []; document.querySelectorAll('#colors-choices input:checked').forEach(c => { const [name, hex] = c.value.split('|'); colors.push({ name, hex }); });
        if (sizes.length === 0) { alert('Select at least one size.'); return; }
        if (colors.length === 0) { alert('Select at least one color.'); return; }
        if (!selectedImageFile && !existingImageUrl) { alert('Upload a product image.'); return; }
        const saveBtn = document.getElementById('btn-submit-form');
        const origText = saveBtn.textContent;
        saveBtn.textContent = 'Saving...'; saveBtn.disabled = true;
        try {
          const payload = {
            name: document.getElementById('form-name').value.trim(),
            description: document.getElementById('form-desc').value.trim(),
            category: cat, price: parseFloat(document.getElementById('form-price').value),
            old_price: document.getElementById('form-oldprice').value ? parseFloat(document.getElementById('form-oldprice').value) : null,
            stock: parseInt(document.getElementById('form-stock').value),
            sizes, colors, image_url: existingImageUrl || null, new_arrival: true
          };
          let savedProduct;
          if (editProductId) {
            const res = await apiFetch('/api/products/' + editProductId, { method: 'PUT', body: JSON.stringify(payload) });
            savedProduct = res.product;
          } else {
            const res = await apiFetch('/api/products', { method: 'POST', body: JSON.stringify(payload) });
            savedProduct = res.product;
          }
          if (selectedImageFile && savedProduct) {
            const fd = new FormData(); fd.append('image', selectedImageFile);
            await apiFetch('/api/products/' + savedProduct.id + '/image', { method: 'POST', body: fd });
          }
          await loadProducts(); closeModal();
        } catch (err) { alert('Failed: ' + err.message); }
        finally { saveBtn.textContent = origText; saveBtn.disabled = false; }
      });

      document.getElementById('admin-login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;
        const btn = e.target.querySelector('button[type="submit"]');
        btn.textContent = 'Signing in...'; btn.disabled = true;
        try {
          const res = await apiFetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
          adminToken = res.token; localStorage.setItem('manner_admin_token', adminToken);
          closeLoginModal();
          document.getElementById('btn-admin-logout').style.display = 'inline-block';
          document.getElementById('supabase-status-text').innerHTML =
            '<span class="supabase-status-dot connected"></span> Logged in as <strong>' + res.admin.email + '</strong>';
          await loadProducts();
        } catch (err) { alert('Login failed: ' + err.message); }
        finally { btn.textContent = 'Sign In'; btn.disabled = false; }
      });

      document.getElementById('btn-admin-logout').addEventListener('click', () => {
        adminToken = null; localStorage.removeItem('manner_admin_token');
        document.getElementById('btn-admin-logout').style.display = 'none';
        document.getElementById('supabase-status-text').innerHTML = '<span class="supabase-status-dot disconnected"></span> Signed out.';
        openLoginModal();
      });

      document.getElementById('btn-login-bypass').addEventListener('click', closeLoginModal);
      document.getElementById('btn-add-product').addEventListener('click', openAddForm);
      document.getElementById('form-modal-close').addEventListener('click', closeModal);
      document.getElementById('form-modal-cancel').addEventListener('click', closeModal);
      overlay.addEventListener('click', closeModal);
      document.getElementById('delete-cat-form').addEventListener('submit', handleDeleteCatFormSubmit);
      document.getElementById('btn-delete-category').addEventListener('click', openDeleteCatModal);
      document.getElementById('delete-cat-modal-close').addEventListener('click', closeDeleteCatModal);
      document.getElementById('delete-cat-modal-cancel').addEventListener('click', closeDeleteCatModal);
      document.getElementById('delete-cat-modal-overlay').addEventListener('click', closeDeleteCatModal);
      document.getElementById('admin-search').addEventListener('input', (e) => { activeSearch = e.target.value; renderCatalog(); });
    });
  </script>`;

// Lines are 0-indexed; script is lines 683..1664 (1-indexed: 684..1665)
const before = lines.slice(0, 683); // lines 1..683
const after = lines.slice(1664);    // lines 1665..end (the </script> line onwards)

// Find the closing </script> in the "after" part
let afterStart = 0;
for (let i = 0; i < after.length; i++) {
  if (after[i].trim() === '</script>') {
    afterStart = i + 1; // skip the old </script>
    break;
  }
}

const newContent = [...before, newScript, ...after.slice(afterStart)].join('\n');
fs.writeFileSync(adminPath, newContent, 'utf8');
console.log('Done! admin.html script replaced successfully.');
console.log('Total lines:', newContent.split('\n').length);
