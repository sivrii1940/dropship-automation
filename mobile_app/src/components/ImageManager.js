import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import ImageGallery from './ImageGallery';

export default function ImageManager({ images = [], onImagesChange, maxImages = 5 }) {
  const [uploading, setUploading] = useState(false);
  const [galleryVisible, setGalleryVisible] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const requestPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'İzin Gerekli',
        'Fotoğraf seçmek için galeri izni gereklidir.',
        [{ text: 'Tamam' }]
      );
      return false;
    }
    return true;
  };

  const pickImage = async () => {
    const hasPermission = await requestPermission();
    if (!hasPermission) return;

    if (images.length >= maxImages) {
      Alert.alert('Limit Aşıldı', `En fazla ${maxImages} görsel ekleyebilirsiniz.`);
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newImage = result.assets[0].uri;
        onImagesChange([...images, newImage]);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Hata', 'Görsel seçilirken bir hata oluştu.');
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'İzin Gerekli',
        'Fotoğraf çekmek için kamera izni gereklidir.',
        [{ text: 'Tamam' }]
      );
      return;
    }

    if (images.length >= maxImages) {
      Alert.alert('Limit Aşıldı', `En fazla ${maxImages} görsel ekleyebilirsiniz.`);
      return;
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newImage = result.assets[0].uri;
        onImagesChange([...images, newImage]);
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Hata', 'Fotoğraf çekilirken bir hata oluştu.');
    }
  };

  const removeImage = (index) => {
    Alert.alert(
      'Görseli Sil',
      'Bu görseli silmek istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: () => {
            const newImages = images.filter((_, i) => i !== index);
            onImagesChange(newImages);
          },
        },
      ]
    );
  };

  const showImageGallery = (index) => {
    setSelectedImageIndex(index);
    setGalleryVisible(true);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Ürün Görselleri</Text>
        <Text style={styles.subtitle}>
          {images.length}/{maxImages}
        </Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageList}>
        {/* Existing Images */}
        {images.map((image, index) => (
          <View key={index} style={styles.imageContainer}>
            <TouchableOpacity onPress={() => showImageGallery(index)}>
              <Image source={{ uri: image }} style={styles.image} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => removeImage(index)}
            >
              <Ionicons name="close-circle" size={24} color="#ef4444" />
            </TouchableOpacity>
            {index === 0 && (
              <View style={styles.primaryBadge}>
                <Text style={styles.primaryText}>Ana</Text>
              </View>
            )}
          </View>
        ))}

        {/* Add New Image Button */}
        {images.length < maxImages && (
          <View style={styles.addButtonContainer}>
            <TouchableOpacity style={styles.addButton} onPress={pickImage}>
              <Ionicons name="images" size={32} color="#3b82f6" />
              <Text style={styles.addButtonText}>Galeri</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.addButton} onPress={takePhoto}>
              <Ionicons name="camera" size={32} color="#3b82f6" />
              <Text style={styles.addButtonText}>Kamera</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {uploading && (
        <View style={styles.uploadingOverlay}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.uploadingText}>Yükleniyor...</Text>
        </View>
      )}

      {images.length > 0 && (
        <ImageGallery
          images={images}
          initialIndex={selectedImageIndex}
          visible={galleryVisible}
          onClose={() => setGalleryVisible(false)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#64748b',
    fontSize: 14,
  },
  imageList: {
    flexDirection: 'row',
  },
  imageContainer: {
    position: 'relative',
    marginRight: 12,
  },
  image: {
    width: 120,
    height: 120,
    borderRadius: 12,
    backgroundColor: '#2a2a3e',
  },
  removeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  primaryBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: '#3b82f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  primaryText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  addButtonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  addButton: {
    width: 120,
    height: 120,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
  },
  addButtonText: {
    color: '#3b82f6',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 4,
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  uploadingText: {
    color: '#fff',
    marginTop: 8,
    fontSize: 14,
  },
});
