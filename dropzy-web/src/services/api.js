import axios from 'axios';

const API_URL = 'https://dropzy.app';

class ApiService {
  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.token = localStorage.getItem('token');
    if (this.token) {
      this.setToken(this.token);
    }
  }

  setToken(token) {
    this.token = token;
    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    localStorage.setItem('token', token);
  }

  clearToken() {
    this.token = null;
    delete this.client.defaults.headers.common['Authorization'];
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  // Auth
  async login(email, password) {
    try {
      const response = await this.client.post('/api/auth/login', { email, password });
      console.log('✅ Login response:', response.data);
      
      // Backend format: {success: true, data: {token, user_id, email, name}}
      if (response.data.success && response.data.data?.token) {
        this.setToken(response.data.data.token);
        localStorage.setItem('user', JSON.stringify({
          id: response.data.data.user_id,
          email: response.data.data.email,
          name: response.data.data.name
        }));
      } else if (response.data.token) {
        // Direct token response
        this.setToken(response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data));
      }
      return { success: true, data: response.data };
    } catch (error) {
      console.error('❌ Login error:', error.response?.data);
      return { success: false, error: error.response?.data?.detail || 'Giriş başarısız' };
    }
  }

  async register(username, email, password) {
    try {
      // Backend expects: {email, password, name}
      const response = await this.client.post('/api/auth/register', { 
        email, 
        password, 
        name: username 
      });
      console.log('✅ Register response:', response.data);
      
      // Backend format: {success: true, data: {token, user_id, email, name}}
      if (response.data.success && response.data.data?.token) {
        this.setToken(response.data.data.token);
        localStorage.setItem('user', JSON.stringify({
          id: response.data.data.user_id,
          email: response.data.data.email,
          name: response.data.data.name
        }));
      }
      return { success: true, data: response.data };
    } catch (error) {
      console.error('❌ Register error:', error.response?.data);
      return { success: false, error: error.response?.data?.detail || 'Kayıt başarısız' };
    }
  }

  async logout() {
    this.clearToken();
    return { success: true };
  }

  // Dashboard
  async getDashboard() {
    try {
      const response = await this.client.get('/api/dashboard');
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.detail || 'Dashboard yüklenemedi' };
    }
  }

  // Products
  async getProducts(page = 1, limit = 20) {
    try {
      const response = await this.client.get(`/api/products?page=${page}&limit=${limit}`);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.detail || 'Ürünler yüklenemedi' };
    }
  }

  async getProduct(id) {
    try {
      const response = await this.client.get(`/api/products/${id}`);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.detail || 'Ürün yüklenemedi' };
    }
  }

  async updateProduct(id, data) {
    try {
      const response = await this.client.put(`/api/products/${id}`, data);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.detail || 'Ürün güncellenemedi' };
    }
  }

  async deleteProduct(id) {
    try {
      const response = await this.client.delete(`/api/products/${id}`);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.detail || 'Ürün silinemedi' };
    }
  }

  // Orders
  async getOrders(page = 1, limit = 20, status = '') {
    try {
      let url = `/api/orders?page=${page}&limit=${limit}`;
      if (status) url += `&status=${status}`;
      const response = await this.client.get(url);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.detail || 'Siparişler yüklenemedi' };
    }
  }

  async getOrder(id) {
    try {
      const response = await this.client.get(`/api/orders/${id}`);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.detail || 'Sipariş yüklenemedi' };
    }
  }

  async updateOrderStatus(id, status) {
    try {
      const response = await this.client.put(`/api/orders/${id}/status`, { status });
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.detail || 'Sipariş durumu güncellenemedi' };
    }
  }

  // Sellers
  async getSellers() {
    try {
      const response = await this.client.get('/api/sellers');
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.detail || 'Satıcılar yüklenemedi' };
    }
  }

  async addSeller(data) {
    try {
      const response = await this.client.post('/api/sellers', data);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.detail || 'Satıcı eklenemedi' };
    }
  }

  async updateSeller(id, data) {
    try {
      const response = await this.client.put(`/api/sellers/${id}`, data);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.detail || 'Satıcı güncellenemedi' };
    }
  }

  async deleteSeller(id) {
    try {
      const response = await this.client.delete(`/api/sellers/${id}`);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.detail || 'Satıcı silinemedi' };
    }
  }

  // Notifications
  async getNotifications() {
    try {
      const response = await this.client.get('/api/notifications');
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.detail || 'Bildirimler yüklenemedi' };
    }
  }

  async markNotificationRead(id) {
    try {
      const response = await this.client.put(`/api/notifications/${id}/read`);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.detail || 'Bildirim güncellenemedi' };
    }
  }
}

export default new ApiService();
