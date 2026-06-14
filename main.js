// ============================================================
// MANNER — Dynamic State Management & Interactive E-commerce
// ============================================================

// ─── Default Product Catalog (Initial Database Fallback) ───
const DEFAULT_PRODUCTS = [
  {
    id: "palazzo",
    name: "High Waisted Palazzo",
    category: "womens",
    categoryLabel: "Women's Wear",
    description: "Wide-leg trousers crafted from breathable crepe fabric for an elongated silhouette.",
    price: 85.00,
    oldPrice: 110.00,
    image: "product_palazzo.png",
    sizes: ["XS", "S", "M", "L", "XL"],
    colors: [
      { name: "Off-White", hex: "#f5f5f0" },
      { name: "Black", hex: "#000000" }
    ],
    stock: 12,
    newArrival: true
  },
  {
    id: "dress",
    name: "Silk Slip Dress",
    category: "womens",
    categoryLabel: "Women's Wear",
    description: "Elegant biased-cut silk providing a fluid drape and luxurious feel for evening events.",
    price: 120.00,
    oldPrice: 160.00,
    image: "product_dress.png",
    sizes: ["XS", "S", "M", "L"],
    colors: [
      { name: "Rust", hex: "#b85d3b" },
      { name: "Champagne", hex: "#f1e3d3" }
    ],
    stock: 8,
    newArrival: true
  },
  {
    id: "blazer",
    name: "Cropped Boxy Blazer",
    category: "womens",
    categoryLabel: "Women's Wear",
    description: "Sharp tailoring meets contemporary cropped length, perfect from office to dinner.",
    price: 130.00,
    oldPrice: 175.00,
    image: "product_blazer.png",
    sizes: ["S", "M", "L", "XL"],
    colors: [
      { name: "Charcoal", hex: "#3a3a3b" },
      { name: "Black", hex: "#000000" }
    ],
    stock: 5,
    bestseller: true
  },
  {
    id: "cargo",
    name: "Urban Utility Cargo",
    category: "mens",
    categoryLabel: "Men's Wear",
    description: "Tactical design meets modern street style with durable water-resistant fabric.",
    price: 90.00,
    oldPrice: 120.00,
    image: "product_cargo.png",
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: [
      { name: "Olive", hex: "#556b2f" },
      { name: "Black", hex: "#000000" }
    ],
    stock: 15,
    newArrival: true
  },
  {
    id: "chinos",
    name: "Relaxed Tapered Chinos",
    category: "mens",
    categoryLabel: "Men's Wear",
    description: "Versatile cotton-twill trousers with clean taper and stretch for all-day comfort.",
    price: 65.00,
    oldPrice: 80.00,
    image: "product_chinos.png",
    sizes: ["S", "M", "L", "XL"],
    colors: [
      { name: "Khaki", hex: "#c3b091" },
      { name: "Navy", hex: "#000080" }
    ],
    stock: 10,
    newArrival: true
  },
  {
    id: "shorts",
    name: "French Terry Shorts",
    category: "mens",
    categoryLabel: "Men's Wear",
    description: "Premium lounge shorts with relaxed hem and adjustable drawstring for comfort.",
    price: 40.00,
    oldPrice: 55.00,
    image: "product_shorts.png",
    sizes: ["S", "M", "L", "XL"],
    colors: [
      { name: "Heather Grey", hex: "#b3b3b3" },
      { name: "Black", hex: "#000000" }
    ],
    stock: 20,
    newArrival: true
  },
  {
    id: "midi",
    name: "Ribbed Knit Midi",
    category: "womens",
    categoryLabel: "Women's Wear",
    description: "Figure-hugging ribbed texture in a sophisticated midi length — comfort meets feminine style.",
    price: 95.00,
    oldPrice: 125.00,
    image: "product_midi.png",
    sizes: ["XS", "S", "M", "L"],
    colors: [
      { name: "Sage Green", hex: "#87a96b" },
      { name: "Cream", hex: "#fffdd0" }
    ],
    stock: 6,
    newArrival: true
  },
  {
    id: "vest",
    name: "Hooded Puffer Vest",
    category: "childrens",
    categoryLabel: "Children's Wear",
    description: "Lightweight synthetic down insulation for core warmth without restricting movement.",
    price: 45.00,
    oldPrice: 75.00,
    image: "product_vest.png",
    sizes: ["2T", "3T", "4T", "5", "6"],
    colors: [
      { name: "Blue Grey", hex: "#667c89" },
      { name: "Yellow", hex: "#ffd700" }
    ],
    stock: 4,
    bestseller: true
  }
];

// ─── Backend API Configuration ───
const API_BASE = ''; // Empty = same origin (Express serves both frontend and API)

