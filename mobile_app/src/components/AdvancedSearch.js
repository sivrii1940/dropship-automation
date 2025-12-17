import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function AdvancedSearch({ visible, onClose, onSearch, type = 'products' }) {
  const [searchText, setSearchText] = useState('');
  const [filters, setFilters] = useState({
    priceMin: '',
    priceMax: '',
    stockMin: '',
    stockMax: '',
    dateFrom: null,
    dateTo: null,
    status: null,
    isSynced: null,
  });
  const [showDatePicker, setShowDatePicker] = useState({ visible: false, field: null });

  const productStatuses = [
    { label: 'Tümü', value: null },
    { label: 'Stokta', value: 'in_stock' },
    { label: 'Stok Yok', value: 'out_of_stock' },
    { label: 'Düşük Stok', value: 'low_stock' },
  ];

  const syncStatuses = [
    { label: 'Tümü', value: null },
    { label: 'Senkronize', value: true },
    { label: 'Senkronize Değil', value: false },
  ];

  const orderStatuses = [
    { label: 'Tümü', value: null },
    { label: 'Bekliyor', value: 'pending' },
    { label: 'İşleniyor', value: 'processing' },
    { label: 'Satın Alındı', value: 'purchased' },
    { label: 'Kargoda', value: 'shipped' },
    { label: 'Teslim Edildi', value: 'delivered' },
    { label: 'İptal', value: 'cancelled' },
  ];

  const handleDateChange = (event, selectedDate) => {
    if (event.type === 'set' && selectedDate) {
      setFilters(prev => ({
        ...prev,
        [showDatePicker.field]: selectedDate,
      }));
    }
    setShowDatePicker({ visible: false, field: null });
  };

  const formatDate = (date) => {
    if (!date) return 'Seç';
    return date.toLocaleDateString('tr-TR');
  };

  const handleSearch = () => {
    onSearch({
      searchText,
      ...filters,
    });
    onClose();
  };

  const handleReset = () => {
    setSearchText('');
    setFilters({
      priceMin: '',
      priceMax: '',
      stockMin: '',
      stockMax: '',
      dateFrom: null,
      dateTo: null,
      status: null,
      isSynced: null,
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
              <Ionicons name="search" size={22} color="#1f2937" />
              <Text style={styles.title}>Gelişmiş Arama</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
            {/* Search Text */}
            <View style={styles.section}>
              <Text style={styles.label}>Arama</Text>
              <TextInput
                style={styles.input}
                value={searchText}
                onChangeText={setSearchText}
                placeholder={type === 'products' ? 'Ürün adı, marka, kategori...' : 'Sipariş no, müşteri adı...'}
                placeholderTextColor="#64748b"
              />
            </View>

            {/* Price Range (Products) */}
            {type === 'products' && (
              <View style={styles.section}>
                <Text style={styles.label}>Fiyat Aralığı (₺)</Text>
                <View style={styles.row}>
                  <TextInput
                    style={[styles.input, styles.halfInput]}
                    value={filters.priceMin}
                    onChangeText={(text) => setFilters({ ...filters, priceMin: text })}
                    placeholder="Min"
                    placeholderTextColor="#64748b"
                    keyboardType="numeric"
                  />
                  <Text style={styles.separator}>-</Text>
                  <TextInput
                    style={[styles.input, styles.halfInput]}
                    value={filters.priceMax}
                    onChangeText={(text) => setFilters({ ...filters, priceMax: text })}
                    placeholder="Max"
                    placeholderTextColor="#64748b"
                    keyboardType="numeric"
                  />
                </View>
              </View>
            )}

            {/* Stock Range (Products) */}
            {type === 'products' && (
              <View style={styles.section}>
                <Text style={styles.label}>Stok Aralığı</Text>
                <View style={styles.row}>
                  <TextInput
                    style={[styles.input, styles.halfInput]}
                    value={filters.stockMin}
                    onChangeText={(text) => setFilters({ ...filters, stockMin: text })}
                    placeholder="Min"
                    placeholderTextColor="#64748b"
                    keyboardType="numeric"
                  />
                  <Text style={styles.separator}>-</Text>
                  <TextInput
                    style={[styles.input, styles.halfInput]}
                    value={filters.stockMax}
                    onChangeText={(text) => setFilters({ ...filters, stockMax: text })}
                    placeholder="Max"
                    placeholderTextColor="#64748b"
                    keyboardType="numeric"
                  />
                </View>
              </View>
            )}

            {/* Date Range */}
            <View style={styles.section}>
              <Text style={styles.label}>Tarih Aralığı</Text>
              <View style={styles.row}>
                <TouchableOpacity
                  style={[styles.input, styles.halfInput, styles.dateButton]}
                  onPress={() => setShowDatePicker({ visible: true, field: 'dateFrom' })}
                >
                  <Text style={styles.dateText}>{formatDate(filters.dateFrom)}</Text>
                  <Ionicons name="calendar" size={20} color="#64748b" />
                </TouchableOpacity>
                <Text style={styles.separator}>-</Text>
                <TouchableOpacity
                  style={[styles.input, styles.halfInput, styles.dateButton]}
                  onPress={() => setShowDatePicker({ visible: true, field: 'dateTo' })}
                >
                  <Text style={styles.dateText}>{formatDate(filters.dateTo)}</Text>
                  <Ionicons name="calendar" size={20} color="#64748b" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Status Filter */}
            <View style={styles.section}>
              <Text style={styles.label}>
                {type === 'products' ? 'Stok Durumu' : 'Sipariş Durumu'}
              </Text>
              <View style={styles.chipContainer}>
                {(type === 'products' ? productStatuses : orderStatuses).map((status) => (
                  <TouchableOpacity
                    key={status.value}
                    style={[
                      styles.chip,
                      filters.status === status.value && styles.chipActive,
                    ]}
                    onPress={() => setFilters({ ...filters, status: status.value })}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        filters.status === status.value && styles.chipTextActive,
                      ]}
                    >
                      {status.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Sync Status (Products) */}
            {type === 'products' && (
              <View style={styles.section}>
                <Text style={styles.label}>Shopify Durumu</Text>
                <View style={styles.chipContainer}>
                  {syncStatuses.map((status) => (
                    <TouchableOpacity
                      key={String(status.value)}
                      style={[
                        styles.chip,
                        filters.isSynced === status.value && styles.chipActive,
                      ]}
                      onPress={() => setFilters({ ...filters, isSynced: status.value })}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          filters.isSynced === status.value && styles.chipTextActive,
                        ]}
                      >
                        {status.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
              <Ionicons name="refresh" size={20} color="#ef4444" />
              <Text style={styles.resetButtonText}>Sıfırla</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
              <Ionicons name="search" size={20} color="#fff" />
              <Text style={styles.searchButtonText}>Ara</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Date Picker */}
      {showDatePicker.visible && (
        <DateTimePicker
          value={filters[showDatePicker.field] || new Date()}
          mode="date"
          display="default"
          onChange={handleDateChange}
        />
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1a1a2e',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a3e',
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  form: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    color: '#a0aec0',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#2a2a3e',
    borderRadius: 12,
    padding: 14,
    color: '#fff',
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  halfInput: {
    flex: 1,
  },
  separator: {
    color: '#64748b',
    marginHorizontal: 12,
    fontSize: 18,
  },
  dateButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    color: '#fff',
    fontSize: 16,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#2a2a3e',
    borderWidth: 1,
    borderColor: '#2a2a3e',
  },
  chipActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderColor: '#3b82f6',
  },
  chipText: {
    color: '#a0aec0',
    fontSize: 14,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#3b82f6',
  },
  actions: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#2a2a3e',
  },
  resetButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    gap: 8,
  },
  resetButtonText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: 'bold',
  },
  searchButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#3b82f6',
    gap: 8,
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
