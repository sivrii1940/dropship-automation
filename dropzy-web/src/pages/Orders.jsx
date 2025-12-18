import React, { useState, useEffect } from 'react';
import { ShoppingCart, Search, RefreshCw, Eye } from 'lucide-react';
import api from '../services/api';
import websocket from '../services/websocket';

const statusColors = {
  pending: '#f59e0b',
  processing: '#3b82f6',
  completed: '#10b981',
  cancelled: '#ef4444',
};

const statusLabels = {
  pending: 'Beklemede',
  processing: 'İşleniyor',
  completed: 'Tamamlandı',
  cancelled: 'İptal',
};

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const fetchOrders = async () => {
    try {
      const response = await api.getOrders(1, 50, filterStatus);
      if (response.success) {
        setOrders(response.data.orders || []);
      }
    } catch (err) {
      console.error('Orders fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();

    const handleOrderUpdate = () => {
      fetchOrders();
    };

    websocket.on('order_update', handleOrderUpdate);
    return () => websocket.off('order_update', handleOrderUpdate);
  }, [filterStatus]);

  const filteredOrders = orders.filter(o =>
    o.order_number?.toString().includes(searchTerm) ||
    o.customer_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="pulse" style={{ textAlign: 'center', padding: '48px', color: '#3b82f6' }}>Yükleniyor...</div>;
  }

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#fff', marginBottom: '8px' }}>Siparişler</h1>
          <p style={{ color: '#a0aec0', fontSize: '16px' }}>{orders.length} sipariş</p>
        </div>
        <button onClick={fetchOrders} style={{
          display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px',
          backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '12px',
          fontSize: '14px', fontWeight: '600', cursor: 'pointer',
        }}>
          <RefreshCw size={16} /> Yenile
        </button>
      </div>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
          <input
            type="text"
            placeholder="Sipariş ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%', padding: '14px 14px 14px 48px', backgroundColor: '#1a1a2e',
              border: '2px solid #2a2a3e', borderRadius: '12px', color: '#fff',
              fontSize: '16px', outline: 'none',
            }}
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{
            padding: '14px 16px', backgroundColor: '#1a1a2e', border: '2px solid #2a2a3e',
            borderRadius: '12px', color: '#fff', fontSize: '16px', outline: 'none', cursor: 'pointer',
          }}
        >
          <option value="">Tüm Durumlar</option>
          <option value="pending">Beklemede</option>
          <option value="processing">İşleniyor</option>
          <option value="completed">Tamamlandı</option>
          <option value="cancelled">İptal</option>
        </select>
      </div>

      <div style={{ backgroundColor: '#1a1a2e', borderRadius: '16px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#2a2a3e' }}>
              <th style={{ padding: '16px', textAlign: 'left', color: '#a0aec0', fontSize: '14px', fontWeight: '600' }}>Sipariş No</th>
              <th style={{ padding: '16px', textAlign: 'left', color: '#a0aec0', fontSize: '14px', fontWeight: '600' }}>Müşteri</th>
              <th style={{ padding: '16px', textAlign: 'left', color: '#a0aec0', fontSize: '14px', fontWeight: '600' }}>Tutar</th>
              <th style={{ padding: '16px', textAlign: 'left', color: '#a0aec0', fontSize: '14px', fontWeight: '600' }}>Durum</th>
              <th style={{ padding: '16px', textAlign: 'left', color: '#a0aec0', fontSize: '14px', fontWeight: '600' }}>Tarih</th>
              <th style={{ padding: '16px', textAlign: 'center', color: '#a0aec0', fontSize: '14px', fontWeight: '600' }}>İşlem</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map((order) => (
              <tr key={order.id} style={{ borderBottom: '1px solid #2a2a3e' }}>
                <td style={{ padding: '16px', color: '#fff', fontSize: '14px', fontWeight: '500' }}>#{order.order_number}</td>
                <td style={{ padding: '16px', color: '#fff', fontSize: '14px' }}>{order.customer_name || 'N/A'}</td>
                <td style={{ padding: '16px', color: '#fff', fontSize: '14px', fontWeight: '600' }}>{order.total_price} TL</td>
                <td style={{ padding: '16px' }}>
                  <span style={{
                    padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '600',
                    backgroundColor: `${statusColors[order.status]}20`, color: statusColors[order.status],
                  }}>
                    {statusLabels[order.status] || order.status}
                  </span>
                </td>
                <td style={{ padding: '16px', color: '#a0aec0', fontSize: '14px' }}>
                  {new Date(order.created_at).toLocaleDateString('tr-TR')}
                </td>
                <td style={{ padding: '16px', textAlign: 'center' }}>
                  <button style={{
                    padding: '8px 16px', backgroundColor: '#2a2a3e', color: '#3b82f6',
                    border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', gap: '6px'
                  }}>
                    <Eye size={16} /> Detay
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredOrders.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px', color: '#64748b' }}>
            <ShoppingCart size={48} style={{ margin: '0 auto 16px' }} />
            <p>Sipariş bulunamadı</p>
          </div>
        )}
      </div>
    </div>
  );
}
