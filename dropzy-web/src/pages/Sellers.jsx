import React, { useState, useEffect } from 'react';
import { Users, Plus, Edit, Trash2, RefreshCw } from 'lucide-react';
import api from '../services/api';

export default function Sellers() {
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchSellers = async () => {
    try {
      const response = await api.getSellers();
      if (response.success) {
        setSellers(response.data || []);
      }
    } catch (err) {
      console.error('Sellers fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSellers();
  }, []);

  if (loading) {
    return <div className="pulse" style={{ textAlign: 'center', padding: '48px', color: '#3b82f6' }}>Yükleniyor...</div>;
  }

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#fff', marginBottom: '8px' }}>Satıcılar</h1>
          <p style={{ color: '#a0aec0', fontSize: '16px' }}>{sellers.length} satıcı</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={fetchSellers} style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px',
            backgroundColor: '#2a2a3e', color: '#fff', border: 'none', borderRadius: '12px',
            fontSize: '14px', fontWeight: '600', cursor: 'pointer',
          }}>
            <RefreshCw size={16} /> Yenile
          </button>
          <button style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px',
            backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '12px',
            fontSize: '14px', fontWeight: '600', cursor: 'pointer',
          }}>
            <Plus size={16} /> Satıcı Ekle
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
        {sellers.map((seller) => (
          <div key={seller.id} style={{
            backgroundColor: '#1a1a2e', borderRadius: '16px', padding: '24px',
            border: '1px solid #2a2a3e',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '12px',
                background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '24px', fontWeight: 'bold',
              }}>
                {seller.name?.[0]?.toUpperCase() || 'S'}
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#fff', marginBottom: '4px' }}>
                  {seller.name}
                </h3>
                <span style={{
                  fontSize: '12px', padding: '4px 8px', borderRadius: '6px',
                  backgroundColor: seller.is_active ? '#10b98120' : '#64748b20',
                  color: seller.is_active ? '#10b981' : '#64748b',
                }}>
                  {seller.is_active ? 'Aktif' : 'Pasif'}
                </span>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '14px', color: '#a0aec0', marginBottom: '8px' }}>
                <strong>Platform:</strong> Trendyol
              </div>
              <div style={{ fontSize: '14px', color: '#a0aec0', marginBottom: '8px' }}>
                <strong>Ürün Sayısı:</strong> {seller.products_count || 0}
              </div>
              <div style={{ fontSize: '14px', color: '#a0aec0' }}>
                <strong>Son Senkron:</strong> {seller.last_sync ? new Date(seller.last_sync).toLocaleDateString('tr-TR') : 'Henüz değil'}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button style={{
                flex: 1, padding: '10px', backgroundColor: '#2a2a3e', color: '#3b82f6',
                border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
              }}>
                <Edit size={16} /> Düzenle
              </button>
              <button style={{
                flex: 1, padding: '10px', backgroundColor: '#ef444420', color: '#ef4444',
                border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
              }}>
                <Trash2 size={16} /> Sil
              </button>
            </div>
          </div>
        ))}
      </div>

      {sellers.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px', color: '#64748b' }}>
          <Users size={48} style={{ margin: '0 auto 16px' }} />
          <p>Henüz satıcı eklenmemiş</p>
        </div>
      )}
    </div>
  );
}
