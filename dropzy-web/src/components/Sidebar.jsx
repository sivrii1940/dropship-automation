import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Users, 
  Bell, 
  Settings,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const menuItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/products', icon: Package, label: 'Ürünler' },
  { path: '/orders', icon: ShoppingCart, label: 'Siparişler' },
  { path: '/sellers', icon: Users, label: 'Satıcılar' },
  { path: '/notifications', icon: Bell, label: 'Bildirimler' },
  { path: '/settings', icon: Settings, label: 'Ayarlar' },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside style={{
      width: collapsed ? '80px' : '260px',
      backgroundColor: '#1a1a2e',
      borderRight: '1px solid #2a2a3e',
      transition: 'width 0.3s ease',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{
        padding: '24px',
        borderBottom: '1px solid #2a2a3e',
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
      }}>
        {!collapsed && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              fontWeight: 'bold',
            }}>
              D
            </div>
            <span style={{
              fontSize: '20px',
              fontWeight: 'bold',
              color: '#fff',
            }}>
              Dropzy
            </span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{
            background: 'none',
            border: 'none',
            color: '#64748b',
            cursor: 'pointer',
            padding: '8px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onMouseEnter={(e) => e.target.style.backgroundColor = '#2a2a3e'}
          onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
        >
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      <nav style={{
        flex: 1,
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}>
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              borderRadius: '12px',
              textDecoration: 'none',
              color: isActive ? '#fff' : '#a0aec0',
              backgroundColor: isActive ? '#3b82f6' : 'transparent',
              transition: 'all 0.2s',
              justifyContent: collapsed ? 'center' : 'flex-start',
            })}
            onMouseEnter={(e) => {
              if (e.currentTarget.style.backgroundColor !== 'rgb(59, 130, 246)') {
                e.currentTarget.style.backgroundColor = '#2a2a3e';
              }
            }}
            onMouseLeave={(e) => {
              if (e.currentTarget.style.backgroundColor !== 'rgb(59, 130, 246)') {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            <item.icon size={20} />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
