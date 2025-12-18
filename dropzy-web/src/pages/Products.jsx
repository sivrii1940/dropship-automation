import React, { useState, useEffect } from 'react';
import { Package, Search, RefreshCw, Edit, Trash2 } from 'lucide-react';
import api from '../services/api';
import websocket from '../services/websocket';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchProducts = async () => {
    try {
      const response = await api.getProducts();
      if (response.success) {
        setProducts(response.data.products || []);
      }
    } catch (err) {
      console.error('Products fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();

    const handleProductUpdate = (data) => {
      fetchProducts();
    };

    websocket.on('product_update', handleProductUpdate);
    return () => websocket.off('product_update', handleProductUpdate);
  }, []);

  const filteredProducts = products.filter(p =>
    p.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.shopify_product_id?.toString().includes(searchTerm)
  );

  if (loading) {
    return <div className="pulse" style={{ textAlign: 'center', padding: '48px', color: '#3b82f6' }}>Yükleniyor...</div>;
  }

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#fff', marginBottom: '8px' }}>Ürünler</h1>
          <p style={{ color: '#a0aec0', fontSize: '16px' }}>{products.length} ürün</p>
        </div>
        <button onClick={fetchProducts} style={{
          display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px',
          backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '12px',
          fontSize: '14px', fontWeight: '600', cursor: 'pointer',
        }}>
          <RefreshCw size={16} /> Yenile
        </button>
      </div>

      <div style={{ marginBottom: '24px', position: 'relative' }}>
        <Search size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
        <input
          type="text"
          placeholder="Ürün ara..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: '100%', padding: '14px 14px 14px 48px', backgroundColor: '#1a1a2e',
            border: '2px solid #2a2a3e', borderRadius: '12px', color: '#fff',
            fontSize: '16px', outline: 'none',
          }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
        {filteredProducts.map((product) => (
          <div key={product.id} style={{
            backgroundColor: '#1a1a2e', borderRadius: '16px', padding: '20px',
            border: '1px solid #2a2a3e', transition: 'transform 0.2s',
          }}>
            {product.image_url && (
              <img src={product.image_url} alt={product.title}
                style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: '12px', marginBottom: '16px' }} />
            )}
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#fff', marginBottom: '8px' }}>{product.title}</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#3b82f6' }}>{product.price} TL</span>
              <span style={{ fontSize: '14px', color: '#a0aec0' }}>Stok: {product.stock}</span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button style={{
                flex: 1, padding: '8px', backgroundColor: '#2a2a3e', color: '#3b82f6',
                border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
              }}>
                <Edit size={16} /> Düzenle
              </button>
              <button style={{
                flex: 1, padding: '8px', backgroundColor: '#ef444420', color: '#ef4444',
                border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
              }}>
                <Trash2 size={16} /> Sil
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px', color: '#64748b' }}>
          <Package size={48} style={{ margin: '0 auto 16px' }} />
          <p>Ürün bulunamadı</p>
        </div>
      )}
    </div>
  );
}
