import React, { useState, useEffect } from 'react';
import { Bell, LogOut, Wifi, WifiOff } from 'lucide-react';
import websocket from '../services/websocket';

export default function Header({ user, onLogout }) {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const handleConnectionStatus = ({ connected }) => {
      setConnected(connected);
    };

    websocket.on('connection_status', handleConnectionStatus);

    return () => {
      websocket.off('connection_status', handleConnectionStatus);
    };
  }, []);

  return (
    <header style={{
      height: '72px',
      backgroundColor: '#1a1a2e',
      borderBottom: '1px solid #2a2a3e',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 16px',
          backgroundColor: connected ? '#10b98120' : '#ef444420',
          borderRadius: '8px',
        }}>
          {connected ? <Wifi size={16} color="#10b981" /> : <WifiOff size={16} color="#ef4444" />}
          <span style={{ 
            fontSize: '14px', 
            color: connected ? '#10b981' : '#ef4444' 
          }}>
            {connected ? 'Bağlı' : 'Bağlantı Yok'}
          </span>
        </div>
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
      }}>
        <button
          style={{
            background: 'none',
            border: 'none',
            color: '#a0aec0',
            cursor: 'pointer',
            padding: '8px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            position: 'relative',
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2a2a3e'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <Bell size={20} />
        </button>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '8px 16px',
          backgroundColor: '#2a2a3e',
          borderRadius: '12px',
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            fontWeight: 'bold',
          }}>
            {user?.username?.[0]?.toUpperCase() || 'U'}
          </div>
          <span style={{ color: '#fff', fontSize: '14px' }}>
            {user?.username || 'User'}
          </span>
        </div>

        <button
          onClick={onLogout}
          style={{
            background: 'none',
            border: 'none',
            color: '#ef4444',
            cursor: 'pointer',
            padding: '8px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#ef444420'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <LogOut size={20} />
          <span style={{ fontSize: '14px' }}>Çıkış</span>
        </button>
      </div>
    </header>
  );
}