// Helper: fetch with error handling
async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('manner_admin_token');
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(API_BASE + path, { ...options, headers });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'API error');
  return json;
}

// Helper for image URLs (works with /images/ backend paths)
function getOptimizedImageUrl(url, width = 600) {
  if (!url) return '';
  return url; // Backend serves images directly at /images/filename
}

// ─── Central State ───
let state = {
  products: [],
  cart: [],
  wishlist: []
};

// Helper for Category Labels
function getCategoryLabel(cat) {
  if (!cat) return "Fashion";
  const catLabels = {
    womens: "Women's Wear",
    mens: "Men's Wear",
    childrens: "Children's Wear",
    accessories: "Accessories",
    event: "Event Wear"
  };
  if (catLabels[cat]) return catLabels[cat];
  return cat.charAt(0).toUpperCase() + cat.slice(1);
}

// ─── Load State from Backend API ───
async function loadStateAsync() {
  // Cart and wishlist remain local (client-side)
  const cartJSON = localStorage.getItem('manner_cart');
  state.cart = cartJSON ? JSON.parse(cartJSON) : [];
  updateCartBadge();

  const wishlistJSON = localStorage.getItem('manner_wishlist');
  state.wishlist = wishlistJSON ? JSON.parse(wishlistJSON) : [];
  updateWishlistBadge();

  // Load products from backend API
  try {
    const data = await apiFetch('/api/products');
    state.products = data.products.map(p => ({
      id: p.id,
      name: p.name,
      category: p.category,
      categoryLabel: p.categoryLabel || getCategoryLabel(p.category),
      description: p.description,
      price: parseFloat(p.price),
      oldPrice: p.old_price ? parseFloat(p.old_price) : null,
      image: p.image_url,
      sizes: p.sizes || ["XS", "S", "M", "L", "XL"],
      colors: p.colors || [{ name: "Black", hex: "#000000" }],
      stock: parseInt(p.stock),
      bestseller: p.bestseller || false,
      newArrival: p.new_arrival || false
    }));
  } catch (err) {
    console.warn('Backend not reachable, loading local defaults:', err.message);
    // Fallback to bundled defaults if API is unavailable
    const stored = localStorage.getItem('manner_products');
    state.products = stored ? JSON.parse(stored) : [...DEFAULT_PRODUCTS];
  }

  // Hydrate Storefront Grid & Filter Pills
  renderCategoryPills();
  renderProducts();
}

// ─── Dynamic Category Pills Rendering ───
function renderCategoryPills() {
  const container = document.querySelector('.cat-pills');
  if (!container) return;

  const existingCats = [];
  state.products.forEach(p => {
    if (p.category && !existingCats.includes(p.category)) {
      existingCats.push(p.category);
    }
  });

  const standardOrder = ['all', 'womens', 'mens', 'childrens', 'accessories', 'event'];
  const categoriesToRender = ['all'];

  standardOrder.forEach(c => {
    if (c !== 'all' && existingCats.includes(c)) {
      categoriesToRender.push(c);
    }
  });

  existingCats.forEach(c => {
    if (!standardOrder.includes(c)) {
      categoriesToRender.push(c);
    }
  });

  container.innerHTML = categoriesToRender.map(cat => {
    const isActive = activeFilter === cat ? 'active' : '';
    const label = cat === 'all' ? 'All' : getCategoryLabel(cat);
    return `<button class="cat-pill ${isActive}" data-filter="${cat}">${label}</button>`;
  }).join('\n');

  const catPills = container.querySelectorAll('.cat-pill');
  catPills.forEach(pill => {
    pill.addEventListener('click', () => {
      catPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      activeFilter = pill.dataset.filter;
      renderProducts();
    });
  });
}

function loadMockProducts() {
  const productsJSON = localStorage.getItem('manner_products');
  if (productsJSON) {
    state.products = JSON.parse(productsJSON);
  } else {
    state.products = [...DEFAULT_PRODUCTS];
    localStorage.setItem('manner_products', JSON.stringify(state.products));
  }
}

function saveState() {
  localStorage.setItem('manner_products', JSON.stringify(state.products));
  localStorage.setItem('manner_cart', JSON.stringify(state.cart));
  localStorage.setItem('manner_wishlist', JSON.stringify(state.wishlist));
}

// ─── Filter & Catalog Show State ───
let activeFilter = 'all';
let showAllProducts = false;
let observer; // scroll reveal observer

