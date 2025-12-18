import React from 'react';
import { Bell } from 'lucide-react';

export default function Notifications() {
  return (
    <div className="fade-in">
      <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#fff', marginBottom: '32px' }}>Bildirimler</h1>
      <div style={{ textAlign: 'center', padding: '48px', color: '#64748b' }}>
        <Bell size={48} style={{ margin: '0 auto 16px' }} />
        <p>Henüz bildirim yok</p>
      </div>
    </div>
  );
}
