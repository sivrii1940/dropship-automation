import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import CacheService from '../services/CacheService';

export default function SettingsScreen({ onLogout }) {
  const [user, setUser] = useState(null);
  const [settings, setSettings] = useState({
    shopify_shop_name: '',
    shopify_access_token: '',
    profit_margin: 50,
    currency_buffer: 5,
    auto_stock_sync: false,
    auto_price_update: true,
    hide_out_of_stock: true,
    stock_sync_interval: 30,
  });
  const [apiUrl, setApiUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Trendyol hesap bilgileri
  const [trendyolEmail, setTrendyolEmail] = useState('');
  const [trendyolPassword, setTrendyolPassword] = useState('');
  const [hasTrendyolCredentials, setHasTrendyolCredentials] = useState(false);
  const [testingTrendyol, setTestingTrendyol] = useState(false);

  // Shopify mağaza yönetimi
  const [shopifyStores, setShopifyStores] = useState([]);
  const [showStoreModal, setShowStoreModal] = useState(false);
  const [editingStore, setEditingStore] = useState(null);
  const [newStore, setNewStore] = useState({ shop_name: '', access_token: '', store_name: '' });
  const [testingStore, setTestingStore] = useState(false);

  useEffect(() => {
    fetchSettings();
    loadUser();
    checkTrendyolCredentials();
    fetchShopifyStores();
  }, []);

  const loadUser = async () => {
    const userData = await api.getUser();
    setUser(userData);
  };

  const checkTrendyolCredentials = async () => {
    try {
      const response = await api.getOrderAutomationStatus();
      if (response.success) {
        setHasTrendyolCredentials(response.data.has_trendyol_credentials);
      }
    } catch (err) {
      console.error('Trendyol check error:', err);
    }
  };

  const fetchShopifyStores = async () => {
    try {
      const response = await api.getShopifyStores();
      if (response.success) {
        setShopifyStores(response.data || []);
      }
    } catch (err) {
      console.error('Shopify stores fetch error:', err);
    }
  };

  const openAddStoreModal = () => {
    setEditingStore(null);
    setNewStore({ shop_name: '', access_token: '', store_name: '' });
    setShowStoreModal(true);
  };

  const openEditStoreModal = (store) => {
    setEditingStore(store);
    setNewStore({
      shop_name: store.shop_name,
      access_token: store.access_token,
      store_name: store.store_name || ''
    });
    setShowStoreModal(true);
  };

  const saveStore = async () => {
    if (!newStore.shop_name || !newStore.access_token) {
      Alert.alert('Hata', 'Mağaza adı ve access token zorunludur');
      return;
    }

    try {
      setSaving(true);
      if (editingStore) {
        const response = await api.updateShopifyStore(editingStore.id, {
          shop_name: newStore.shop_name,
          access_token: newStore.access_token,
          store_name: newStore.store_name
        });
        if (response.success) {
          Alert.alert('Başarılı', 'Mağaza güncellendi');
        }
      } else {
        const response = await api.addShopifyStore(
          newStore.shop_name,
          newStore.access_token,
          newStore.store_name
        );
        if (response.success) {
          Alert.alert('Başarılı', 'Mağaza eklendi');
        } else {
          Alert.alert('Hata', response.error || 'Mağaza eklenemedi');
          return;
        }
      }
      setShowStoreModal(false);
      fetchShopifyStores();
    } catch (err) {
      Alert.alert('Hata', 'İşlem başarısız');
    } finally {
      setSaving(false);
    }
  };

  const deleteStore = async (storeId) => {
    Alert.alert(
      'Mağazayı Sil',
      'Bu mağazayı silmek istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteShopifyStore(storeId);
              fetchShopifyStores();
            } catch (err) {
              Alert.alert('Hata', 'Mağaza silinemedi');
            }
          }
        }
      ]
    );
  };

  const setDefaultStore = async (storeId) => {
    try {
      await api.setDefaultShopifyStore(storeId);
      fetchShopifyStores();
      Alert.alert('Başarılı', 'Varsayılan mağaza değiştirildi');
    } catch (err) {
      Alert.alert('Hata', 'İşlem başarısız');
    }
  };

  const testStoreConnection = async (storeId) => {
    try {
      setTestingStore(storeId);
      const response = await api.testShopifyStoreConnection(storeId);
      if (response.success) {
        Alert.alert('Başarılı', 'Mağaza bağlantısı başarılı!');
      } else {
        Alert.alert('Hata', response.error || 'Bağlantı başarısız');
      }
    } catch (err) {
      Alert.alert('Hata', 'Bağlantı test edilemedi');
    } finally {
      setTestingStore(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await api.getSettings();
      if (response.success) {
        setSettings(prev => ({ ...prev, ...response.data }));
      }
      setApiUrl(api.baseUrl);
    } catch (err) {
      console.error('Settings fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      const response = await api.updateSettings(settings);
      if (response.success) {
        Alert.alert('Başarılı', 'Ayarlar kaydedildi');
      }
    } catch (err) {
      Alert.alert('Hata', 'Ayarlar kaydedilemedi');
    } finally {
      setSaving(false);
    }
  };

  const testShopify = async () => {
    try {
      Alert.alert('Test', 'Shopify bağlantısı test ediliyor...');
      const response = await api.testShopifyConnection();
      if (response.success) {
        Alert.alert('Başarılı', 'Shopify bağlantısı başarılı!');
      } else {
        Alert.alert('Hata', response.error || 'Bağlantı başarısız');
      }
    } catch (err) {
      Alert.alert('Hata', 'Bağlantı test edilemedi');
    }
  };

  const saveApiUrl = async () => {
    try {
      await api.setApiUrl(apiUrl);
      Alert.alert('Başarılı', 'API URL kaydedildi. Uygulamayı yeniden başlatın.');
    } catch (err) {
      Alert.alert('Hata', 'API URL kaydedilemedi');
    }
  };

  const syncStock = async () => {
    try {
      Alert.alert('Stok Senkronizasyonu', 'Senkronizasyon başlatılıyor...');
      const response = await api.syncStock();
      if (response.success) {
        Alert.alert('Başarılı', response.message);
      }
    } catch (err) {
      Alert.alert('Hata', 'Senkronizasyon başlatılamadı');
    }
  };

  const toggleAutoSync = async (value) => {
    try {
      setSettings(prev => ({ ...prev, auto_stock_sync: value }));
      if (value) {
        await api.startAutoSync();
      } else {
        await api.stopAutoSync();
      }
    } catch (err) {
      console.error('Auto sync toggle error:', err);
    }
  };

  const saveTrendyolCredentials = async () => {
    if (!trendyolEmail || !trendyolPassword) {
      Alert.alert('Hata', 'Email ve şifre alanları zorunludur');
      return;
    }
    
    try {
      setSaving(true);
      const response = await api.saveTrendyolCredentials(trendyolEmail, trendyolPassword);
      if (response.success) {
        Alert.alert('Başarılı', 'Trendyol bilgileri kaydedildi');
        setHasTrendyolCredentials(true);
        setTrendyolEmail('');
        setTrendyolPassword('');
      } else {
        Alert.alert('Hata', response.error || 'Kayıt başarısız');
      }
    } catch (err) {
      Alert.alert('Hata', 'Bilgiler kaydedilemedi');
    } finally {
      setSaving(false);
    }
  };

  const testTrendyolLogin = async () => {
    if (!trendyolEmail || !trendyolPassword) {
      Alert.alert('Hata', 'Test için email ve şifre girin');
      return;
    }
    
    try {
      setTestingTrendyol(true);
      Alert.alert('Test', 'Trendyol girişi test ediliyor...\nBu birkaç saniye sürebilir.');
      const response = await api.testTrendyolLogin(trendyolEmail, trendyolPassword);
      if (response.success) {
        Alert.alert('Başarılı', 'Trendyol girişi başarılı! Bilgileri kaydedebilirsiniz.');
      } else {
        Alert.alert('Hata', response.error || 'Giriş başarısız');
      }
    } catch (err) {
      Alert.alert('Hata', 'Test yapılamadı');
    } finally {
      setTestingTrendyol(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Çıkış Yap',
      'Hesabınızdan çıkış yapmak istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        { 
          text: 'Çıkış Yap', 
          style: 'destructive',
          onPress: () => {
            if (onLogout) {
              onLogout();
            }
          }
        },
      ]
    );
  };

  // Cache Yönetimi
  const clearCache = async () => {
    Alert.alert(
      'Önbelleği Temizle',
      'Tüm önbelleğe alınmış veriler silinecek. Devam etmek istiyor musunuz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Temizle',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.clearCache();
              Alert.alert('Başarılı', 'Önbellek temizlendi');
            } catch (err) {
              Alert.alert('Hata', 'Önbellek temizlenemedi');
            }
          }
        }
      ]
    );
  };

  const showCacheInfo = async () => {
    try {
      const cacheSize = await CacheService.getCacheSize();
      const cacheKeys = await CacheService.getCacheKeys();
      
      Alert.alert(
        'Önbellek Bilgisi',
        `Boyut: ${cacheSize} KB\nÖğe Sayısı: ${cacheKeys.length}`,
        [{ text: 'Tamam' }]
      );
    } catch (err) {
      Alert.alert('Hata', 'Önbellek bilgisi alınamadı');
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>Ayarlar yükleniyor...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Kullanıcı Bilgileri */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="person" size={20} color="#3b82f6" />
          <Text style={styles.sectionTitle}>Hesap Bilgileri</Text>
        </View>
        {user && (
          <View style={styles.userInfo}>
            <View style={styles.userAvatar}>
              <Ionicons name="person" size={32} color="#3b82f6" />
            </View>
            <View style={styles.userDetails}>
              <Text style={styles.userName}>{user.name || 'Kullanıcı'}</Text>
              <Text style={styles.userEmail}>{user.email}</Text>
            </View>
          </View>
        )}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#ef4444" />
          <Text style={styles.logoutButtonText}>Çıkış Yap</Text>
        </TouchableOpacity>
      </View>

      {/* Önbellek Yönetimi */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>💾 Önbellek Yönetimi</Text>
        <Text style={styles.sectionDescription}>
          Önbellek, internet bağlantısı olmadan verileri görüntülemenizi sağlar.
        </Text>
        <View style={styles.cacheButtons}>
          <TouchableOpacity style={styles.cacheButton} onPress={showCacheInfo}>
            <Ionicons name="information-circle-outline" size={20} color="#3b82f6" />
            <Text style={styles.cacheButtonText}>Bilgi Al</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.cacheButton, styles.cacheButtonDanger]} onPress={clearCache}>
            <Ionicons name="trash-outline" size={20} color="#ef4444" />
            <Text style={[styles.cacheButtonText, styles.cacheButtonTextDanger]}>Temizle</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* API Ayarları */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="server" size={20} color="#3b82f6" />
          <Text style={styles.sectionTitle}>API Sunucu Ayarları</Text>
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>API URL</Text>
          <TextInput
            style={styles.input}
            value={apiUrl}
            onChangeText={setApiUrl}
            placeholder="http://192.168.1.100:8000"
            placeholderTextColor="#64748b"
          />
        </View>
        <TouchableOpacity style={styles.secondaryButton} onPress={saveApiUrl}>
          <Text style={styles.secondaryButtonText}>API URL Kaydet</Text>
        </TouchableOpacity>
      </View>

      {/* Shopify Mağazaları */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeader}>
            <Ionicons name="storefront" size={20} color="#3b82f6" />
            <Text style={styles.sectionTitle}>Shopify Mağazaları</Text>
          </View>
          <TouchableOpacity style={styles.addButton} onPress={openAddStoreModal}>
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.addButtonText}>Ekle</Text>
          </TouchableOpacity>
        </View>
        
        {shopifyStores.length === 0 ? (
          <View style={styles.emptyStores}>
            <Ionicons name="storefront-outline" size={40} color="#64748b" />
            <Text style={styles.emptyStoresText}>Henüz mağaza eklenmedi</Text>
            <Text style={styles.emptyStoresSubtext}>Yeni bir Shopify mağazası eklemek için "Ekle" butonuna tıklayın</Text>
          </View>
        ) : (
          <View style={styles.storeList}>
            {shopifyStores.map((store) => (
              <View key={store.id} style={styles.storeCard}>
                <View style={styles.storeHeader}>
                  <View style={styles.storeInfo}>
                    <Text style={styles.storeName}>
                      {store.store_name || store.shop_name}
                    </Text>
                    <Text style={styles.storeUrl}>{store.shop_name}</Text>
                  </View>
                  <View style={styles.storeBadges}>
                    {store.is_default ? (
                      <View style={styles.defaultBadge}>
                        <Text style={styles.defaultBadgeText}>Varsayılan</Text>
                      </View>
                    ) : null}
                    {store.is_active ? (
                      <View style={styles.activeBadge}>
                        <Ionicons name="checkmark-circle" size={14} color="#10b981" />
                      </View>
                    ) : (
                      <View style={styles.inactiveBadge}>
                        <Ionicons name="close-circle" size={14} color="#ef4444" />
                      </View>
                    )}
                  </View>
                </View>
                <View style={styles.storeActions}>
                  <TouchableOpacity 
                    style={styles.storeActionBtn} 
                    onPress={() => testStoreConnection(store.id)}
                  >
                    <Ionicons 
                      name={testingStore === store.id ? "hourglass" : "flash-outline"} 
                      size={16} 
                      color="#f59e0b" 
                    />
                  </TouchableOpacity>
                  {!store.is_default && (
                    <TouchableOpacity 
                      style={styles.storeActionBtn} 
                      onPress={() => setDefaultStore(store.id)}
                    >
                      <Ionicons name="star-outline" size={16} color="#3b82f6" />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity 
                    style={styles.storeActionBtn} 
                    onPress={() => openEditStoreModal(store)}
                  >
                    <Ionicons name="pencil-outline" size={16} color="#64748b" />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.storeActionBtn} 
                    onPress={() => deleteStore(store.id)}
                  >
                    <Ionicons name="trash-outline" size={16} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Trendyol Hesap Bilgileri */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="bag-handle" size={20} color="#3b82f6" />
          <Text style={styles.sectionTitle}>Trendyol Hesap Bilgileri</Text>
        </View>
        <Text style={styles.sectionDescription}>
          Siparişleri Trendyol'da otomatik işlemek için hesap bilgilerinizi girin.
        </Text>
        
        {hasTrendyolCredentials && (
          <View style={styles.credentialsSaved}>
            <Ionicons name="checkmark-circle" size={20} color="#10b981" />
            <Text style={styles.credentialsSavedText}>Trendyol hesabı kayıtlı</Text>
          </View>
        )}
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Trendyol Email</Text>
          <TextInput
            style={styles.input}
            value={trendyolEmail}
            onChangeText={setTrendyolEmail}
            placeholder="ornek@email.com"
            placeholderTextColor="#64748b"
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Trendyol Şifre</Text>
          <TextInput
            style={styles.input}
            value={trendyolPassword}
            onChangeText={setTrendyolPassword}
            placeholder="••••••••"
            placeholderTextColor="#64748b"
            secureTextEntry
          />
        </View>
        
        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={[styles.testButton, testingTrendyol && styles.buttonDisabled]} 
            onPress={testTrendyolLogin}
            disabled={testingTrendyol}
          >
            <Ionicons name="flash" size={18} color="#f59e0b" />
            <Text style={styles.testButtonText}>
              {testingTrendyol ? 'Test Ediliyor...' : 'Test Et'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.saveCredentialsButton, saving && styles.buttonDisabled]} 
            onPress={saveTrendyolCredentials}
            disabled={saving}
          >
            <Ionicons name="save" size={18} color="#fff" />
            <Text style={styles.saveCredentialsButtonText}>Kaydet</Text>
          </TouchableOpacity>
        </View>
        
        <Text style={styles.warningText}>
          [GÜVENLİK] Şifreniz güvenli bir şekilde saklanır ve sadece sipariş işlemek için kullanılır.
        </Text>
      </View>

      {/* Fiyatlandırma */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="cash" size={20} color="#3b82f6" />
          <Text style={styles.sectionTitle}>Fiyatlandırma</Text>
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Kar Marjı (%)</Text>
          <TextInput
            style={[styles.input, styles.smallInput]}
            value={String(settings.profit_margin)}
            onChangeText={(text) => setSettings(prev => ({ ...prev, profit_margin: parseFloat(text) || 0 }))}
            keyboardType="numeric"
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Kur Tamponu (%)</Text>
          <TextInput
            style={[styles.input, styles.smallInput]}
            value={String(settings.currency_buffer)}
            onChangeText={(text) => setSettings(prev => ({ ...prev, currency_buffer: parseFloat(text) || 0 }))}
            keyboardType="numeric"
          />
        </View>
      </View>

      {/* Stok Senkronizasyonu */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="pulse" size={20} color="#3b82f6" />
          <Text style={styles.sectionTitle}>Canlı Stok Takibi</Text>
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Senkronizasyon Aralığı (dk)</Text>
          <TextInput
            style={[styles.input, styles.smallInput]}
            value={String(settings.stock_sync_interval)}
            onChangeText={(text) => setSettings(prev => ({ ...prev, stock_sync_interval: parseInt(text) || 30 }))}
            keyboardType="numeric"
          />
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Otomatik Stok Senkronizasyonu</Text>
          <Switch
            value={settings.auto_stock_sync}
            onValueChange={toggleAutoSync}
            trackColor={{ false: '#2a2a3e', true: '#10b981' }}
            thumbColor="#fff"
          />
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Fiyat Değişikliğinde Güncelle</Text>
          <Switch
            value={settings.auto_price_update}
            onValueChange={(value) => setSettings(prev => ({ ...prev, auto_price_update: value }))}
            trackColor={{ false: '#2a2a3e', true: '#10b981' }}
            thumbColor="#fff"
          />
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Stokta Yoksa Gizle</Text>
          <Switch
            value={settings.hide_out_of_stock}
            onValueChange={(value) => setSettings(prev => ({ ...prev, hide_out_of_stock: value }))}
            trackColor={{ false: '#2a2a3e', true: '#10b981' }}
            thumbColor="#fff"
          />
        </View>

        <TouchableOpacity style={styles.syncButton} onPress={syncStock}>
          <Ionicons name="sync" size={20} color="#fff" />
          <Text style={styles.syncButtonText}>Şimdi Senkronize Et</Text>
        </TouchableOpacity>
      </View>

      {/* Kaydet Butonu */}
      <TouchableOpacity 
        style={[styles.saveButton, saving && styles.saveButtonDisabled]} 
        onPress={saveSettings}
        disabled={saving}
      >
        <Ionicons name="save" size={24} color="#fff" />
        <Text style={styles.saveButtonText}>
          {saving ? 'Kaydediliyor...' : 'Ayarları Kaydet'}
        </Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />

      {/* Mağaza Ekleme/Düzenleme Modal */}
      <Modal
        visible={showStoreModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowStoreModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingStore ? 'Mağaza Düzenle' : 'Yeni Mağaza Ekle'}
              </Text>
              <TouchableOpacity onPress={() => setShowStoreModal(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Mağaza Takma Adı (Opsiyonel)</Text>
                <TextInput
                  style={styles.input}
                  value={newStore.store_name}
                  onChangeText={(text) => setNewStore(prev => ({ ...prev, store_name: text }))}
                  placeholder="Örn: Ana Mağazam"
                  placeholderTextColor="#64748b"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Shopify Mağaza URL *</Text>
                <TextInput
                  style={styles.input}
                  value={newStore.shop_name}
                  onChangeText={(text) => setNewStore(prev => ({ ...prev, shop_name: text }))}
                  placeholder="ornek.myshopify.com"
                  placeholderTextColor="#64748b"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Access Token *</Text>
                <TextInput
                  style={styles.input}
                  value={newStore.access_token}
                  onChangeText={(text) => setNewStore(prev => ({ ...prev, access_token: text }))}
                  placeholder="shpat_xxxxx"
                  placeholderTextColor="#64748b"
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.cancelButton} 
                onPress={() => setShowStoreModal(false)}
              >
                <Text style={styles.cancelButtonText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalSaveButton, saving && styles.buttonDisabled]} 
                onPress={saveStore}
                disabled={saving}
              >
                <Ionicons name="save" size={18} color="#fff" />
                <Text style={styles.modalSaveButtonText}>
                  {saving ? 'Kaydediliyor...' : 'Kaydet'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f0f1a',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
  },
  section: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  inputGroup: {
    marginBottom: 12,
  },
  label: {
    color: '#a0aec0',
    fontSize: 14,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#2a2a3e',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
  },
  smallInput: {
    width: 100,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2a2a3e',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  secondaryButtonText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a3e',
  },
  switchLabel: {
    color: '#fff',
    fontSize: 14,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  syncButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  userAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2a2a3e',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  userEmail: {
    color: '#64748b',
    fontSize: 14,
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  logoutButtonText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  sectionDescription: {
    color: '#64748b',
    fontSize: 13,
    marginBottom: 16,
    lineHeight: 18,
  },
  credentialsSaved: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  credentialsSavedText: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  testButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  testButtonText: {
    color: '#f59e0b',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  saveCredentialsButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    padding: 12,
    borderRadius: 8,
  },
  saveCredentialsButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  warningText: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 16,
    fontStyle: 'italic',
  },
  // Mağaza yönetimi stilleri
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  emptyStores: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyStoresText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 12,
  },
  emptyStoresSubtext: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  storeList: {
    gap: 12,
  },
  storeCard: {
    backgroundColor: '#252540',
    borderRadius: 10,
    padding: 12,
  },
  storeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  storeInfo: {
    flex: 1,
  },
  storeName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  storeUrl: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
  },
  storeBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  defaultBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  defaultBadgeText: {
    color: '#3b82f6',
    fontSize: 10,
    fontWeight: 'bold',
  },
  activeBadge: {
    marginLeft: 4,
  },
  inactiveBadge: {
    marginLeft: 4,
  },
  storeActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    gap: 8,
  },
  storeActionBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 8,
    borderRadius: 6,
  },
  // Modal stilleri
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#252540',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalBody: {
    padding: 16,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#252540',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#64748b',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalSaveButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#3b82f6',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  modalSaveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  // Cache yönetimi stilleri
  sectionDescription: {
    color: '#a0aec0',
    fontSize: 13,
    marginBottom: 16,
    lineHeight: 20,
  },
  cacheButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cacheButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2a2a3e',
    padding: 14,
    borderRadius: 8,
    gap: 8,
  },
  cacheButtonDanger: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  cacheButtonText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '600',
  },
  cacheButtonTextDanger: {
    color: '#ef4444',
  },
});