document.addEventListener('DOMContentLoaded', () => {
  // Load current state
  loadStateAsync();

  // Initialize UI components
  updateCartBadge();
  updateWishlistBadge();
  renderProducts();

  // ─── Navbar scroll effect ───
  const navbar = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 60) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  });

  // ─── Product category filter initialized dynamically via renderCategoryPills ───

  // ─── Scroll reveal (IntersectionObserver) ───
  const fadeEls = document.querySelectorAll(
    '.trust-item, .section-header'
  );
  fadeEls.forEach(el => el.classList.add('fade-up'));

  observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        setTimeout(() => {
          entry.target.classList.add('visible');
        }, i * 60);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

  fadeEls.forEach(el => observer.observe(el));

  // ─── Smooth active nav link on scroll ───
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-link');

  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        navLinks.forEach(link => {
          link.classList.remove('active-link');
          if (link.getAttribute('href') === `#${id}`) {
            link.classList.add('active-link');
          }
        });
      }
    });
  }, { threshold: 0.5 });

  sections.forEach(section => sectionObserver.observe(section));

  // ─── Load more button click ───
  const loadMoreBtn = document.querySelector('.load-more-wrap .btn-outline');
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', () => {
      showAllProducts = true;
      renderProducts();
      loadMoreBtn.textContent = 'All products loaded ✓';
      loadMoreBtn.disabled = true;
      loadMoreBtn.style.opacity = '0.5';
    });
  }

  // ─── Parallax on hero image ───
  const heroImg = document.querySelector('.hero-img');
  if (heroImg) {
    window.addEventListener('scroll', () => {
      const scrollY = window.scrollY;
      heroImg.style.transform = `scale(1.02) translateY(${scrollY * 0.25}px)`;
    }, { passive: true });
  }

  // ─── Newsletter form submit ───
  const newsletterForm = document.querySelector('.newsletter-form');
  if (newsletterForm) {
    newsletterForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = newsletterForm.querySelector('.newsletter-input');
      const btn = newsletterForm.querySelector('.newsletter-btn');
      if (input.value && input.value.includes('@')) {
        btn.textContent = '✓ Subscribed!';
        btn.style.background = '#1f1f1f';
        btn.style.color = '#fff';
        input.value = '';
        input.placeholder = 'You\'re on the list!';
        setTimeout(() => {
          btn.textContent = 'Subscribe';
          btn.style.background = '';
          btn.style.color = '';
          input.placeholder = 'Your email address';
        }, 3000);
      }
    });
  }

  // ─── Drawers & Modal Setup ───
  initDrawerAndModalListeners();
});

