import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import { StatCardSkeleton } from '../components/SkeletonLoader';
import ConnectionStatus from '../components/ConnectionStatus';

const StatCard = ({ icon, title, value, color, onPress }) => (
  <TouchableOpacity style={[styles.statCard, { borderLeftColor: color }]} onPress={onPress}>
    <View style={styles.statIcon}>
      <Ionicons name={icon} size={28} color={color} />
    </View>
    <View style={styles.statInfo}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </View>
  </TouchableOpacity>
);

const ActivityItem = ({ activity }) => (
  <View style={styles.activityItem}>
    <View style={[styles.activityDot, { backgroundColor: activity.status === 'success' ? '#10b981' : '#f59e0b' }]} />
    <View style={styles.activityContent}>
      <Text style={styles.activityAction}>{activity.action}</Text>
      <Text style={styles.activityDetails}>{activity.details}</Text>
      <Text style={styles.activityTime}>{activity.created_at}</Text>
    </View>
  </View>
);

export default function DashboardScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [error, setError] = useState(null);

  const fetchDashboard = useCallback(async () => {
    try {
      setError(null);
      const response = await api.getDashboard();
      if (response.success) {
        setDashboardData(response.data);
      }
    } catch (err) {
      setError('Bağlantı hatası. API sunucusunu kontrol edin.');
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDashboard();
  }, [fetchDashboard]);

  if (loading) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.statsGrid}>
          {[1, 2, 3, 4, 5, 6].map(i => (
            <StatCardSkeleton key={i} />
          ))}
        </View>
      </ScrollView>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="cloud-offline" size={64} color="#ef4444" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchDashboard}>
          <Text style={styles.retryButtonText}>Tekrar Dene</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ConnectionStatus />
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />
        }
      >
        {/* Dolar Kuru */}
        <View style={styles.currencyCard}>
        <Ionicons name="trending-up" size={24} color="#10b981" />
        <Text style={styles.currencyText}>
          Dolar Kuru: <Text style={styles.currencyValue}>{dashboardData?.currency_rate?.toFixed(2)} ₺</Text>
        </Text>
      </View>

      {/* İstatistikler */}
      <View style={styles.sectionHeader}>
        <Ionicons name="bar-chart" size={20} color="#3b82f6" />
        <Text style={styles.sectionTitle}>Genel Bakış</Text>
      </View>
      <View style={styles.statsGrid}>
        <StatCard
          icon="storefront"
          title="Satıcılar"
          value={dashboardData?.total_sellers || 0}
          color="#8b5cf6"
          onPress={() => navigation.navigate('Sellers')}
        />
        <StatCard
          icon="cube"
          title="Toplam Ürün"
          value={dashboardData?.total_products || 0}
          color="#3b82f6"
          onPress={() => navigation.navigate('Products')}
        />
        <StatCard
          icon="checkmark-circle"
          title="Senkronize"
          value={dashboardData?.synced_products || 0}
          color="#10b981"
          onPress={() => navigation.navigate('Products')}
        />
        <StatCard
          icon="cart"
          title="Bekleyen Sipariş"
          value={dashboardData?.pending_orders || 0}
          color="#f59e0b"
          onPress={() => navigation.navigate('Orders')}
        />
      </View>

      {/* Hızlı İşlemler */}
      <View style={styles.sectionHeader}>
        <Ionicons name="flash" size={20} color="#3b82f6" />
        <Text style={styles.sectionTitle}>Hızlı İşlemler</Text>
      </View>
      <View style={styles.quickActions}>
        <TouchableOpacity style={styles.actionButton} onPress={() => api.syncStock()}>
          <Ionicons name="sync" size={24} color="#fff" />
          <Text style={styles.actionButtonText}>Stok Senkronize Et</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#8b5cf6' }]} onPress={() => api.fetchOrdersFromShopify()}>
          <Ionicons name="download" size={24} color="#fff" />
          <Text style={styles.actionButtonText}>Siparişleri Çek</Text>
        </TouchableOpacity>
      </View>

      {/* Son Aktiviteler */}
      <Text style={styles.sectionTitle}>📋 Son Aktiviteler</Text>
      <View style={styles.activitiesCard}>
        {dashboardData?.recent_activities?.length > 0 ? (
          dashboardData.recent_activities.slice(0, 5).map((activity, index) => (
            <ActivityItem key={index} activity={activity} />
          ))
        ) : (
          <Text style={styles.noActivityText}>Henüz aktivite yok</Text>
        )}
      </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
    paddingBottom: 75,
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
    fontSize: 18,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  retryButton: {
    marginTop: 24,
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  currencyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  currencyText: {
    color: '#a0aec0',
    fontSize: 16,
    marginLeft: 12,
  },
  currencyValue: {
    color: '#10b981',
    fontWeight: 'bold',
    fontSize: 18,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 8,
    gap: 8,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
  },
  statIcon: {
    marginRight: 12,
  },
  statInfo: {
    flex: 1,
  },
  statValue: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  statTitle: {
    color: '#a0aec0',
    fontSize: 12,
    marginTop: 2,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#10b981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 4,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  activitiesCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  activityItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  activityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityAction: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  activityDetails: {
    color: '#a0aec0',
    fontSize: 12,
    marginTop: 2,
  },
  activityTime: {
    color: '#64748b',
    fontSize: 10,
    marginTop: 4,
  },
  noActivityText: {
    color: '#64748b',
    textAlign: 'center',
  },
});
