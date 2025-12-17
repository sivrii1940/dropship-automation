import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';

export default function ApiSettingsScreen({ navigation }) {
  const [apiUrl, setApiUrl] = useState('');

  useEffect(() => {
    setApiUrl(api.baseUrl);
  }, []);

  const saveApiUrl = async () => {
    if (!apiUrl.trim()) {
      Alert.alert('Hata', 'API URL gereklidir');
      return;
    }

    // URL formatı kontrolü
    if (!apiUrl.startsWith('http://') && !apiUrl.startsWith('https://')) {
      Alert.alert('Hata', 'URL http:// veya https:// ile başlamalıdır');
      return;
    }

    try {
      await api.setApiUrl(apiUrl.trim());
      Alert.alert('Başarılı', 'API URL kaydedildi', [
        { text: 'Tamam', onPress: () => navigation.goBack() }
      ]);
    } catch (err) {
      Alert.alert('Hata', 'API URL kaydedilemedi');
    }
  };

  const testConnection = async () => {
    if (!apiUrl.trim()) {
      Alert.alert('Hata', 'Önce API URL girin');
      return;
    }

    try {
      // Önce URL'yi geçici olarak ayarla
      const oldUrl = api.baseUrl;
      api.baseUrl = apiUrl.trim();
      
      const response = await api.testConnection();
      if (response) {
        Alert.alert('Başarılı', 'API sunucusuna bağlantı başarılı!');
      } else {
        api.baseUrl = oldUrl; // Başarısızsa eski URL'ye dön
        Alert.alert('Hata', 'Bağlantı başarısız');
      }
    } catch (err) {
      console.log('Connection error:', err.message);
      Alert.alert('Hata', 'API sunucusuna bağlanılamadı.\n\n• URL doğru mu kontrol edin\n• Bilgisayar ve telefon aynı WiFi\'da mı?\n• API sunucusu çalışıyor mu?');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.header}>
          <Ionicons name="server-outline" size={40} color="#3b82f6" />
          <Text style={styles.title}>API Sunucu Ayarları</Text>
        </View>

        <Text style={styles.description}>
          Mobil uygulamanın API sunucusuna bağlanması için bilgisayarınızın 
          yerel IP adresini girin. Bilgisayar ve telefon aynı WiFi ağında olmalıdır.
        </Text>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={20} color="#3b82f6" />
          <Text style={styles.infoText}>
            Windows: ipconfig komutu ile IP adresinizi öğrenin
          </Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>API URL</Text>
          <TextInput
            style={styles.input}
            value={apiUrl}
            onChangeText={setApiUrl}
            placeholder="http://192.168.1.100:8000"
            placeholderTextColor="#64748b"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <TouchableOpacity style={styles.testButton} onPress={testConnection}>
          <Ionicons name="flash-outline" size={20} color="#3b82f6" />
          <Text style={styles.testButtonText}>Bağlantıyı Test Et</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.saveButton} onPress={saveApiUrl}>
          <Ionicons name="save-outline" size={20} color="#fff" />
          <Text style={styles.saveButtonText}>Kaydet</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={styles.backButton} 
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={20} color="#64748b" />
        <Text style={styles.backButtonText}>Geri Dön</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
    padding: 24,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 12,
  },
  description: {
    color: '#a0aec0',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a3e',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  infoText: {
    color: '#a0aec0',
    fontSize: 12,
    marginLeft: 8,
    flex: 1,
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
    borderRadius: 12,
    padding: 14,
    color: '#fff',
    fontSize: 16,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2a2a3e',
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 12,
  },
  testButtonText: {
    color: '#3b82f6',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 14,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  backButtonText: {
    color: '#64748b',
    fontSize: 14,
    marginLeft: 8,
  },
});