// ─── Render Product Cards dynamically ───
function renderProducts() {
  const productGrid = document.getElementById('product-grid');
  if (!productGrid) return;

  productGrid.innerHTML = '';
  let list = state.products;

  if (activeFilter !== 'all') {
    list = list.filter(p => p.category === activeFilter);
  } else if (!showAllProducts) {
    list = list.slice(0, 4); // Initially show 4 items
  }

  if (list.length === 0) {
    productGrid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 60px 0; color: var(--gray-mid);">
        <p style="font-size: 15px;">No products found in this category.</p>
      </div>
    `;
    return;
  }

  list.forEach(product => {
    const isWishlisted = state.wishlist.includes(product.id);
    const card = document.createElement('div');
    card.className = 'product-card fade-up visible';
    card.dataset.category = product.category;

    let badgeHTML = '';
    if (product.stock === 0) {
      badgeHTML = '<div class="product-badge out-of-stock" style="background:#e74c3c;color:#fff;">Sold Out</div>';
    } else if (product.bestseller) {
      badgeHTML = '<div class="product-badge bestseller">Bestseller</div>';
    } else if (product.newArrival) {
      badgeHTML = '<div class="product-badge new">New</div>';
    }

    card.innerHTML = `
      <div class="product-img-wrap quick-view-trigger" data-id="${product.id}">
        <img src="${getOptimizedImageUrl(product.image, 500)}" onerror="this.onerror=null; this.src='${product.image}';" alt="${product.name}" class="product-img" loading="lazy">
        ${badgeHTML}
        <div class="product-hover-actions">
          <button class="quick-add" data-id="${product.id}" ${product.stock === 0 ? 'disabled style="opacity: 0.55; cursor: not-allowed;"' : ''}>
            ${product.stock === 0 ? 'Sold Out' : 'Quick Add'}
          </button>
          <button class="wishlist-btn ${isWishlisted ? 'active' : ''}" data-id="${product.id}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="${isWishlisted ? '#ff6a00' : 'none'}" stroke="${isWishlisted ? '#ff6a00' : 'currentColor'}" stroke-width="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </button>
        </div>
      </div>
      <div class="product-info">
        <div class="product-meta">
          <span class="product-category">${product.categoryLabel}</span>
        </div>
        <h3 class="product-name quick-view-trigger" data-id="${product.id}">${product.name}</h3>
        <p class="product-desc">${product.description}</p>
        <div class="product-pricing">
          <span class="price-current">₹${product.price.toFixed(2)}</span>
          ${product.oldPrice ? `<span class="price-old">₹${product.oldPrice.toFixed(2)}</span>` : ''}
        </div>
      </div>
    `;

    productGrid.appendChild(card);
  });

  // Re-observe dynamic products
  const productCards = productGrid.querySelectorAll('.product-card');
  if (observer) {
    productCards.forEach(card => observer.observe(card));
  }
}

// ─── Badge Counter Updates ───
function updateCartBadge() {
  const count = state.cart.reduce((total, item) => total + item.quantity, 0);
  const badge = document.getElementById('cart-count');
  if (badge) {
    badge.textContent = count;
    if (count > 0) {
      badge.classList.add('active');
    } else {
      badge.classList.remove('active');
    }
  }
}

function updateWishlistBadge() {
  const count = state.wishlist.length;
  const badge = document.getElementById('wishlist-count');
  if (badge) {
    badge.textContent = count;
    if (count > 0) {
      badge.classList.add('active');
    } else {
      badge.classList.remove('active');
    }
  }
}

// ─── Event Bindings for Drawers & Modals ───
function initDrawerAndModalListeners() {
  // Drawer Toggles
  const cartToggle = document.getElementById('cart-toggle');
  const cartClose = document.getElementById('cart-close');
  const cartDrawer = document.getElementById('cart-drawer');
  const cartOverlay = document.getElementById('cart-drawer-overlay');

  const wishlistToggle = document.getElementById('wishlist-toggle');
  const wishlistClose = document.getElementById('wishlist-close');
  const wishlistDrawer = document.getElementById('wishlist-drawer');
  const wishlistOverlay = document.getElementById('wishlist-drawer-overlay');

  const searchToggle = document.getElementById('search-toggle');
  const searchClose = document.getElementById('search-close');
  const searchOverlay = document.getElementById('search-overlay');

  const quickviewClose = document.getElementById('quickview-close');
  const quickviewModal = document.getElementById('quickview-modal');
  const quickviewOverlay = document.getElementById('quickview-overlay');

  // Open Cart
  const openCart = () => {
    renderCartDrawer();
    cartDrawer.classList.add('active');
    cartOverlay.classList.add('active');
  };
  const closeCart = () => {
    cartDrawer.classList.remove('active');
    cartOverlay.classList.remove('active');
  };
  if (cartToggle) cartToggle.addEventListener('click', openCart);
  if (cartClose) cartClose.addEventListener('click', closeCart);
  if (cartOverlay) cartOverlay.addEventListener('click', closeCart);

  // Open Wishlist
  const openWishlist = () => {
    renderWishlistDrawer();
    wishlistDrawer.classList.add('active');
    wishlistOverlay.classList.add('active');
  };
  const closeWishlist = () => {
    wishlistDrawer.classList.remove('active');
    wishlistOverlay.classList.remove('active');
  };
  if (wishlistToggle) wishlistToggle.addEventListener('click', openWishlist);
  if (wishlistClose) wishlistClose.addEventListener('click', closeWishlist);
  if (wishlistOverlay) wishlistOverlay.addEventListener('click', closeWishlist);

  // Empty states shop button redirection
  const cartEmptyShop = document.getElementById('cart-empty-shop');
  if (cartEmptyShop) {
    cartEmptyShop.addEventListener('click', () => {
      closeCart();
      window.location.hash = '#shop';
    });
  }
  const wishlistEmptyShop = document.getElementById('wishlist-empty-shop');
  if (wishlistEmptyShop) {
    wishlistEmptyShop.addEventListener('click', () => {
      closeWishlist();
      window.location.hash = '#shop';
    });
  }

  // Open Search
  const openSearch = () => {
    searchOverlay.classList.add('active');
    document.getElementById('search-input').focus();
    renderSearchResults('');
  };
  const closeSearch = () => {
    searchOverlay.classList.remove('active');
    document.getElementById('search-input').value = '';
    document.getElementById('search-clear').style.display = 'none';
  };
  if (searchToggle) searchToggle.addEventListener('click', openSearch);
  if (searchClose) searchClose.addEventListener('click', closeSearch);

  // Open Quick View Modal helper
  const closeQuickview = () => {
    quickviewModal.classList.remove('active');
    quickviewOverlay.classList.remove('active');
  };
  if (quickviewClose) quickviewClose.addEventListener('click', closeQuickview);
  if (quickviewOverlay) quickviewOverlay.addEventListener('click', closeQuickview);

  // Global Grid Event Delegation (Quick view, Wishlist, Quick Add)
  const productGrid = document.getElementById('product-grid');
  if (productGrid) {
    productGrid.addEventListener('click', (e) => {
      const qvTrigger = e.target.closest('.quick-view-trigger');
      if (qvTrigger && !e.target.closest('button')) {
        const id = qvTrigger.dataset.id;
        openQuickView(id);
      }

      const quickAddBtn = e.target.closest('.quick-add');
      if (quickAddBtn) {
        e.stopPropagation();
        const id = quickAddBtn.dataset.id;
        handleQuickAdd(id, quickAddBtn);
      }

      const wlBtn = e.target.closest('.wishlist-btn');
      if (wlBtn) {
        e.stopPropagation();
        const id = wlBtn.dataset.id;
        handleWishlistToggle(id, wlBtn);
      }
    });
  }

  // Checkout button simulation
  const checkoutBtn = document.getElementById('checkout-btn');
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', () => {
      handleCheckout();
    });
  }

  // Search logic
  const searchInput = document.getElementById('search-input');
  const searchClear = document.getElementById('search-clear');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const val = e.target.value;
      if (val) {
        searchClear.style.display = 'flex';
      } else {
        searchClear.style.display = 'none';
      }
      renderSearchResults(val);
    });
  }
  if (searchClear) {
    searchClear.addEventListener('click', () => {
      searchInput.value = '';
      searchClear.style.display = 'none';
      renderSearchResults('');
      searchInput.focus();
    });
  }

  // Search tag suggestions click
  const suggestionTags = document.querySelectorAll('.suggestion-tag');
  suggestionTags.forEach(tag => {
    tag.addEventListener('click', () => {
      const q = tag.dataset.tag;
      searchInput.value = q;
      searchClear.style.display = 'flex';
      renderSearchResults(q);
    });
  });
}

// ─── Quick Add Operation ───
function handleQuickAdd(productId, btn) {
  const product = state.products.find(p => p.id === productId);
  if (!product) return;

  if (product.stock <= 0) {
    alert("Sorry! This item is currently out of stock.");
    return;
  }

  // Quick Add adds the first size and color
  const defaultSize = product.sizes[0] || "M";
  const defaultColor = product.colors[0]?.name || "Default";

  const success = addToCart(productId, defaultSize, defaultColor, 1);
  if (success) {
    const originalText = btn.textContent;
    btn.textContent = '✓ Added';
    btn.style.background = '#1f1f1f';
    btn.style.color = '#fff';
    setTimeout(() => {
      btn.textContent = originalText;
      btn.style.background = '';
      btn.style.color = '';
    }, 1800);
  }
}

// ─── Add to Cart Logical State ───
function addToCart(productId, size, color, qty) {
  const product = state.products.find(p => p.id === productId);
  if (!product) return false;

  const cartIndex = state.cart.findIndex(
    item => item.id === productId && item.size === size && item.color === color
  );

  const existingQty = cartIndex > -1 ? state.cart[cartIndex].quantity : 0;
  if (existingQty + qty > product.stock) {
    alert(`Insufficient Stock. You already have ${existingQty} in cart, only ${product.stock} items are available in stock.`);
    return false;
  }

  if (cartIndex > -1) {
    state.cart[cartIndex].quantity += qty;
  } else {
    state.cart.push({
      id: productId,
      size: size,
      color: color,
      quantity: qty
    });
  }

  saveState();
  updateCartBadge();
  return true;
}

// ─── Toggle Wishlist State ───
function handleWishlistToggle(productId, btn) {
  const index = state.wishlist.indexOf(productId);
  let wishlisted = false;

  if (index > -1) {
    state.wishlist.splice(index, 1);
  } else {
    state.wishlist.push(productId);
    wishlisted = true;
  }

  saveState();
  updateWishlistBadge();

  if (btn) {
    const svg = btn.querySelector('svg');
    if (wishlisted) {
      btn.classList.add('active');
      svg.setAttribute('fill', '#ff6a00');
      svg.setAttribute('stroke', '#ff6a00');
    } else {
      btn.classList.remove('active');
      svg.setAttribute('fill', 'none');
      svg.setAttribute('stroke', 'currentColor');
    }
  } else {
    renderProducts();
  }
}

// ─── Render Cart Drawer ───
function renderCartDrawer() {
  const emptyState = document.getElementById('cart-empty-state');
  const itemsList = document.getElementById('cart-items-list');
  const footer = document.getElementById('cart-footer');

  if (state.cart.length === 0) {
    emptyState.style.display = 'flex';
    itemsList.style.display = 'none';
    footer.style.display = 'none';
    return;
  }

  emptyState.style.display = 'none';
  itemsList.style.display = 'flex';
  footer.style.display = 'block';

  itemsList.innerHTML = '';
  let subtotal = 0;

  state.cart.forEach((item, index) => {
    const product = state.products.find(p => p.id === item.id);
    if (!product) return;

    const itemTotal = product.price * item.quantity;
    subtotal += itemTotal;

    const itemEl = document.createElement('div');
    itemEl.className = 'cart-item';
    itemEl.innerHTML = `
      <div class="cart-item-img-wrap" onclick="openQuickView('${product.id}')">
        <img src="${getOptimizedImageUrl(product.image, 120)}" onerror="this.onerror=null; this.src='${product.image}';" alt="${product.name}">
      </div>
      <div class="cart-item-info">
        <h4 class="cart-item-name" onclick="openQuickView('${product.id}')">${product.name}</h4>
        <div class="cart-item-meta">
          <span>Size: ${item.size}</span>
          <span>Color: ${item.color}</span>
        </div>
        <div class="cart-item-price">₹${product.price.toFixed(2)}</div>
        <div class="cart-item-actions">
          <div class="cart-item-qty-control">
            <button class="qty-btn minus" onclick="adjustCartQty(${index}, -1)">−</button>
            <span class="qty-val">${item.quantity}</span>
            <button class="qty-btn plus" onclick="adjustCartQty(${index}, 1)">+</button>
          </div>
          <button class="cart-item-remove" onclick="removeCartIndex(${index})" aria-label="Remove item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
          </button>
        </div>
      </div>
    `;
    itemsList.appendChild(itemEl);
  });

  document.getElementById('cart-subtotal').textContent = `₹${subtotal.toFixed(2)}`;
}

// Global functions for inline HTML actions
window.adjustCartQty = function(index, amount) {
  const item = state.cart[index];
  const product = state.products.find(p => p.id === item.id);
  if (!product) return;

  const targetQty = item.quantity + amount;
  if (targetQty > product.stock) {
    alert(`Only ${product.stock} items are available in stock.`);
    return;
  }
  if (targetQty <= 0) {
    removeCartIndex(index);
    return;
  }

  state.cart[index].quantity = targetQty;
  saveState();
  updateCartBadge();
  renderCartDrawer();
};

window.removeCartIndex = function(index) {
  state.cart.splice(index, 1);
  saveState();
  updateCartBadge();
  renderCartDrawer();
};

// ─── Render Wishlist Drawer ───
function renderWishlistDrawer() {
  const emptyState = document.getElementById('wishlist-empty-state');
  const itemsList = document.getElementById('wishlist-items-list');

  if (state.wishlist.length === 0) {
    emptyState.style.display = 'flex';
    itemsList.style.display = 'none';
    return;
  }

  emptyState.style.display = 'none';
  itemsList.style.display = 'flex';
  itemsList.innerHTML = '';

  state.wishlist.forEach((id, index) => {
    const product = state.products.find(p => p.id === id);
    if (!product) return;

    const itemEl = document.createElement('div');
    itemEl.className = 'wishlist-item';
    itemEl.innerHTML = `
      <div class="wishlist-item-img-wrap" onclick="openQuickView('${product.id}')">
        <img src="${getOptimizedImageUrl(product.image, 120)}" onerror="this.onerror=null; this.src='${product.image}';" alt="${product.name}">
      </div>
      <div class="wishlist-item-info">
        <h4 class="wishlist-item-name" onclick="openQuickView('${product.id}')">${product.name}</h4>
        <div class="wishlist-item-meta">
          <span>${product.categoryLabel}</span>
        </div>
        <div class="wishlist-item-price">₹${product.price.toFixed(2)}</div>
        <div class="wishlist-item-actions">
          <button class="wishlist-add-to-cart" onclick="wishlistMoveToCart('${product.id}')">Add to Cart</button>
          <button class="wishlist-item-remove" onclick="removeWishlistIndex(${index})" aria-label="Remove liked">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </div>
    `;
    itemsList.appendChild(itemEl);
  });
}

window.removeWishlistIndex = function(index) {
  state.wishlist.splice(index, 1);
  saveState();
  updateWishlistBadge();
  renderWishlistDrawer();
  renderProducts(); // sync layout hearts
};

window.wishlistMoveToCart = function(productId) {
  const product = state.products.find(p => p.id === productId);
  if (!product) return;

  if (product.stock <= 0) {
    alert("This item is currently out of stock.");
    return;
  }

  const defaultSize = product.sizes[0] || "M";
  const defaultColor = product.colors[0]?.name || "Default";

  const success = addToCart(productId, defaultSize, defaultColor, 1);
  if (success) {
    // Remove from wishlist
    state.wishlist = state.wishlist.filter(id => id !== productId);
    saveState();
    updateWishlistBadge();
    renderWishlistDrawer();
    renderProducts();

    // Open Cart Drawer
    document.getElementById('wishlist-drawer').classList.remove('active');
    document.getElementById('wishlist-drawer-overlay').classList.remove('active');
    
    setTimeout(() => {
      document.getElementById('cart-drawer').classList.add('active');
      document.getElementById('cart-drawer-overlay').classList.add('active');
      renderCartDrawer();
    }, 300);
  }
};

// ─── Search Overlay Filtering ───
function renderSearchResults(query) {
  const grid = document.getElementById('search-results-grid');
  const suggestions = document.getElementById('search-suggestions');
  if (!grid) return;

  if (!query) {
    grid.innerHTML = '';
    suggestions.style.display = 'block';
    return;
  }

  suggestions.style.display = 'none';
  grid.innerHTML = '';

  const q = query.toLowerCase().trim();
  const list = state.products.filter(
    p => p.name.toLowerCase().includes(q) || 
         p.categoryLabel.toLowerCase().includes(q) || 
         p.description.toLowerCase().includes(q)
  );

  if (list.length === 0) {
    grid.innerHTML = `
      <div class="search-results-empty" style="grid-column: 1 / -1;">
        <p>No products match "${query}". Try searching for 'blazer', 'chinos', or 'womens'.</p>
      </div>
    `;
    return;
  }

  list.forEach(product => {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.innerHTML = `
      <div class="product-img-wrap quick-view-trigger" data-id="${product.id}">
        <img src="${getOptimizedImageUrl(product.image, 300)}" onerror="this.onerror=null; this.src='${product.image}';" alt="${product.name}" class="product-img" loading="lazy">
      </div>
      <div class="product-info" style="padding: 16px;">
        <span class="product-category" style="font-size: 9px;">${product.categoryLabel}</span>
        <h3 class="product-name" style="font-size: 14px; margin-bottom: 4px;">${product.name}</h3>
        <div class="product-pricing">
          <span class="price-current" style="font-size: 13px;">₹${product.price.toFixed(2)}</span>
        </div>
      </div>
    `;

    // Click quick view on search results
    card.querySelector('.quick-view-trigger').addEventListener('click', () => {
      // Close search overlay
      document.getElementById('search-overlay').classList.remove('active');
      document.getElementById('search-input').value = '';
      document.getElementById('search-clear').style.display = 'none';
      openQuickView(product.id);
    });

    grid.appendChild(card);
  });
}

// ─── Product Quick View Modal Logic ───
let selectedSize = '';
let selectedColor = '';

window.openQuickView = function(productId) {
  const product = state.products.find(p => p.id === productId);
  if (!product) return;

  const content = document.getElementById('quickview-content');
  const modal = document.getElementById('quickview-modal');
  const overlay = document.getElementById('quickview-overlay');

  // Set default selection values
  selectedSize = product.sizes[0] || '';
  selectedColor = product.colors[0]?.name || '';

  // Determine stock dot
  let stockLabel = 'In Stock';
  let stockClass = 'in-stock';
  if (product.stock === 0) {
    stockLabel = 'Out of Stock';
    stockClass = 'out-of-stock';
  } else if (product.stock <= 5) {
    stockLabel = `Only ${product.stock} items left in stock!`;
    stockClass = 'low-stock';
  }

  // Size btns markup
  const sizeHTML = product.sizes.map((s, i) => `
    <button class="size-btn ${i === 0 ? 'active' : ''}" onclick="selectModalSize('${s}', this)">${s}</button>
  `).join('');

  // Color btns markup
  const colorHTML = product.colors.map((c, i) => `
    <button class="color-btn ${i === 0 ? 'active' : ''}" style="background-color: ${c.hex};" onclick="selectModalColor('${c.name}', this)" aria-label="${c.name}"></button>
  `).join('');

  const isWishlisted = state.wishlist.includes(product.id);

  content.innerHTML = `
    <div class="modal-gallery">
      <img src="${getOptimizedImageUrl(product.image, 600)}" onerror="this.onerror=null; this.src='${product.image}';" alt="${product.name}">
    </div>
    <div class="modal-details">
      <div class="modal-category">${product.categoryLabel}</div>
      <h2 class="modal-title">${product.name}</h2>
      <div class="modal-price-row">
        <span class="modal-price">₹${product.price.toFixed(2)}</span>
        ${product.oldPrice ? `<span class="modal-price-old">₹${product.oldPrice.toFixed(2)}</span>` : ''}
      </div>
      <p class="modal-desc">${product.description}</p>
      
      <div class="option-select-group">
        <div class="option-label">
          <span>Select Size</span>
          <span class="selected-option-val" id="selected-size-val">${selectedSize}</span>
        </div>
        <div class="size-options">
          ${sizeHTML}
        </div>
      </div>

      <div class="option-select-group">
        <div class="option-label">
          <span>Select Color</span>
          <span class="selected-option-val" id="selected-color-val">${selectedColor}</span>
        </div>
        <div class="color-options">
          ${colorHTML}
        </div>
      </div>

      <div class="stock-status-indicator">
        <span class="stock-dot ${stockClass}"></span>
        <span class="stock-text" style="color: ${product.stock === 0 ? '#e74c3c' : (product.stock <= 5 ? '#e67e22' : '#2ecc71')}">${stockLabel}</span>
      </div>

      <div class="modal-actions">
        <button class="btn-primary modal-add-to-cart" id="modal-cart-submit" onclick="submitModalAddToCart('${product.id}')" ${product.stock === 0 ? 'disabled' : ''}>
          ${product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
        </button>
        <button class="modal-wishlist-btn ${isWishlisted ? 'active' : ''}" onclick="modalWishlistToggle('${product.id}', this)" aria-label="Toggle favorite">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="${isWishlisted ? '#ff6a00' : 'none'}" stroke="${isWishlisted ? '#ff6a00' : 'currentColor'}" stroke-width="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        </button>
      </div>
    </div>
  `;

  modal.classList.add('active');
  overlay.classList.add('active');
};

window.selectModalSize = function(size, btn) {
  selectedSize = size;
  document.getElementById('selected-size-val').textContent = size;
  const parent = btn.parentElement;
  parent.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
};

window.selectModalColor = function(colorName, btn) {
  selectedColor = colorName;
  document.getElementById('selected-color-val').textContent = colorName;
  const parent = btn.parentElement;
  parent.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
};

window.submitModalAddToCart = function(productId) {
  const success = addToCart(productId, selectedSize, selectedColor, 1);
  if (success) {
    // Close modal
    document.getElementById('quickview-modal').classList.remove('active');
    document.getElementById('quickview-overlay').classList.remove('active');

    // Open Cart drawer
    setTimeout(() => {
      document.getElementById('cart-drawer').classList.add('active');
      document.getElementById('cart-drawer-overlay').classList.add('active');
      renderCartDrawer();
    }, 300);
  }
};

window.modalWishlistToggle = function(productId, btn) {
  handleWishlistToggle(productId, null); // update state

  const isWishlisted = state.wishlist.includes(productId);
  const svg = btn.querySelector('svg');
  if (isWishlisted) {
    btn.classList.add('active');
    svg.setAttribute('fill', '#ff6a00');
    svg.setAttribute('stroke', '#ff6a00');
  } else {
    btn.classList.remove('active');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
  }

  // Update layout cards
  renderProducts();
};

// ─── Simulation Checkout ───
async function handleCheckout() {
  if (state.cart.length === 0) return;

  // Deduct stock limits
  let checkoutValid = true;
  const tempProducts = JSON.parse(JSON.stringify(state.products));

  for (const item of state.cart) {
    const product = tempProducts.find(p => p.id === item.id);
    if (product) {
      if (product.stock >= item.quantity) {
        product.stock -= item.quantity;
      } else {
        checkoutValid = false;
        alert(`Stock error: Not enough stock of "${product.name}" left! Available: ${product.stock}.`);
        return;
      }
    }
  }

  if (supabaseClient) {
    try {
      for (const item of state.cart) {
        const product = tempProducts.find(p => p.id === item.id);
        const { error } = await supabaseClient
          .from('products')
          .update({ stock: product.stock })
          .eq('id', product.id);

        if (error) throw error;
      }
    } catch (err) {
      console.error("Failed to update stock in Supabase:", err);
      alert("Checkout failed. Error updating stock in database. Please try again.");
      return;
    }
  }

  // Commit transaction to state
  state.products = tempProducts;
  state.cart = [];
  saveState();

  // Clear badges & drawers
  updateCartBadge();
  renderCartDrawer();
  renderProducts();

  alert("✓ Purchase Successful!\n\nYour order has been placed successfully. Available product stocks have been updated, and your cart has been cleared. Thank you for choosing Manner!");

  // Close Cart Drawer
  document.getElementById('cart-drawer').classList.remove('active');
  document.getElementById('cart-drawer-overlay').classList.remove('active');
}
