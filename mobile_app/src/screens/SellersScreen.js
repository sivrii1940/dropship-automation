import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import websocketService, { EventTypes } from '../services/websocket';

export default function SellersScreen() {
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [newSeller, setNewSeller] = useState({
    name: '',
    url: '',
    note: '',
  });
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    fetchSellers();
    
    // WebSocket real-time listeners
    const unsubscribers = [
      // Yeni satıcı eklendiğinde
      websocketService.on(EventTypes.SELLER_ADDED, (data) => {
        console.log('🏪 Real-time: Yeni satıcı eklendi', data);
        fetchSellers(); // Listeyi yenile
      }),
      
      // Satıcı güncellendiğinde
      websocketService.on(EventTypes.SELLER_UPDATED, (data) => {
        console.log('📝 Real-time: Satıcı güncellendi', data);
        fetchSellers();
      }),
      
      // Satıcı silindiğinde
      websocketService.on(EventTypes.SELLER_DELETED, (data) => {
        console.log('🗑️ Real-time: Satıcı silindi', data);
        fetchSellers();
      }),
      
      // Satıcının ürünleri çekildiğinde
      websocketService.on(EventTypes.SELLER_PRODUCTS_FETCHED, (data) => {
        console.log('📦 Real-time: Satıcı ürünleri çekildi', data);
        fetchSellers(); // Ürün sayısı güncellensin
      }),
    ];
    
    // Cleanup
    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
    
    // Cleanup
    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, []);

  const fetchSellers = async () => {
    try {
      const response = await api.getSellers();
      if (response.success) {
        setSellers(response.data);
      }
    } catch (err) {
      Alert.alert('Hata', 'Satıcılar yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const addSeller = async () => {
    if (!newSeller.name.trim() || !newSeller.url.trim()) {
      Alert.alert('Hata', 'Satıcı adı ve URL gereklidir');
      return;
    }

    try {
      const response = await api.addSeller(newSeller);
      if (response.success) {
        // Modal'ı kapat ve formu temizle
        setModalVisible(false);
        setNewSeller({ name: '', url: '', note: '' });
        
        // Satıcı listesini API'den yeniden çek
        await fetchSellers();
        
        Alert.alert('Başarılı', 'Satıcı eklendi ve ürünler çekiliyor...');
      }
    } catch (err) {
      Alert.alert('Hata', err.message || 'Satıcı eklenemedi');
      console.error('Add seller error:', err);
    }
  };

  const deleteSeller = (sellerId, sellerName) => {
    Alert.alert(
      'Satıcıyı Sil',
      `"${sellerName}" satıcısını silmek istediğinize emin misiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteSeller(sellerId);
              setSellers(prev => prev.filter(s => s.id !== sellerId));
            } catch (err) {
              Alert.alert('Hata', 'Satıcı silinemedi');
            }
          },
        },
      ]
    );
  };

  const syncSellerProducts = async (sellerId, sellerName) => {
    Alert.alert('Senkronizasyon', `${sellerName} ürünleri senkronize ediliyor...`);
    try {
      const response = await api.syncSellerProducts(sellerId);
      if (response.success) {
        Alert.alert('Başarılı', `${response.synced_count} ürün senkronize edildi`);
        fetchSellers(); // Refresh to update product counts
      }
    } catch (err) {
      Alert.alert('Hata', 'Senkronizasyon başarısız');
    }
  };

  const filteredSellers = sellers.filter(seller =>
    seller.name.toLowerCase().includes(searchText.toLowerCase())
  );

  const renderSeller = ({ item }) => (
    <View style={styles.sellerCard}>
      <View style={styles.sellerHeader}>
        <View style={styles.sellerInfo}>
          <Text style={styles.sellerName}>{item.name}</Text>
          <Text style={styles.sellerUrl} numberOfLines={1}>{item.url}</Text>
        </View>
        <View style={styles.sellerStats}>
          <View style={styles.statBadge}>
            <Ionicons name="cube" size={14} color="#3b82f6" />
            <Text style={styles.statText}>{item.product_count || 0}</Text>
          </View>
        </View>
      </View>

      {item.note ? (
        <Text style={styles.sellerNote}>{item.note}</Text>
      ) : null}

      <View style={styles.sellerActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => syncSellerProducts(item.id, item.name)}
        >
          <Ionicons name="sync" size={18} color="#10b981" />
          <Text style={[styles.actionText, { color: '#10b981' }]}>Senkronize Et</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => deleteSeller(item.id, item.name)}
        >
          <Ionicons name="trash" size={18} color="#ef4444" />
          <Text style={[styles.actionText, { color: '#ef4444' }]}>Sil</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Satıcılar yükleniyor...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#64748b" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Satıcı ara..."
            placeholderTextColor="#64748b"
          />
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{sellers.length}</Text>
          <Text style={styles.statLabel}>Toplam Satıcı</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {sellers.reduce((sum, s) => sum + (s.product_count || 0), 0)}
          </Text>
          <Text style={styles.statLabel}>Toplam Ürün</Text>
        </View>
      </View>

      {/* Sellers List */}
      <FlatList
        data={filteredSellers}
        renderItem={renderSeller}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="storefront-outline" size={64} color="#64748b" />
            <Text style={styles.emptyText}>Henüz satıcı eklenmemiş</Text>
            <Text style={styles.emptySubtext}>
              + butonuna tıklayarak yeni Trendyol satıcısı ekleyin
            </Text>
          </View>
        }
      />

      {/* Add Seller Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Yeni Satıcı Ekle</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Satıcı Adı *</Text>
              <TextInput
                style={styles.input}
                value={newSeller.name}
                onChangeText={(text) => setNewSeller(prev => ({ ...prev, name: text }))}
                placeholder="Örn: TrendyolExpress"
                placeholderTextColor="#64748b"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Trendyol Mağaza URL *</Text>
              <TextInput
                style={styles.input}
                value={newSeller.url}
                onChangeText={(text) => setNewSeller(prev => ({ ...prev, url: text }))}
                placeholder="https://www.trendyol.com/magaza/xxx"
                placeholderTextColor="#64748b"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Not (Opsiyonel)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={newSeller.note}
                onChangeText={(text) => setNewSeller(prev => ({ ...prev, note: text }))}
                placeholder="Satıcı hakkında notlar..."
                placeholderTextColor="#64748b"
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={addSeller}
              >
                <Text style={styles.submitButtonText}>Ekle</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f0f1a',
  },
  loadingText: {
    color: '#fff',
    marginTop: 12,
  },
  header: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
    gap: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    paddingVertical: 12,
    fontSize: 16,
  },
  addButton: {
    backgroundColor: '#3b82f6',
    width: 48,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 4,
  },
  listContainer: {
    padding: 16,
    paddingTop: 0,
  },
  sellerCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  sellerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  sellerInfo: {
    flex: 1,
  },
  sellerName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  sellerUrl: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 4,
  },
  sellerStats: {
    flexDirection: 'row',
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a3e',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statText: {
    color: '#3b82f6',
    fontSize: 12,
    marginLeft: 4,
    fontWeight: 'bold',
  },
  sellerNote: {
    color: '#a0aec0',
    fontSize: 13,
    marginTop: 8,
    fontStyle: 'italic',
  },
  sellerActions: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#2a2a3e',
    gap: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionText: {
    fontSize: 14,
    marginLeft: 6,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: '#fff',
    fontSize: 18,
    marginTop: 16,
    fontWeight: 'bold',
  },
  emptySubtext: {
    color: '#64748b',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1a1a2e',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    color: '#a0aec0',
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#2a2a3e',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#2a2a3e',
  },
  cancelButtonText: {
    color: '#a0aec0',
    fontWeight: 'bold',
    fontSize: 16,
  },
  submitButton: {
    backgroundColor: '#3b82f6',
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
