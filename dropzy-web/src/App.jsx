import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Orders from './pages/Orders';
import Sellers from './pages/Sellers';
import Notifications from './pages/Notifications';
import Settings from './pages/Settings';
import Layout from './components/Layout';
import api from './services/api';
import websocket from './services/websocket';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    console.log('🔍 App init - token:', token ? 'exists' : 'none');
    console.log('🔍 App init - user:', savedUser);
    
    if (token && savedUser) {
      try {
        // CRITICAL: Set token to API headers
        api.setToken(token);
        console.log('✅ Token set to API');
        
        setUser(JSON.parse(savedUser));
        console.log('✅ User loaded');
        
        // Connect websocket
        websocket.connect(token);
        console.log('✅ WebSocket connecting');
      } catch (error) {
        console.error('❌ Error parsing user data:', error);
        api.clearToken();
      }
    }
    
    setLoading(false);
  }, []);

  const handleLogin = (userData) => {
    console.log('✅ handleLogin called with:', userData);
    
    // userData format: {user: {id, email, name}, access_token: "..."}
    if (userData.user) {
      setUser(userData.user);
      localStorage.setItem('user', JSON.stringify(userData.user));
    }
    
    if (userData.access_token) {
      websocket.connect(userData.access_token);
    }
  };

  const handleLogout = () => {
    api.logout();
    websocket.disconnect();
    setUser(null);
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#0f0f1a'
      }}>
        <div className="pulse" style={{ fontSize: '2rem', color: '#3b82f6' }}>
          Dropzy yükleniyor...
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route 
          path="/login" 
          element={user ? <Navigate to="/" /> : <Login onLogin={handleLogin} />} 
        />
        <Route 
          path="/register" 
          element={user ? <Navigate to="/" /> : <Register />} 
        />
        
        {user ? (
          <Route element={<Layout user={user} onLogout={handleLogout} />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/products" element={<Products />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/sellers" element={<Sellers />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        ) : (
          <Route path="*" element={<Navigate to="/login" />} />
        )}
      </Routes>
    </BrowserRouter>
  );
}

export default App;
