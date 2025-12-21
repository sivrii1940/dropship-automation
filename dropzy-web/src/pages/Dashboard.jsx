import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Package, 
  ShoppingCart, 
  Users, 
  TrendingUp, 
  Activity,
  RefreshCw
} from 'lucide-react';
import api from '../services/api';
import websocket from '../services/websocket';

const StatCard = ({ icon: Icon, title, value, color, onClick }) => (
  <div 
    onClick={onClick}
    style={{
      backgroundColor: '#1a1a2e',
      borderRadius: '16px',
      padding: '24px',
      borderLeft: `4px solid ${color}`,
      cursor: onClick ? 'pointer' : 'default',
      transition: 'transform 0.2s, box-shadow 0.2s',
    }}
    onMouseEnter={(e) => {
      if (onClick) {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.2)';
      }
    }}
    onMouseLeave={(e) => {
      if (onClick) {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
      <div style={{
        width: '56px',
        height: '56px',
        backgroundColor: `${color}20`,
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Icon size={28} color={color} />
      </div>
      <div>
        <div style={{ 
          fontSize: '32px', 
          fontWeight: 'bold', 
          color: '#fff',
          marginBottom: '4px'
        }}>
          {value}
        </div>
        <div style={{ fontSize: '14px', color: '#a0aec0' }}>
          {title}
        </div>
      </div>
    </div>
  </div>
);

const ActivityItem = ({ activity }) => (
  <div style={{
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '16px',
    backgroundColor: '#2a2a3e',
    borderRadius: '12px',
    marginBottom: '12px',
  }}>
    <div style={{
      width: '8px',
      height: '8px',
      borderRadius: '50%',
      backgroundColor: activity.status === 'success' ? '#10b981' : '#f59e0b',
      marginTop: '6px',
      flexShrink: 0,
    }} />
    <div style={{ flex: 1 }}>
      <div style={{ 
        fontSize: '14px', 
        color: '#fff', 
        fontWeight: '500',
        marginBottom: '4px'
      }}>
        {activity.action}
      </div>
      <div style={{ fontSize: '13px', color: '#a0aec0', marginBottom: '4px' }}>
        {activity.details}
      </div>
      <div style={{ fontSize: '12px', color: '#64748b' }}>
        {activity.created_at}
      </div>
    </div>
  </div>
);

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);

  const fetchDashboard = async () => {
    try {
      // Check if token exists before making request
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('⚠️ No token found, skipping dashboard fetch');
        setLoading(false);
        return;
      }
      
      console.log('📊 Fetching dashboard data...');
      const response = await api.getDashboard();
      console.log('✅ Dashboard response:', response);
      
      if (response.success) {
        setDashboardData(response.data);
      }
    } catch (err) {
      console.error('❌ Dashboard fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();

    // Real-time updates
    const handleOrderUpdate = () => {
      fetchDashboard();
    };

    const handleProductUpdate = () => {
      fetchDashboard();
    };

    websocket.on('order_update', handleOrderUpdate);
    websocket.on('product_update', handleProductUpdate);

    return () => {
      websocket.off('order_update', handleOrderUpdate);
      websocket.off('product_update', handleProductUpdate);
    };
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboard();
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        minHeight: '400px'
      }}>
        <div className="pulse" style={{ color: '#3b82f6', fontSize: '1.2rem' }}>
          Yükleniyor...
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '32px'
      }}>
        <div>
          <h1 style={{ 
            fontSize: '32px', 
            fontWeight: 'bold', 
            color: '#fff',
            marginBottom: '8px'
          }}>
            Dashboard
          </h1>
          <p style={{ color: '#a0aec0', fontSize: '16px' }}>
            İşletmenizin genel durumu
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 24px',
            backgroundColor: '#3b82f6',
            color: '#fff',
            border: 'none',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: refreshing ? 'not-allowed' : 'pointer',
            opacity: refreshing ? 0.6 : 1,
          }}
        >
          <RefreshCw size={16} className={refreshing ? 'pulse' : ''} />
          Yenile
        </button>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '20px',
        marginBottom: '32px',
      }}>
        <StatCard
          icon={Package}
          title="Toplam Ürün"
          value={dashboardData?.products_count || 0}
          color="#3b82f6"
          onClick={() => navigate('/products')}
        />
        <StatCard
          icon={ShoppingCart}
          title="Bekleyen Siparişler"
          value={dashboardData?.pending_orders || 0}
          color="#f59e0b"
          onClick={() => navigate('/orders')}
        />
        <StatCard
          icon={TrendingUp}
          title="Tamamlanan"
          value={dashboardData?.completed_orders || 0}
          color="#10b981"
          onClick={() => navigate('/orders')}
        />
        <StatCard
          icon={Users}
          title="Aktif Satıcılar"
          value={dashboardData?.active_sellers || 0}
          color="#8b5cf6"
          onClick={() => navigate('/sellers')}
        />
      </div>

      <div style={{
        backgroundColor: '#1a1a2e',
        borderRadius: '16px',
        padding: '24px',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '24px',
        }}>
          <Activity size={24} color="#3b82f6" />
          <h2 style={{ 
            fontSize: '20px', 
            fontWeight: 'bold', 
            color: '#fff'
          }}>
            Son Aktiviteler
          </h2>
        </div>

        {dashboardData?.recent_activities?.length > 0 ? (
          <div>
            {dashboardData.recent_activities.map((activity, index) => (
              <ActivityItem key={index} activity={activity} />
            ))}
          </div>
        ) : (
          <div style={{
            textAlign: 'center',
            padding: '48px',
            color: '#64748b',
            fontSize: '14px'
          }}>
            Henüz aktivite bulunmuyor
          </div>
        )}
      </div>
    </div>
  );
}
