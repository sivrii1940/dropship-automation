import React from 'react';
import { Settings as SettingsIcon } from 'lucide-react';

export default function Settings() {
  return (
    <div className="fade-in">
      <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#fff', marginBottom: '32px' }}>Ayarlar</h1>
      <div style={{ textAlign: 'center', padding: '48px', color: '#64748b' }}>
        <SettingsIcon size={48} style={{ margin: '0 auto 16px' }} />
        <p>Ayarlar sayfası yakında eklenecek</p>
      </div>
    </div>
  );
}
