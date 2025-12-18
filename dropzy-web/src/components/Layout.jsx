import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

export default function Layout({ user, onLogout }) {
  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      backgroundColor: '#0f0f1a'
    }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Header user={user} onLogout={onLogout} />
        <main style={{ 
          flex: 1, 
          padding: '24px',
          overflowY: 'auto'
        }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
