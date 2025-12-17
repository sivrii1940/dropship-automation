import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';

export default function LoginScreen({ navigation, onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Hata', 'Email ve şifre gereklidir');
      return;
    }

    try {
      setLoading(true);
      const response = await api.login(email.trim(), password);
      
      if (response.success) {
        Alert.alert('Başarılı', 'Giriş yapıldı!');
        onLogin(response.data);
      } else {
        Alert.alert('Hata', response.error || 'Giriş başarısız');
      }
    } catch (err) {
      console.error('Login error:', err);
      Alert.alert('Hata', err.response?.data?.detail || 'Giriş yapılamadı');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo / Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Ionicons name="cube" size={60} color="#3b82f6" />
          </View>
          <Text style={styles.title}>Dropship Panel</Text>
          <Text style={styles.subtitle}>Trendyol → Shopify Entegrasyon</Text>
        </View>

        {/* Login Form */}
        <View style={styles.form}>
          <Text style={styles.formTitle}>Giriş Yap</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color="#64748b" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="ornek@email.com"
                placeholderTextColor="#64748b"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Şifre</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#64748b" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor="#64748b"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons 
                  name={showPassword ? "eye-off-outline" : "eye-outline"} 
                  size={20} 
                  color="#64748b" 
                />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="log-in-outline" size={24} color="#fff" />
                <Text style={styles.loginButtonText}>Giriş Yap</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Register Link */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Hesabınız yok mu?</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.registerLink}>Kayıt Ol</Text>
          </TouchableOpacity>
        </View>

        {/* API Settings */}
        <TouchableOpacity 
          style={styles.apiSettingsButton}
          onPress={() => navigation.navigate('ApiSettings')}
        >
          <Ionicons name="settings-outline" size={16} color="#64748b" />
          <Text style={styles.apiSettingsText}>API Sunucu Ayarları</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    width: 100,
    height: 100,
    backgroundColor: '#1a1a2e',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
  },
  form: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 24,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    color: '#a0aec0',
    fontSize: 14,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a3e',
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    paddingVertical: 14,
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 8,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  footerText: {
    color: '#64748b',
    fontSize: 14,
  },
  registerLink: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  apiSettingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  apiSettingsText: {
    color: '#64748b',
    fontSize: 12,
    marginLeft: 6,
  },
});
