import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import { OrderCardSkeleton, ListSkeleton } from '../components/SkeletonLoader';
import websocketService, { EventTypes } from '../services/websocket';

const statusColors = {
  pending: '#f59e0b',
  processing: '#3b82f6',
  pending_payment: '#8b5cf6',
  purchased: '#06b6d4',
  shipped: '#0ea5e9',
  delivered: '#10b981',
  cancelled: '#ef4444',
  error: '#ef4444',
  partial: '#f97316',
};

const statusLabels = {
  pending: 'Bekliyor',
  processing: 'İşleniyor',
  pending_payment: 'Ödeme Bekliyor',
  purchased: 'Satın Alındı',
  shipped: 'Kargoda',
  delivered: 'Teslim Edildi',
  cancelled: 'İptal',
  error: 'Hata',
  partial: 'Kısmi',
};

const OrderCard = ({ order, onPress, onProcessTrendyol, processingOrderId, onAddShipment }) => {
  const statusColor = statusColors[order.status] || '#64748b';
  const statusLabel = statusLabels[order.status] || order.status;
  const isProcessing = processingOrderId === order.id;
  const canProcess = order.status === 'pending';
  const canAddShipment = order.status === 'purchased' || order.status === 'processing';
  const hasShipment = order.status === 'shipped' && order.tracking_number;

  return (
    <TouchableOpacity style={styles.orderCard} onPress={onPress}>
      <View style={styles.orderHeader}>
        <View style={styles.orderNumber}>
          <Ionicons name="receipt" size={20} color="#3b82f6" />
          <Text style={styles.orderNumberText}>#{order.shopify_order_number}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
          <Text style={styles.statusText}>{statusLabel}</Text>
        </View>
      </View>

      <View style={styles.orderBody}>
        <View style={styles.orderRow}>
          <Ionicons name="person" size={16} color="#a0aec0" />
          <Text style={styles.orderLabel}>{order.customer_name}</Text>
        </View>
        <View style={styles.orderRow}>
          <Ionicons name="mail" size={16} color="#a0aec0" />
          <Text style={styles.orderLabel}>{order.customer_email}</Text>
        </View>
        <View style={styles.orderRow}>
          <Ionicons name="cube" size={16} color="#a0aec0" />
          <Text style={styles.orderLabel}>{order.order_items?.length || 0} ürün</Text>
        </View>
        {order.notes && (
          <View style={styles.orderRow}>
            <Ionicons name="document-text" size={16} color="#f59e0b" />
            <Text style={[styles.orderLabel, { color: '#f59e0b' }]} numberOfLines={1}>
              {order.notes}
            </Text>
          </View>
        )}
        {/* Kargo Bilgisi */}
        {hasShipment && (
          <View style={styles.shipmentInfo}>
            <Ionicons name="airplane" size={16} color="#0ea5e9" />
            <Text style={styles.shipmentText}>
              {order.carrier_name} - {order.tracking_number}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.orderFooter}>
        <Text style={styles.orderDate}>{order.created_at}</Text>
        <Text style={styles.orderTotal}>${order.total_price?.toFixed(2)}</Text>
      </View>

      {/* Trendyol'da İşle Butonu */}
      {canProcess && (
        <TouchableOpacity 
          style={styles.processButton}
          onPress={() => onProcessTrendyol(order.id)}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="cart" size={18} color="#fff" />
              <Text style={styles.processButtonText}>Trendyol'da İşle</Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {/* Kargo Ekle Butonu */}
      {canAddShipment && (
        <TouchableOpacity 
          style={styles.shipmentButton}
          onPress={() => onAddShipment(order)}
        >
          <Ionicons name="airplane" size={18} color="#fff" />
          <Text style={styles.shipmentButtonText}>Kargo Ekle</Text>
        </TouchableOpacity>
      )}

      {/* Ödeme bekliyor uyarısı */}
      {order.status === 'pending_payment' && (
        <View style={styles.paymentWarning}>
          <Ionicons name="warning" size={16} color="#8b5cf6" />
          <Text style={styles.paymentWarningText}>
            Trendyol'da ödeme yapmanız bekleniyor
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

export default function OrdersScreen({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState(null);
  const [processingOrderId, setProcessingOrderId] = useState(null);
  const [hasTrendyolCredentials, setHasTrendyolCredentials] = useState(false);
  
  // Kargo modal state'leri
  const [showShipmentModal, setShowShipmentModal] = useState(false);
  const [selectedOrderForShipment, setSelectedOrderForShipment] = useState(null);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [selectedCarrier, setSelectedCarrier] = useState('yurtici');
  const [carriers, setCarriers] = useState([]);
  const [savingShipment, setSavingShipment] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      const response = await api.getOrders(filter);
      if (response.success) {
        setOrders(response.data);
      }
    } catch (err) {
      console.error('Orders fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

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

  const fetchCarriers = async () => {
    try {
      const response = await api.getCarriers();
      if (response.success) {
        setCarriers(response.data);
      }
    } catch (err) {
      console.error('Carriers fetch error:', err);
    }
  };

  useEffect(() => {
    fetchOrders();
    checkTrendyolCredentials();
    fetchCarriers();
    
    // WebSocket real-time listeners
    const unsubscribers = [
      // Yeni sipariş oluşturulduğunda
      websocketService.on(EventTypes.ORDER_CREATED, (data) => {
        console.log('🛍️ Real-time: Yeni sipariş oluşturuldu', data);
        fetchOrders(); // Listeyi yenile
      }),
      
      // Sipariş güncellendiğinde
      websocketService.on(EventTypes.ORDER_UPDATED, (data) => {
        console.log('📝 Real-time: Sipariş güncellendi', data);
        fetchOrders();
      }),
      
      // Sipariş durumu değiştiğinde
      websocketService.on(EventTypes.ORDER_STATUS_CHANGED, (data) => {
        console.log('📦 Real-time: Sipariş durumu değişti', data);
        fetchOrders();
      }),
      
      // Sipariş işlendiğinde
      websocketService.on(EventTypes.ORDER_PROCESSED, (data) => {
        console.log('✅ Real-time: Sipariş işlendi', data);
        fetchOrders();
      }),
    ];
    
    // Cleanup
    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [fetchOrders]);
  
  // Kargo modal açma
  const openShipmentModal = (order) => {
    setSelectedOrderForShipment(order);
    setTrackingNumber('');
    setSelectedCarrier('yurtici');
    setShowShipmentModal(true);
  };
  
  // Kargo bilgisi kaydetme
  const saveShipment = async () => {
    if (!trackingNumber.trim()) {
      Alert.alert('Hata', 'Lütfen takip numarası girin');
      return;
    }
    
    setSavingShipment(true);
    try {
      const response = await api.addShipmentToOrder(selectedOrderForShipment.id, {
        tracking_number: trackingNumber.trim(),
        carrier: selectedCarrier
      });
      
      if (response.success) {
        Alert.alert('Başarılı', 'Kargo bilgisi eklendi');
        setShowShipmentModal(false);
        onRefresh();
      } else {
        Alert.alert('Hata', response.error || 'Kargo eklenemedi');
      }
    } catch (err) {
      Alert.alert('Hata', 'Kargo eklenirken bir hata oluştu');
    } finally {
      setSavingShipment(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrders();
  }, [fetchOrders]);

  const fetchFromShopify = async () => {
    try {
      Alert.alert('Siparişler', 'Shopify\'dan siparişler çekiliyor...');
      const response = await api.fetchOrdersFromShopify();
      if (response.success) {
        Alert.alert('Başarılı', response.message);
        onRefresh();
      }
    } catch (err) {
      Alert.alert('Hata', 'Siparişler çekilemedi');
    }
  };

  const processOrderToTrendyol = async (orderId) => {
    if (!hasTrendyolCredentials) {
      Alert.alert(
        'Trendyol Hesabı Gerekli',
        'Siparişleri Trendyol\'da işlemek için önce Trendyol hesap bilgilerinizi kaydetmeniz gerekiyor.',
        [
          { text: 'İptal', style: 'cancel' },
          { text: 'Ayarlara Git', onPress: () => navigation.navigate('Ayarlar') }
        ]
      );
      return;
    }

    Alert.alert(
      'Siparişi İşle',
      'Bu siparişi Trendyol\'da işlemek istediğinizden emin misiniz?\n\nÜrünler otomatik sepete eklenecek ve ödeme sayfasına yönlendirileceksiniz.',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'İşle',
          onPress: async () => {
            setProcessingOrderId(orderId);
            try {
              const response = await api.processOrderToTrendyol(orderId);
              if (response.success) {
                Alert.alert('Başarılı', response.message);
                onRefresh();
              } else {
                Alert.alert('Hata', response.error || 'Sipariş işlenemedi');
              }
            } catch (err) {
              Alert.alert('Hata', 'Sipariş işlenirken bir hata oluştu');
            } finally {
              setProcessingOrderId(null);
            }
          }
        }
      ]
    );
  };

  const FilterButton = ({ status, label }) => (
    <TouchableOpacity
      style={[styles.filterButton, filter === status && styles.filterButtonActive]}
      onPress={() => setFilter(filter === status ? null : status)}
    >
      <Text style={[styles.filterButtonText, filter === status && styles.filterButtonTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>Siparişler yükleniyor...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Üst Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.fetchButton} onPress={fetchFromShopify}>
          <Ionicons name="download" size={20} color="#fff" />
          <Text style={styles.fetchButtonText}>Shopify'dan Çek</Text>
        </TouchableOpacity>
      </View>

      {/* Filtreler */}
      <View style={styles.filterRow}>
        <FilterButton status={null} label="Tümü" />
        <FilterButton status="pending" label="Bekleyen" />
        <FilterButton status="shipped" label="Kargoda" />
        <FilterButton status="delivered" label="Teslim" />
      </View>

      {/* Sipariş Listesi */}
      {loading && orders.length === 0 ? (
        <ListSkeleton count={5} ItemSkeleton={OrderCardSkeleton} />
      ) : orders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="cart-outline" size={64} color="#64748b" />
          <Text style={styles.emptyText}>Henüz sipariş yok</Text>
          <Text style={styles.emptySubtext}>Shopify'dan siparişleri çekmek için yukarıdaki butonu kullanın</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <OrderCard
              order={item}
              onPress={() => navigation.navigate('OrderDetail', { orderId: item.id })}
              onProcessTrendyol={processOrderToTrendyol}
              processingOrderId={processingOrderId}
              onAddShipment={openShipmentModal}
            />
          )}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />
          }
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Kargo Ekleme Modal */}
      <Modal
        visible={showShipmentModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowShipmentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Kargo Bilgisi Ekle</Text>
              <TouchableOpacity onPress={() => setShowShipmentModal(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            
            {selectedOrderForShipment && (
              <Text style={styles.modalSubtitle}>
                Sipariş #{selectedOrderForShipment.shopify_order_number}
              </Text>
            )}

            <Text style={styles.inputLabel}>Kargo Firması</Text>
            <View style={styles.carrierContainer}>
              {carriers.map((carrier) => (
                <TouchableOpacity
                  key={carrier.id}
                  style={[
                    styles.carrierButton,
                    selectedCarrier === carrier.id && styles.carrierButtonActive
                  ]}
                  onPress={() => setSelectedCarrier(carrier.id)}
                >
                  <Text style={[
                    styles.carrierButtonText,
                    selectedCarrier === carrier.id && styles.carrierButtonTextActive
                  ]}>
                    {carrier.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Takip Numarası</Text>
            <TextInput
              style={styles.textInput}
              value={trackingNumber}
              onChangeText={setTrackingNumber}
              placeholder="Kargo takip numarasını girin"
              placeholderTextColor="#64748b"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setShowShipmentModal(false)}
              >
                <Text style={styles.cancelButtonText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.saveButton}
                onPress={saveShipment}
                disabled={savingShipment}
              >
                {savingShipment ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Kaydet</Text>
                )}
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
    paddingBottom: 75,
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
  topBar: {
    padding: 16,
    backgroundColor: '#1a1a2e',
  },
  fetchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8b5cf6',
    padding: 12,
    borderRadius: 8,
  },
  fetchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  filterRow: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#1a1a2e',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#2a2a3e',
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: '#3b82f6',
  },
  filterButtonText: {
    color: '#a0aec0',
    fontSize: 12,
    fontWeight: 'bold',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  listContent: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    color: '#fff',
    fontSize: 18,
    marginTop: 16,
  },
  emptySubtext: {
    color: '#64748b',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  orderCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderNumber: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderNumberText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  orderBody: {
    borderTopWidth: 1,
    borderTopColor: '#2a2a3e',
    paddingTop: 12,
  },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  orderLabel: {
    color: '#a0aec0',
    fontSize: 14,
    marginLeft: 8,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#2a2a3e',
  },
  orderDate: {
    color: '#64748b',
    fontSize: 12,
  },
  orderTotal: {
    color: '#10b981',
    fontSize: 18,
    fontWeight: 'bold',
  },
  processButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f97316',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  processButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  paymentWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  paymentWarningText: {
    color: '#8b5cf6',
    fontSize: 12,
    marginLeft: 8,
    flex: 1,
  },
  // Kargo buton stilleri
  shipmentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0ea5e9',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  shipmentButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  shipmentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(14, 165, 233, 0.1)',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  shipmentText: {
    color: '#0ea5e9',
    fontSize: 12,
    marginLeft: 8,
  },
  // Modal stilleri
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1a1a2e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalSubtitle: {
    color: '#a0aec0',
    fontSize: 14,
    marginBottom: 20,
  },
  inputLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  carrierContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  carrierButton: {
    backgroundColor: '#2a2a3e',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  carrierButtonActive: {
    backgroundColor: '#3b82f6',
  },
  carrierButtonText: {
    color: '#a0aec0',
    fontSize: 12,
  },
  carrierButtonTextActive: {
    color: '#fff',
  },
  textInput: {
    backgroundColor: '#2a2a3e',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#2a2a3e',
    padding: 14,
    borderRadius: 8,
    marginRight: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#a0aec0',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#3b82f6',
    padding: 14,
    borderRadius: 8,
    marginLeft: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
