import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

class HapticService {
  constructor() {
    this.enabled = Platform.OS === 'ios' || Platform.OS === 'android';
  }

  // Hafif dokunma
  light() {
    if (!this.enabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  // Orta dokunma
  medium() {
    if (!this.enabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }

  // Ağır dokunma
  heavy() {
    if (!this.enabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }

  // Başarı bildirimi
  success() {
    if (!this.enabled) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  // Hata bildirimi
  error() {
    if (!this.enabled) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }

  // Uyarı bildirimi
  warning() {
    if (!this.enabled) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }

  // Seçim feedback'i
  selection() {
    if (!this.enabled) return;
    Haptics.selectionAsync();
  }

  // Feedback açık/kapalı
  setEnabled(enabled) {
    this.enabled = enabled && (Platform.OS === 'ios' || Platform.OS === 'android');
  }

  isEnabled() {
    return this.enabled;
  }
}

export default new HapticService();
