import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';

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

export default function OrderDetailScreen({ route, navigation }) {
  const { orderId } = route.params;
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    fetchOrderDetail();
  }, [orderId]);

  const fetchOrderDetail = async () => {
    try {
      setLoading(true);
      const response = await api.getOrder(orderId);
      if (response.success) {
        setOrder(response.data);
      } else {
        Alert.alert('Hata', 'Sipariş detayı yüklenemedi');
      }
    } catch (err) {
      console.error('Order detail fetch error:', err);
      Alert.alert('Hata', 'Sipariş detayı yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (newStatus) => {
    Alert.alert(
      'Durum Güncelleme',
      `Sipariş durumunu "${statusLabels[newStatus]}" olarak değiştirmek istiyor musunuz?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Güncelle',
          onPress: async () => {
            try {
              setUpdatingStatus(true);
              const response = await api.updateOrderStatus(orderId, newStatus);
              if (response.success) {
                Alert.alert('Başarılı', 'Sipariş durumu güncellendi');
                fetchOrderDetail();
              } else {
                Alert.alert('Hata', response.error || 'Durum güncellenemedi');
              }
            } catch (err) {
              Alert.alert('Hata', 'Durum güncellenemedi');
            } finally {
              setUpdatingStatus(false);
            }
          }
        }
      ]
    );
  };

  const openTrackingUrl = () => {
    if (order?.tracking_url) {
      Linking.openURL(order.tracking_url).catch(() => {
        Alert.alert('Hata', 'Takip URL\'i açılamadı');
      });
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Sipariş detayı yükleniyor...</Text>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle" size={64} color="#ef4444" />
        <Text style={styles.errorText}>Sipariş bulunamadı</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Geri Dön</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statusColor = statusColors[order.status] || '#64748b';
  const statusLabel = statusLabels[order.status] || order.status;

  return (
    <ScrollView style={styles.container}>
      {/* Header Card */}
      <View style={styles.headerCard}>
        <View style={styles.orderHeader}>
          <View>
            <Text style={styles.orderNumber}>Sipariş #{order.shopify_order_number}</Text>
            <Text style={styles.orderDate}>{order.created_at}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{statusLabel}</Text>
          </View>
        </View>
      </View>

      {/* Müşteri Bilgileri */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="person" size={20} color="#3b82f6" />
          <Text style={styles.sectionTitle}>Müşteri Bilgileri</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Ad Soyad:</Text>
          <Text style={styles.infoValue}>{order.customer_name}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Email:</Text>
          <Text style={styles.infoValue}>{order.customer_email}</Text>
        </View>
        {order.customer_phone && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Telefon:</Text>
            <Text style={styles.infoValue}>{order.customer_phone}</Text>
          </View>
        )}
      </View>

      {/* Teslimat Adresi */}
      {order.shipping_address && Object.keys(order.shipping_address).length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="location" size={20} color="#3b82f6" />
            <Text style={styles.sectionTitle}>Teslimat Adresi</Text>
          </View>
          <Text style={styles.addressText}>
            {order.shipping_address.address1}
            {order.shipping_address.address2 && `\n${order.shipping_address.address2}`}
            {'\n'}
            {order.shipping_address.city}, {order.shipping_address.province}
            {'\n'}
            {order.shipping_address.zip} - {order.shipping_address.country}
          </Text>
        </View>
      )}

      {/* Kargo Bilgisi */}
      {order.tracking_number && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="airplane" size={20} color="#0ea5e9" />
            <Text style={styles.sectionTitle}>Kargo Bilgisi</Text>
          </View>
          <View style={styles.shipmentInfo}>
            <View style={styles.shipmentRow}>
              <Text style={styles.infoLabel}>Kargo Firması:</Text>
              <Text style={styles.infoValue}>{order.carrier_name || 'Belirtilmemiş'}</Text>
            </View>
            <View style={styles.shipmentRow}>
              <Text style={styles.infoLabel}>Takip No:</Text>
              <Text style={styles.infoValue}>{order.tracking_number}</Text>
            </View>
            {order.tracking_url && (
              <TouchableOpacity style={styles.trackingButton} onPress={openTrackingUrl}>
                <Ionicons name="open-outline" size={18} color="#fff" />
                <Text style={styles.trackingButtonText}>Kargoyu Takip Et</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Ürünler */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="cube" size={20} color="#3b82f6" />
          <Text style={styles.sectionTitle}>Ürünler ({order.order_items?.length || 0})</Text>
        </View>
        {order.order_items && order.order_items.map((item, index) => (
          <View key={index} style={styles.productItem}>
            <View style={styles.productInfo}>
              <Text style={styles.productName}>{item.name}</Text>
              {item.variant_title && item.variant_title !== 'Default Title' && (
                <Text style={styles.productVariant}>{item.variant_title}</Text>
              )}
              <Text style={styles.productQuantity}>Adet: {item.quantity}</Text>
            </View>
            <Text style={styles.productPrice}>${item.price?.toFixed(2)}</Text>
          </View>
        ))}
      </View>

      {/* Fiyat Bilgileri */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="cash" size={20} color="#10b981" />
          <Text style={styles.sectionTitle}>Fiyat Detayları</Text>
        </View>
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Ara Toplam:</Text>
          <Text style={styles.priceValue}>${order.subtotal_price?.toFixed(2)}</Text>
        </View>
        {order.shipping_price > 0 && (
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Kargo:</Text>
            <Text style={styles.priceValue}>${order.shipping_price?.toFixed(2)}</Text>
          </View>
        )}
        <View style={[styles.priceRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>Toplam:</Text>
          <Text style={styles.totalValue}>${order.total_price?.toFixed(2)}</Text>
        </View>
      </View>

      {/* Notlar */}
      {order.notes && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="document-text" size={20} color="#f59e0b" />
            <Text style={styles.sectionTitle}>Notlar</Text>
          </View>
          <Text style={styles.notesText}>{order.notes}</Text>
        </View>
      )}

      {/* Durum Değiştirme Butonları */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="settings" size={20} color="#8b5cf6" />
          <Text style={styles.sectionTitle}>İşlemler</Text>
        </View>
        <View style={styles.actionsContainer}>
          {order.status === 'pending' && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#3b82f6' }]}
              onPress={() => updateOrderStatus('processing')}
              disabled={updatingStatus}
            >
              {updatingStatus ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="time" size={18} color="#fff" />
                  <Text style={styles.actionButtonText}>İşleme Al</Text>
                </>
              )}
            </TouchableOpacity>
          )}
          
          {(order.status === 'processing' || order.status === 'purchased') && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#0ea5e9' }]}
              onPress={() => updateOrderStatus('shipped')}
              disabled={updatingStatus}
            >
              {updatingStatus ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="airplane" size={18} color="#fff" />
                  <Text style={styles.actionButtonText}>Kargoya Ver</Text>
                </>
              )}
            </TouchableOpacity>
          )}
          
          {order.status === 'shipped' && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#10b981' }]}
              onPress={() => updateOrderStatus('delivered')}
              disabled={updatingStatus}
            >
              {updatingStatus ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={18} color="#fff" />
                  <Text style={styles.actionButtonText}>Teslim Edildi</Text>
                </>
              )}
            </TouchableOpacity>
          )}
          
          {order.status !== 'cancelled' && order.status !== 'delivered' && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#ef4444' }]}
              onPress={() => updateOrderStatus('cancelled')}
              disabled={updatingStatus}
            >
              {updatingStatus ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="close-circle" size={18} color="#fff" />
                  <Text style={styles.actionButtonText}>İptal Et</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.bottomPadding} />
    </ScrollView>
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
    fontSize: 16,
    marginTop: 12,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
  },
  backButton: {
    marginTop: 24,
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  headerCard: {
    backgroundColor: '#1a1a2e',
    padding: 20,
    marginBottom: 16,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderNumber: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  orderDate: {
    color: '#64748b',
    fontSize: 14,
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  section: {
    backgroundColor: '#1a1a2e',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  infoLabel: {
    color: '#a0aec0',
    fontSize: 14,
  },
  infoValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  addressText: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 22,
  },
  shipmentInfo: {
    backgroundColor: '#2a2a3e',
    padding: 12,
    borderRadius: 8,
  },
  shipmentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  trackingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0ea5e9',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  trackingButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  productItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#2a2a3e',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  productVariant: {
    color: '#a0aec0',
    fontSize: 12,
    marginTop: 2,
  },
  productQuantity: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 4,
  },
  productPrice: {
    color: '#10b981',
    fontSize: 16,
    fontWeight: 'bold',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  priceLabel: {
    color: '#a0aec0',
    fontSize: 14,
  },
  priceValue: {
    color: '#fff',
    fontSize: 14,
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#2a2a3e',
  },
  totalLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  totalValue: {
    color: '#10b981',
    fontSize: 18,
    fontWeight: 'bold',
  },
  notesText: {
    color: '#f59e0b',
    fontSize: 14,
    lineHeight: 20,
  },
  actionsContainer: {
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 8,
    marginBottom: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  bottomPadding: {
    height: 24,
  },
});
