# React/Next.js Supabase E-commerce Integration Blueprint

This document contains a complete React / Next.js implementation blueprint for migrating the Manner e-commerce website to a modern React architecture utilizing the `@supabase/supabase-js` client.

---

## 1. Supabase Client Configuration (`lib/supabaseClient.js`)

```javascript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Create a single Supabase client for the entire app
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

---

## 2. Custom Image Upload Hook (`hooks/useSupabaseStorage.js`)

This hook manages file validations, naming conventions, directory structure categorization, uploads, URL generation, and error handling with automatic retry logic.

```javascript
import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export const useSupabaseStorage = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Uploads an image to the bucket with retry logic, size/type validation, and categorizes it into folders.
   * @param {File} file - Browser File object
   * @param {string} category - womens, mens, childrens, accessories
   * @param {number} retries - number of network retry attempts (default: 3)
   */
  const uploadProductImage = async (file, category, retries = 3) => {
    setIsUploading(true);
    setError(null);

    // 1. Validations
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      const errMsg = 'Invalid file type. Only JPG, PNG, and WEBP formats are supported.';
      setError(errMsg);
      setIsUploading(false);
      throw new Error(errMsg);
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      const errMsg = 'File is too large. Maximum size allowed is 10 MB.';
      setError(errMsg);
      setIsUploading(false);
      throw new Error(errMsg);
    }

    // 2. Folder routing
    let folderName = 'accessories';
    if (category === 'womens') folderName = 'women';
    else if (category === 'mens') folderName = 'men';
    else if (category === 'childrens') folderName = 'kids';

    // 3. Unique filename generation (timestamp + unique ID)
    const fileExt = file.name.split('.').pop();
    const uniqueId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11);
    const filename = `${Date.now()}-${uniqueId}.${fileExt}`;
    const filePath = `${folderName}/${filename}`;

    // 4. File Upload with Network Retry Logic
    let attempt = 0;
    while (attempt < retries) {
      try {
        const { data, error: uploadErr } = await supabase.storage
          .from('product-images')
          .upload(filePath, file, {
            cacheControl: '3600', // Cache on CDN for 1 hour
            upsert: false,
          });

        if (uploadErr) throw uploadErr;

        // 5. Retrieve public URL
        const { data: { publicUrl } } = supabase.storage
          .from('product-images')
          .getPublicUrl(filePath);

        setIsUploading(false);
        return { publicUrl, filePath };
      } catch (err) {
        attempt++;
        if (attempt >= retries) {
          setError(`Upload failed after ${retries} attempts: ${err.message}`);
          setIsUploading(false);
          throw err;
        }
        // Wait 1 second before retrying
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  };

  /**
   * Deletes an image from the Supabase Storage bucket.
   * @param {string} filePath - path inside bucket, e.g. "men/1234-uuid.png"
   */
  const deleteProductImage = async (filePath) => {
    try {
      const { error: deleteErr } = await supabase.storage
        .from('product-images')
        .remove([filePath]);

      if (deleteErr) throw deleteErr;
      return true;
    } catch (err) {
      console.error('Failed to delete storage image:', err);
      throw err;
    }
  };

  return { uploadProductImage, deleteProductImage, isUploading, error };
};
```

---

## 3. React Storefront Component (`components/ProductCard.jsx`)

Renders clean responsive layout cards, implements standard browser lazy loading (`loading="lazy"`), and includes quick preview triggers.

```jsx
import React from 'react';
import Image from 'next/image';

