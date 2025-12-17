import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';

const { width } = Dimensions.get('window');

export default function ReportsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [salesData, setSalesData] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [profitAnalysis, setProfitAnalysis] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [activeTab, setActiveTab] = useState('overview');

  const fetchData = async () => {
    try {
      const [dashboardRes, salesRes, topRes, profitRes] = await Promise.all([
        api.getDashboardStats(),
        api.getSalesReport(selectedPeriod),
        api.getTopProducts(5),
        api.getProfitAnalysis()
      ]);

      if (dashboardRes.success) setDashboardStats(dashboardRes.data);
      if (salesRes.success) setSalesData(salesRes.data.daily_sales || []);
      if (topRes.success) setTopProducts(topRes.data || []);
      if (profitRes.success) setProfitAnalysis(profitRes.data);
    } catch (err) {
      console.error('Reports fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedPeriod]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [selectedPeriod]);

  const formatCurrency = (value) => {
    return `₺${value.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`;
  };

  const StatCard = ({ icon, title, value, subtitle, color = '#3b82f6' }) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={[styles.statIconContainer, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <View style={styles.statContent}>
        <Text style={styles.statTitle}>{title}</Text>
        <Text style={styles.statValue}>{value}</Text>
        {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Raporlar yükleniyor...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#3b82f6"
        />
      }
    >
      {/* Tab Seçici */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
          onPress={() => setActiveTab('overview')}
        >
          <Ionicons 
            name="grid-outline" 
            size={18} 
            color={activeTab === 'overview' ? '#fff' : '#64748b'} 
          />
          <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>
            Genel
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'sales' && styles.activeTab]}
          onPress={() => setActiveTab('sales')}
        >
          <Ionicons 
            name="trending-up-outline" 
            size={18} 
            color={activeTab === 'sales' ? '#fff' : '#64748b'} 
          />
          <Text style={[styles.tabText, activeTab === 'sales' && styles.activeTabText]}>
            Satışlar
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'products' && styles.activeTab]}
          onPress={() => setActiveTab('products')}
        >
          <Ionicons 
            name="cube-outline" 
            size={18} 
            color={activeTab === 'products' ? '#fff' : '#64748b'} 
          />
          <Text style={[styles.tabText, activeTab === 'products' && styles.activeTabText]}>
            Ürünler
          </Text>
        </TouchableOpacity>
      </View>

      {/* Genel Bakış Tab */}
      {activeTab === 'overview' && dashboardStats && (
        <View style={styles.section}>
          {/* Sipariş İstatistikleri */}
          <View style={styles.sectionHeader}>
            <Ionicons name="archive" size={20} color="#3b82f6" />
            <Text style={styles.sectionTitle}>Siparişler</Text>
          </View>
          <View style={styles.statsGrid}>
            <StatCard
              icon="cart"
              title="Bugün"
              value={dashboardStats.orders.today}
              color="#10b981"
            />
            <StatCard
              icon="calendar"
              title="Bu Hafta"
              value={dashboardStats.orders.this_week}
              color="#3b82f6"
            />
            <StatCard
              icon="calendar-outline"
              title="Bu Ay"
              value={dashboardStats.orders.this_month}
              color="#8b5cf6"
            />
            <StatCard
              icon="layers"
              title="Toplam"
              value={dashboardStats.orders.total}
              color="#f59e0b"
            />
          </View>

          {/* Ciro İstatistikleri */}
          <View style={styles.sectionHeader}>
            <Ionicons name="wallet" size={20} color="#3b82f6" />
            <Text style={styles.sectionTitle}>Ciro</Text>
          </View>
          <View style={styles.statsGrid}>
            <StatCard
              icon="wallet"
              title="Bugün"
              value={formatCurrency(dashboardStats.revenue.today)}
              color="#10b981"
            />
            <StatCard
              icon="trending-up"
              title="Bu Hafta"
              value={formatCurrency(dashboardStats.revenue.this_week)}
              color="#3b82f6"
            />
            <StatCard
              icon="stats-chart"
              title="Bu Ay"
              value={formatCurrency(dashboardStats.revenue.this_month)}
              color="#8b5cf6"
            />
            <StatCard
              icon="cash"
              title="Toplam"
              value={formatCurrency(dashboardStats.revenue.total)}
              color="#f59e0b"
            />
          </View>

          {/* Ürün İstatistikleri */}
          <View style={styles.sectionHeader}>
            <Ionicons name="cube" size={20} color="#3b82f6" />
            <Text style={styles.sectionTitle}>Ürünler</Text>
          </View>
          <View style={styles.productStats}>
            <View style={styles.productStatItem}>
              <Text style={styles.productStatValue}>{dashboardStats.products.total}</Text>
              <Text style={styles.productStatLabel}>Toplam</Text>
            </View>
            <View style={styles.productStatItem}>
              <Text style={[styles.productStatValue, { color: '#10b981' }]}>
                {dashboardStats.products.in_stock}
              </Text>
              <Text style={styles.productStatLabel}>Stokta</Text>
            </View>
            <View style={styles.productStatItem}>
              <Text style={[styles.productStatValue, { color: '#3b82f6' }]}>
                {dashboardStats.products.synced_to_shopify}
              </Text>
              <Text style={styles.productStatLabel}>Shopify</Text>
            </View>
            <View style={styles.productStatItem}>
              <Text style={[styles.productStatValue, { color: '#ef4444' }]}>
                {dashboardStats.products.out_of_stock}
              </Text>
              <Text style={styles.productStatLabel}>Tükendi</Text>
            </View>
          </View>

          {/* Kar Analizi */}
          {profitAnalysis && (
            <>
              <View style={styles.sectionHeader}>
                <Ionicons name="trending-up" size={20} color="#3b82f6" />
                <Text style={styles.sectionTitle}>Kar Analizi</Text>
              </View>
              <View style={styles.profitCard}>
                <View style={styles.profitRow}>
                  <Text style={styles.profitLabel}>Toplam Ciro</Text>
                  <Text style={styles.profitValue}>
                    {formatCurrency(profitAnalysis.total_revenue)}
                  </Text>
                </View>
                <View style={styles.profitRow}>
                  <Text style={styles.profitLabel}>Tahmini Maliyet</Text>
                  <Text style={[styles.profitValue, { color: '#ef4444' }]}>
                    -{formatCurrency(profitAnalysis.estimated_cost)}
                  </Text>
                </View>
                <View style={styles.profitDivider} />
                <View style={styles.profitRow}>
                  <Text style={styles.profitLabel}>Tahmini Kar</Text>
                  <Text style={[styles.profitValue, { color: '#10b981', fontSize: 20 }]}>
                    {formatCurrency(profitAnalysis.estimated_profit)}
                  </Text>
                </View>
                <View style={styles.profitRow}>
                  <Text style={styles.profitLabel}>Kar Marjı Ayarı</Text>
                  <Text style={styles.profitValue}>%{profitAnalysis.profit_margin_setting}</Text>
                </View>
                <View style={styles.profitRow}>
                  <Text style={styles.profitLabel}>Ortalama Sipariş</Text>
                  <Text style={styles.profitValue}>
                    {formatCurrency(profitAnalysis.average_order_value)}
                  </Text>
                </View>
              </View>
            </>
          )}
        </View>
      )}

      {/* Satışlar Tab */}
      {activeTab === 'sales' && (
        <View style={styles.section}>
          {/* Dönem Seçici */}
          <View style={styles.periodSelector}>
            {['week', 'month', 'year'].map((period) => (
              <TouchableOpacity
                key={period}
                style={[
                  styles.periodButton,
                  selectedPeriod === period && styles.periodButtonActive
                ]}
                onPress={() => setSelectedPeriod(period)}
              >
                <Text style={[
                  styles.periodButtonText,
                  selectedPeriod === period && styles.periodButtonTextActive
                ]}>
                  {period === 'week' ? '7 Gün' : period === 'month' ? '30 Gün' : '1 Yıl'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Günlük Satış Listesi */}
          <View style={styles.sectionHeader}>
            <Ionicons name="stats-chart" size={20} color="#3b82f6" />
            <Text style={styles.sectionTitle}>Günlük Satışlar</Text>
          </View>
          {salesData.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="bar-chart-outline" size={48} color="#64748b" />
              <Text style={styles.emptyText}>Henüz satış verisi yok</Text>
            </View>
          ) : (
            <View style={styles.salesList}>
              {salesData.map((day, index) => (
                <View key={day.date} style={styles.salesItem}>
                  <View style={styles.salesDate}>
                    <Text style={styles.salesDateText}>{day.date}</Text>
                  </View>
                  <View style={styles.salesStats}>
                    <View style={styles.salesStatItem}>
                      <Ionicons name="cart-outline" size={16} color="#64748b" />
                      <Text style={styles.salesStatText}>{day.order_count} sipariş</Text>
                    </View>
                    <Text style={styles.salesRevenue}>{formatCurrency(day.revenue)}</Text>
                  </View>
                  {/* Basit bar grafik */}
                  <View style={styles.salesBar}>
                    <View 
                      style={[
                        styles.salesBarFill, 
                        { 
                          width: `${Math.min(100, (day.revenue / (salesData[0]?.revenue || 1)) * 100)}%` 
                        }
                      ]} 
                    />
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Ürünler Tab */}
      {activeTab === 'products' && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="trophy" size={20} color="#3b82f6" />
            <Text style={styles.sectionTitle}>En Çok Satan Ürünler</Text>
          </View>
          {topProducts.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="trophy-outline" size={48} color="#64748b" />
              <Text style={styles.emptyText}>Henüz satış verisi yok</Text>
            </View>
          ) : (
            <View style={styles.topProductsList}>
              {topProducts.map((product, index) => (
                <View key={index} style={styles.topProductItem}>
                  <View style={[styles.rankBadge, index < 3 && styles.rankBadgeTop]}>
                    <Text style={styles.rankText}>{index + 1}</Text>
                  </View>
                  <View style={styles.topProductInfo}>
                    <Text style={styles.topProductTitle} numberOfLines={2}>
                      {product.title}
                    </Text>
                    <View style={styles.topProductStats}>
                      <Text style={styles.topProductOrders}>
                        {product.order_count} sipariş
                      </Text>
                      <Text style={styles.topProductRevenue}>
                        {formatCurrency(product.total_revenue)}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      <View style={{ height: 40 }} />
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#1a1a2e',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  activeTab: {
    backgroundColor: '#3b82f6',
  },
  tabText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#fff',
  },
  section: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
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
    gap: 12,
  },
  statCard: {
    width: (width - 44) / 2,
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 4,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statContent: {},
  statTitle: {
    color: '#64748b',
    fontSize: 12,
    marginBottom: 4,
  },
  statValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  statSubtitle: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 2,
  },
  productStats: {
    flexDirection: 'row',
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
  },
  productStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  productStatValue: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  productStatLabel: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 4,
  },
  profitCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
  },
  profitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  profitLabel: {
    color: '#64748b',
    fontSize: 14,
  },
  profitValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  profitDivider: {
    height: 1,
    backgroundColor: '#252540',
    marginVertical: 8,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#1a1a2e',
    borderRadius: 10,
    padding: 4,
    marginBottom: 16,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  periodButtonActive: {
    backgroundColor: '#3b82f6',
  },
  periodButtonText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '600',
  },
  periodButtonTextActive: {
    color: '#fff',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 14,
    marginTop: 12,
  },
  salesList: {
    gap: 12,
  },
  salesItem: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 14,
  },
  salesDate: {
    marginBottom: 8,
  },
  salesDateText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  salesStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  salesStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  salesStatText: {
    color: '#64748b',
    fontSize: 13,
  },
  salesRevenue: {
    color: '#10b981',
    fontSize: 16,
    fontWeight: 'bold',
  },
  salesBar: {
    height: 6,
    backgroundColor: '#252540',
    borderRadius: 3,
  },
  salesBarFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 3,
  },
  topProductsList: {
    gap: 12,
  },
  topProductItem: {
    flexDirection: 'row',
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#252540',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rankBadgeTop: {
    backgroundColor: '#f59e0b',
  },
  rankText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  topProductInfo: {
    flex: 1,
  },
  topProductTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  topProductStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  topProductOrders: {
    color: '#64748b',
    fontSize: 12,
  },
  topProductRevenue: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
