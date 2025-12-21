import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Image,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import { ProductCardSkeleton, ListSkeleton } from '../components/SkeletonLoader';
import websocketService, { EventTypes } from '../services/websocket';

const ProductCard = React.memo(({ product, onPress, onCheckStock, sellerName, isSelected, onSelect, selectionMode }) => {
  const isSynced = Boolean(product.is_synced_to_shopify);
  const isInStock = product.stock_status === 'in_stock';

  const handlePress = useCallback(() => {
    if (selectionMode) {
      onSelect(product.id);
    } else {
      onPress();
    }
  }, [selectionMode, product.id, onSelect, onPress]);

  const handleLongPress = useCallback(() => {
    onSelect(product.id);
  }, [product.id, onSelect]);

  const handleStockCheck = useCallback(() => {
    onCheckStock(product);
  }, [product, onCheckStock]);

  return (
    <TouchableOpacity 
      style={[styles.productCard, isSelected && styles.productCardSelected]} 
      onPress={handlePress}
      onLongPress={handleLongPress}
    >
      {selectionMode && (
        <View style={styles.checkbox}>
          <Ionicons 
            name={isSelected ? "checkbox" : "square-outline"} 
            size={24} 
            color={isSelected ? "#3b82f6" : "#64748b"} 
          />
        </View>
      )}
      <Image
        source={{ uri: product.images?.[0] || 'https://via.placeholder.com/80' }}
        style={styles.productImage}
      />
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
        <View style={styles.sellerRow}>
          <Ionicons name="storefront" size={12} color="#f59e0b" />
          <Text style={styles.sellerName}>{sellerName || 'Bilinmeyen Satıcı'}</Text>
        </View>
        <Text style={styles.productBrand}>{product.brand_name}</Text>
        <View style={styles.priceRow}>
          {product.trendyol_price > 0 && (
            <Text style={styles.productPrice}>
              {product.trendyol_price.toFixed(2)} ₺
            </Text>
          )}
          {isSynced && product.shopify_price > 0 && (
            <Text style={styles.shopifyPrice}>
              ${product.shopify_price.toFixed(2)}
            </Text>
          )}
        </View>
        <View style={styles.badgeRow}>
          {isSynced ? (
            <View style={[styles.badge, { backgroundColor: '#10b981' }]}>
              <Text style={styles.badgeText}>Shopify</Text>
            </View>
          ) : (
            <View style={[styles.badge, { backgroundColor: '#64748b' }]}>
              <Text style={styles.badgeText}>Bekliyor</Text>
            </View>
          )}
          <View style={[styles.badge, { backgroundColor: isInStock ? '#3b82f6' : '#ef4444' }]}>
            <Text style={styles.badgeText}>{isInStock ? 'Stokta' : 'Yok'}</Text>
          </View>
        </View>
      </View>
      <TouchableOpacity style={styles.stockButton} onPress={handleStockCheck}>
        <Ionicons name="refresh" size={20} color="#3b82f6" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.product.id === nextProps.product.id &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.selectionMode === nextProps.selectionMode &&
    prevProps.product.stock_status === nextProps.product.stock_status &&
    prevProps.product.is_synced_to_shopify === nextProps.product.is_synced_to_shopify
  );
});