export const ProductCard = ({ product, onQuickView, onQuickAdd, onWishlistToggle, isWishlisted }) => {
  const isOutOfStock = product.stock === 0;

  return (
    <div className="product-card fade-up visible">
      <div 
        className="product-img-wrap" 
        onClick={() => onQuickView(product.id)}
        style={{ cursor: 'pointer' }}
      >
        {/* Next.js Image component handles responsive optimization and lazy loading automatically */}
        <Image
          src={product.image_url}
          alt={product.name}
          width={300}
          height={400}
          loading="lazy"
          className="product-img"
          style={{ objectFit: 'cover', width: '100%', height: '100%' }}
        />
        {isOutOfStock && (
          <div className="product-badge out-of-stock" style={{ backgroundColor: '#e74c3c', color: '#fff' }}>
            Sold Out
          </div>
        )}
        <div className="product-hover-actions">
          <button 
            className="quick-add"
            onClick={(e) => {
              e.stopPropagation();
              onQuickAdd(product.id);
            }}
            disabled={isOutOfStock}
            style={isOutOfStock ? { opacity: 0.55, cursor: 'not-allowed' } : {}}
          >
            {isOutOfStock ? 'Sold Out' : 'Quick Add'}
          </button>
          <button 
            className={`wishlist-btn ${isWishlisted ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              onWishlistToggle(product.id);
            }}
          >
            <svg 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill={isWishlisted ? '#ff6a00' : 'none'} 
              stroke={isWishlisted ? '#ff6a00' : 'currentColor'} 
              strokeWidth="2"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </button>
        </div>
      </div>
      <div className="product-info">
        <div className="product-meta">
          <span className="product-category">
            {product.category === 'womens' ? "Women's Wear" : (product.category === 'mens' ? "Men's Wear" : "Children's Wear")}
          </span>
        </div>
        <h3 className="product-name" onClick={() => onQuickView(product.id)}>{product.name}</h3>
        <p className="product-desc">{product.description}</p>
        <div className="product-pricing">
          <span className="price-current">USD ${parseFloat(product.price).toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
};
```

---

## 4. Admin Management Page (`pages/admin.jsx`)

Implements admin protection gates, product state loads, live image uploading/previewing/replacing, stock tracking, and SQL database write updates.

```jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useSupabaseStorage } from '../hooks/useSupabaseStorage';

export default function AdminPage() {
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editProduct, setEditProduct] = useState(null);

  // Form Fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('womens');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('10');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');

  // Storage Hook
  const { uploadProductImage, deleteProductImage, isUploading } = useSupabaseStorage();

  // Authentication Gate check
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
      if (session) {
        fetchProducts();
      } else {
        setLoading(false);
      }
    };
    checkUser();

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error) setProducts(data);
    setLoading(false);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const openForm = (prod = null) => {
    setEditProduct(prod);
    if (prod) {
      setName(prod.name);
      setDescription(prod.description);
      setCategory(prod.category);
      setPrice(prod.price);
      setStock(prod.stock);
      setPreviewUrl(prod.image_url);
    } else {
      setName('');
      setDescription('');
      setCategory('womens');
      setPrice('');
      setStock('10');
      setPreviewUrl('');
    }
    setSelectedFile(null);
    setIsModalOpen(true);
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();

    try {
      let finalImageUrl = editProduct?.image_url || '';

      // Upload file to bucket if newly selected
      if (selectedFile) {
        // If editing and replacing, optionally delete previous image from storage
        if (editProduct?.image_url) {
          const oldPath = editProduct.image_url.split('/public/product-images/')[1];
          if (oldPath) {
            await deleteProductImage(oldPath);
          }
        }

        const uploadResult = await uploadProductImage(selectedFile, category);
        finalImageUrl = uploadResult.publicUrl;
      }

      if (!finalImageUrl) {
        alert('Please upload a product image first.');
        return;
      }

      const productPayload = {
        name,
        description,
        category,
        price: parseFloat(price),
        stock: parseInt(stock),
        image_url: finalImageUrl,
      };

      if (editProduct) {
        // Update product table entry
        const { error } = await supabase
          .from('products')
          .update(productPayload)
          .eq('id', editProduct.id);
        if (error) throw error;
      } else {
        // Insert product table entry
        const { error } = await supabase
          .from('products')
          .insert([productPayload]);
        if (error) throw error;
      }

      setIsModalOpen(false);
      fetchProducts();
    } catch (err) {
      alert(`Save failed: ${err.message}`);
    }
  };

  const handleDeleteProduct = async (prod) => {
    if (!confirm(`Are you sure you want to delete "${prod.name}"?`)) return;

    try {
      // 1. Delete image from Storage
      const imgPath = prod.image_url.split('/public/product-images/')[1];
      if (imgPath) {
        await deleteProductImage(imgPath);
      }

      // 2. Delete item row from DB
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', prod.id);

      if (error) throw error;
      fetchProducts();
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  if (loading) return <div className="loading">Loading admin gate...</div>;

  if (!user) {
    return (
      <div className="admin-login-screen">
        <h2>Manner Administrative Sign In</h2>
        <form onSubmit={async (e) => {
          e.preventDefault();
          const email = e.target.email.value;
          const password = e.target.password.value;
          const { error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) alert(error.message);
        }}>
          <input name="email" type="email" placeholder="Admin Email" required />
          <input name="password" type="password" placeholder="Password" required />
          <button type="submit">Sign In</button>
        </form>
      </div>
    );
  }

  return (
    <div className="admin-dashboard container">
      <div className="header-row">
        <h1>Product Catalog Dashboard</h1>
        <button onClick={() => openForm()}>+ Add New Product</button>
      </div>

      <table className="admin-table">
        <thead>
          <tr>
            <th>Image</th>
            <th>Details</th>
            <th>Price</th>
            <th>Stock Limit</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id}>
              <td>
                <img src={p.image_url} alt={p.name} style={{ width: 50, height: 60, objectFit: 'cover', borderRadius: 6 }} />
              </td>
              <td>
                <strong>{p.name}</strong>
                <div>{p.category}</div>
              </td>
              <td>USD ${parseFloat(p.price).toFixed(2)}</td>
              <td>{p.stock} units</td>
              <td>
                <button onClick={() => openForm(p)}>Edit</button>
                <button onClick={() => handleDeleteProduct(p)} style={{ color: 'red', marginLeft: 8 }}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Product Form Modal */}
      {isModalOpen && (
        <div className="modal-backdrop">
          <div className="modal">
            <h2>{editProduct ? 'Edit Product' : 'Add New Product'}</h2>
            <form onSubmit={handleSaveProduct}>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Product Name" required />
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" required />
              
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="womens">Women's Wear</option>
                <option value="mens">Men's Wear</option>
                <option value="childrens">Children's Wear</option>
              </select>

              <input value={price} onChange={(e) => setPrice(e.target.value)} type="number" placeholder="Price ($)" required />
              <input value={stock} onChange={(e) => setStock(e.target.value)} type="number" placeholder="Stock quantity" required />

              <div className="image-upload-wrapper">
                <input type="file" accept="image/png, image/jpeg, image/webp" onChange={handleFileChange} />
                {previewUrl && (
                  <div className="preview-wrap">
                    <img src={previewUrl} alt="Preview" style={{ width: 100, height: 120, objectFit: 'cover' }} />
                  </div>
                )}
              </div>

              <div className="actions">
                <button type="button" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" disabled={isUploading}>{isUploading ? 'Saving...' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
```
