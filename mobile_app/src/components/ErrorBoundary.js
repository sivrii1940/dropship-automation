import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Ionicons name="alert-circle" size={64} color="#ef4444" />
          <Text style={styles.title}>Bir Hata Oluştu</Text>
          <Text style={styles.message}>
            {this.state.error?.message || 'Beklenmeyen bir hata oluştu'}
          </Text>
          
          {__DEV__ && this.state.errorInfo && (
            <View style={styles.debugContainer}>
              <Text style={styles.debugTitle}>Hata Detayları (Dev Mode):</Text>
              <Text style={styles.debugText}>
                {this.state.errorInfo.componentStack}
              </Text>
            </View>
          )}

          <TouchableOpacity style={styles.button} onPress={this.handleReset}>
            <Ionicons name="refresh" size={20} color="#fff" />
            <Text style={styles.buttonText}>Tekrar Dene</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
    textAlign: 'center',
  },
  message: {
    color: '#a0aec0',
    fontSize: 16,
    marginTop: 12,
    textAlign: 'center',
    lineHeight: 24,
  },
  debugContainer: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    maxHeight: 200,
    width: '100%',
  },
  debugTitle: {
    color: '#f59e0b',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  debugText: {
    color: '#64748b',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 24,
    gap: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ErrorBoundary;