export default function ProductsScreen({ navigation }) {
  const [products, setProducts] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [selectedSellerId, setSelectedSellerId] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkAction, setBulkAction] = useState(null);
  const [priceMargin, setPriceMargin] = useState('');
  const [processing, setProcessing] = useState(false);

  // Arama ve filtreleme
  const filteredProducts = useMemo(() => {
    if (!searchText.trim()) return products;
    const search = searchText.toLowerCase().trim();
    return products.filter(p => 
      p.name?.toLowerCase().includes(search) ||
      p.brand_name?.toLowerCase().includes(search) ||
      p.category_name?.toLowerCase().includes(search)
    );
  }, [products, searchText]);

  // Satıcı adını bul
  const getSellerName = (sellerId) => {
    const seller = sellers.find(s => s.id === sellerId);
    return seller ? seller.name : null;
  };

  const fetchSellers = async () => {
    try {
      const response = await api.getSellers();
      if (response.success) {
        setSellers(response.data);
      }
    } catch (err) {
      console.error('Sellers fetch error:', err);
    }
  };

  const fetchProducts = useCallback(async (pageNum = 1, refresh = false, sellerId = null) => {
    try {
      const response = await api.getProducts(pageNum, 20, sellerId);
      if (response.success) {
        if (refresh || pageNum === 1) {
          setProducts(response.data.products);
        } else {
          setProducts(prev => [...prev, ...response.data.products]);
        }
        setTotalPages(response.data.total_pages);
        setPage(pageNum);
      }
    } catch (err) {
      console.error('Products fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSellers();
    fetchProducts();
    
    // WebSocket real-time listeners
    const unsubscribers = [
      // Yeni ürün eklendiğinde
      websocketService.on(EventTypes.PRODUCT_ADDED, (data) => {
        console.log('🆕 Real-time: Yeni ürün eklendi', data);
        onRefresh(); // Listeyi yenile
      }),
      
      // Ürün güncellendiğinde
      websocketService.on(EventTypes.PRODUCT_UPDATED, (data) => {
        console.log('📝 Real-time: Ürün güncellendi', data);
        onRefresh();
      }),
      
      // Ürün silindiğinde
      websocketService.on(EventTypes.PRODUCT_DELETED, (data) => {
        console.log('🗑️ Real-time: Ürün silindi', data);
        onRefresh();
      }),
      
      // Shopify'a yüklendiğinde
      websocketService.on(EventTypes.PRODUCT_SYNCED, (data) => {
        console.log('☁️ Real-time: Ürün Shopify\'a yüklendi', data);
        onRefresh();
      }),
      
      // Stok değiştiğinde
      websocketService.on(EventTypes.PRODUCT_STOCK_CHANGED, (data) => {
        console.log('📦 Real-time: Stok güncellendi', data);
        onRefresh();
      }),
      
      // Fiyat değiştiğinde
      websocketService.on(EventTypes.PRODUCT_PRICE_CHANGED, (data) => {
        console.log('💰 Real-time: Fiyat güncellendi', data);
        onRefresh();
      }),
    ];
    
    // Cleanup
    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [fetchProducts]);

  // Satıcı değiştiğinde ürünleri filtrele
  useEffect(() => {
    setLoading(true);
    fetchProducts(1, true, selectedSellerId);
  }, [selectedSellerId]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProducts(1, true, selectedSellerId);
  }, [fetchProducts, selectedSellerId]);

  const loadMore = () => {
    if (page < totalPages && !loading) {
      fetchProducts(page + 1);
    }
  };

  const checkStock = async (product) => {
    try {
      Alert.alert('Stok Kontrol', 'Stok durumu kontrol ediliyor...');
      const response = await api.checkProductStock(product.id);
      if (response.success) {
        const { in_stock, price } = response.data;
        Alert.alert(
          'Stok Durumu',
          `Ürün: ${product.name}\n\nDurum: ${in_stock ? 'Stokta [OK]' : 'Stokta Yok [OUT]'}\nFiyat: ${price?.toFixed(2)} ₺`
        );
        onRefresh();
      }
    } catch (err) {
      Alert.alert('Hata', 'Stok kontrolü yapılamadı');
    }
  };

  const syncToShopify = async () => {
    if (selectedProducts.length === 0) {
      Alert.alert('Uyarı', 'Lütfen en az bir ürün seçin');
      return;
    }

    try {
      const response = await api.syncProductsToShopify(selectedProducts);
      if (response.success) {
        Alert.alert('Başarılı', response.message);
        setSelectedProducts([]);
        onRefresh();
      }
    } catch (err) {
      Alert.alert('Hata', 'Ürünler Shopify\'a yüklenemedi');
    }
  };

  const toggleProductSelection = (productId) => {
    if (!selectionMode) {
      setSelectionMode(true);
    }
    setSelectedProducts(prev => {
      if (prev.includes(productId)) {
        const newList = prev.filter(id => id !== productId);
        if (newList.length === 0) setSelectionMode(false);
        return newList;
      }
      return [...prev, productId];
    });
  };

  const selectAll = () => {
    setSelectedProducts(filteredProducts.map(p => p.id));
    setSelectionMode(true);
  };

  const clearSelection = () => {
    setSelectedProducts([]);
    setSelectionMode(false);
  };

  const openBulkAction = (action) => {
    if (selectedProducts.length === 0) {
      Alert.alert('Uyarı', 'Lütfen en az bir ürün seçin');
      return;
    }
    setBulkAction(action);
    setShowBulkModal(true);
  };

  const executeBulkAction = async () => {
    setProcessing(true);
    try {
      let response;
      switch (bulkAction) {
        case 'sync':
          response = await api.bulkSyncToShopify(selectedProducts);
          if (response.success) {
            Alert.alert('Tamamlandı', 
              `${response.data.success_count} ürün Shopify'a yüklendi.\n${response.data.error_count} hata oluştu.`);
          }
          break;
        case 'price':
          const margin = parseFloat(priceMargin) || 0;
          response = await api.bulkUpdatePrice(selectedProducts, { marginPercentage: margin });
          if (response.success) {
            Alert.alert('Tamamlandı', `${response.data.updated_count} ürün fiyatı güncellendi`);
          }
          break;
        case 'delete':
          response = await api.bulkDeleteProducts(selectedProducts);
          if (response.success) {
            Alert.alert('Tamamlandı', `${response.data.deleted_count} ürün silindi`);
          }
          break;
        case 'stock':
          Alert.alert('Bilgi', 'Stok güncelleme başlatıldı. Bu işlem biraz zaman alabilir.');
          response = await api.bulkStockUpdate();
          if (response.success) {
            Alert.alert('Tamamlandı', `${response.data.updated_count} ürün stok bilgisi güncellendi`);
          }
          break;
      }
      setShowBulkModal(false);
      clearSelection();
      onRefresh();
    } catch (err) {
      Alert.alert('Hata', 'İşlem başarısız oldu');
    } finally {
      setProcessing(false);
    }
  };

  const exportProductsToCSV = async () => {
    try {
      const ExportService = (await import('../services/ExportService')).default;
      const success = await ExportService.exportProductsToCSV(filteredProducts);
      if (success) {
        console.log(`${filteredProducts.length} ürün export edildi`);
      }
    } catch (err) {
      Alert.alert('Hata', 'Dışa aktarma başarısız');
    }
  };

  if (loading && products.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>Ürünler yükleniyor...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Arama Çubuğu */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={20} color="#64748b" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Ürün adı, marka veya kategori ara..."
          placeholderTextColor="#64748b"
          value={searchText}
          onChangeText={setSearchText}
        />
        {searchText.length > 0 && (
          <TouchableOpacity onPress={() => setSearchText('')}>
            <Ionicons name="close-circle" size={20} color="#64748b" />
          </TouchableOpacity>
        )}
      </View>

      {/* Satıcı Filtresi */}
      <View style={styles.filterBar}>
        <TouchableOpacity 
          style={[styles.filterButton, !selectedSellerId && styles.filterButtonActive]}
          onPress={() => setSelectedSellerId(null)}
        >
          <Text style={[styles.filterButtonText, !selectedSellerId && styles.filterButtonTextActive]}>
            Tümü
          </Text>
        </TouchableOpacity>
        {sellers.map(seller => (
          <TouchableOpacity 
            key={seller.id}
            style={[styles.filterButton, selectedSellerId === seller.id && styles.filterButtonActive]}
            onPress={() => setSelectedSellerId(seller.id)}
          >
            <Text style={[styles.filterButtonText, selectedSellerId === seller.id && styles.filterButtonTextActive]}>
              {seller.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Üst Bar - Normal veya Seçim Modu */}
      {selectionMode ? (
        <View style={styles.selectionBar}>
          <TouchableOpacity style={styles.selectionAction} onPress={clearSelection}>
            <Ionicons name="close" size={20} color="#fff" />
            <Text style={styles.selectionActionText}>İptal</Text>
          </TouchableOpacity>
          <Text style={styles.selectionCount}>{selectedProducts.length} seçili</Text>
          <TouchableOpacity style={styles.selectionAction} onPress={selectAll}>
            <Ionicons name="checkmark-done" size={20} color="#fff" />
            <Text style={styles.selectionActionText}>Tümünü Seç</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.topBar}>
          <Text style={styles.countText}>
            {filteredProducts.length} ürün {searchText ? `("${searchText}" için)` : ''}
          </Text>
          <View style={styles.topBarActions}>
            <TouchableOpacity style={styles.iconButton} onPress={exportProductsToCSV}>
              <Ionicons name="download-outline" size={20} color="#3b82f6" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.syncButton} onPress={() => setSelectionMode(true)}>
              <Ionicons name="checkbox-outline" size={18} color="#fff" />
              <Text style={styles.syncButtonText}>Seç</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Toplu İşlem Menüsü (Seçim Modunda) */}
      {selectionMode && selectedProducts.length > 0 && (
        <View style={styles.bulkActionBar}>
          <TouchableOpacity style={styles.bulkActionBtn} onPress={() => openBulkAction('sync')}>
            <Ionicons name="cloud-upload" size={20} color="#10b981" />
            <Text style={styles.bulkActionText}>Shopify</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.bulkActionBtn} onPress={() => openBulkAction('price')}>
            <Ionicons name="pricetag" size={20} color="#f59e0b" />
            <Text style={styles.bulkActionText}>Fiyat</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.bulkActionBtn} onPress={() => openBulkAction('stock')}>
            <Ionicons name="refresh" size={20} color="#3b82f6" />
            <Text style={styles.bulkActionText}>Stok</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.bulkActionBtn} onPress={() => openBulkAction('delete')}>
            <Ionicons name="trash" size={20} color="#ef4444" />
            <Text style={styles.bulkActionText}>Sil</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Ürün Listesi */}
      {loading && filteredProducts.length === 0 ? (
        <ListSkeleton count={6} ItemSkeleton={ProductCardSkeleton} />
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <ProductCard
              product={item}
              sellerName={getSellerName(item.seller_id)}
              onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
              onCheckStock={checkStock}
              isSelected={selectedProducts.includes(item.id)}
              onSelect={toggleProductSelection}
              selectionMode={selectionMode}
            />
          )}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          contentContainerStyle={styles.listContent}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={true}
          initialNumToRender={10}
          updateCellsBatchingPeriod={50}
          getItemLayout={(data, index) => ({
            length: 150,
            offset: 150 * index,
            index,
          })}
          ListEmptyComponent={
            !loading && (
              <View style={styles.emptyContainer}>
                <Ionicons name="search-outline" size={48} color="#64748b" />
                <Text style={styles.emptyText}>
                  {searchText ? 'Arama sonucu bulunamadı' : 'Henüz ürün yok'}
                </Text>
              </View>
            )
          }
        />
      )}

      {/* Toplu İşlem Modal */}
      <Modal
        visible={showBulkModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowBulkModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {bulkAction === 'sync' && 'Shopify\'a Yükle'}
                {bulkAction === 'price' && 'Fiyat Güncelle'}
                {bulkAction === 'stock' && 'Stok Güncelle'}
                {bulkAction === 'delete' && 'Ürünleri Sil'}
              </Text>
              <TouchableOpacity onPress={() => setShowBulkModal(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.modalInfo}>
                {selectedProducts.length} ürün seçili
              </Text>

              {bulkAction === 'price' && (
                <View style={styles.priceInput}>
                  <Text style={styles.inputLabel}>Kar Marjı (%)</Text>
                  <TextInput
                    style={styles.input}
                    value={priceMargin}
                    onChangeText={setPriceMargin}
                    placeholder="50"
                    placeholderTextColor="#64748b"
                    keyboardType="numeric"
                  />
                  <Text style={styles.inputHint}>
                    Orijinal fiyata bu yüzde eklenerek satış fiyatı hesaplanır
                  </Text>
                </View>
              )}

              {bulkAction === 'sync' && (
                <Text style={styles.modalDescription}>
                  Seçili ürünler Shopify mağazanıza yüklenecek.
                </Text>
              )}

              {bulkAction === 'stock' && (
                <Text style={styles.modalDescription}>
                  Tüm ürünlerin stok bilgileri Trendyol'dan güncellenecek.
                  Bu işlem birkaç dakika sürebilir.
                </Text>
              )}

              {bulkAction === 'delete' && (
                <Text style={[styles.modalDescription, { color: '#ef4444' }]}>
                  [UYARI] Bu işlem geri alınamaz! Seçili ürünler kalıcı olarak silinecek.
                </Text>
              )}
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.cancelButton} 
                onPress={() => setShowBulkModal(false)}
              >
                <Text style={styles.cancelButtonText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.confirmButton, 
                  bulkAction === 'delete' && styles.confirmButtonDanger,
                  processing && styles.buttonDisabled
                ]} 
                onPress={executeBulkAction}
                disabled={processing}
              >
                <Text style={styles.confirmButtonText}>
                  {processing ? 'İşleniyor...' : 'Onayla'}
                </Text>
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
    paddingBottom: 75, // Alt navigasyon için boşluk
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1a1a2e',
  },
  countText: {
    color: '#a0aec0',
    fontSize: 14,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  syncButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  listContent: {
    padding: 16,
  },
  productCard: {
    flexDirection: 'row',
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#2a2a3e',
  },
  productInfo: {
    flex: 1,
    marginLeft: 12,
  },
  productName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  sellerName: {
    color: '#f59e0b',
    fontSize: 11,
    marginLeft: 4,
    fontWeight: '600',
  },
  productBrand: {
    color: '#a0aec0',
    fontSize: 12,
    marginTop: 2,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  productPrice: {
    color: '#10b981',
    fontSize: 16,
    fontWeight: 'bold',
  },
  shopifyPrice: {
    color: '#3b82f6',
    fontSize: 14,
    marginLeft: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  stockButton: {
    justifyContent: 'center',
    paddingLeft: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    margin: 12,
    marginBottom: 0,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    paddingVertical: 4,
  },
  filterBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    backgroundColor: '#0f0f1a',
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a3e',
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#2a2a3e',
    marginRight: 8,
    marginBottom: 8,
  },
  filterButtonActive: {
    backgroundColor: '#3b82f6',
  },
  filterButtonText: {
    color: '#a0aec0',
    fontSize: 12,
    fontWeight: '600',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 16,
    marginTop: 12,
  },
  // Yeni toplu işlem stilleri
  topBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    padding: 8,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 8,
  },
  selectionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#3b82f6',
  },
  selectionAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  selectionActionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  selectionCount: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  bulkActionBar: {
    flexDirection: 'row',
    backgroundColor: '#1a1a2e',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a3e',
  },
  bulkActionBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  bulkActionText: {
    color: '#fff',
    fontSize: 11,
    marginTop: 4,
  },
  checkbox: {
    marginRight: 8,
    justifyContent: 'center',
  },
  productCardSelected: {
    borderWidth: 2,
    borderColor: '#3b82f6',
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
  modalInfo: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalDescription: {
    color: '#a0aec0',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
  priceInput: {
    marginTop: 8,
  },
  inputLabel: {
    color: '#a0aec0',
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#252540',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
  },
  inputHint: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 8,
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
  confirmButton: {
    flex: 1,
    backgroundColor: '#3b82f6',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonDanger: {
    backgroundColor: '#ef4444',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
