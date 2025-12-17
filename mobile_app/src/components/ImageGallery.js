import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PinchGestureHandler, State } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function ImageGallery({ images, initialIndex = 0, visible, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [loading, setLoading] = useState({});
  const scale = useSharedValue(1);

  const pinchHandler = useAnimatedGestureHandler({
    onActive: (event) => {
      scale.value = Math.max(1, Math.min(event.scale, 4));
    },
    onEnd: () => {
      if (scale.value < 1.5) {
        scale.value = withTiming(1);
      }
    },
  });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handleImageLoad = (index) => {
    setLoading(prev => ({ ...prev, [index]: false }));
  };

  const handleImageLoadStart = (index) => {
    setLoading(prev => ({ ...prev, [index]: true }));
  };

  const renderImage = ({ item, index }) => (
    <View style={styles.imageContainer}>
      <PinchGestureHandler onGestureEvent={pinchHandler}>
        <Animated.View style={[styles.imageWrapper, animatedStyle]}>
          {loading[index] && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3b82f6" />
            </View>
          )}
          <Image
            source={{ uri: item }}
            style={styles.fullImage}
            resizeMode="contain"
            onLoadStart={() => handleImageLoadStart(index)}
            onLoad={() => handleImageLoad(index)}
          />
        </Animated.View>
      </PinchGestureHandler>
    </View>
  );

  const renderThumbnail = ({ item, index }) => (
    <TouchableOpacity
      style={[
        styles.thumbnail,
        currentIndex === index && styles.thumbnailActive,
      ]}
      onPress={() => setCurrentIndex(index)}
    >
      <Image source={{ uri: item }} style={styles.thumbnailImage} />
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalContainer}>
        {/* Close Button */}
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Ionicons name="close" size={30} color="#fff" />
        </TouchableOpacity>

        {/* Main Image Viewer */}
        <FlatList
          data={images}
          renderItem={renderImage}
          keyExtractor={(_, index) => index.toString()}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(event) => {
            const index = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
            setCurrentIndex(index);
            scale.value = withTiming(1);
          }}
          initialScrollIndex={initialIndex}
          getItemLayout={(_, index) => ({
            length: SCREEN_WIDTH,
            offset: SCREEN_WIDTH * index,
            index,
          })}
        />

        {/* Counter */}
        <View style={styles.counter}>
          <Text style={styles.counterText}>
            {currentIndex + 1} / {images.length}
          </Text>
        </View>

        {/* Thumbnail Navigation */}
        {images.length > 1 && (
          <View style={styles.thumbnailContainer}>
            <FlatList
              data={images}
              renderItem={renderThumbnail}
              keyExtractor={(_, index) => index.toString()}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.thumbnailList}
            />
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 100,
    padding: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 25,
  },
  imageContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageWrapper: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.7,
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  counter: {
    position: 'absolute',
    top: 60,
    left: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 10,
    borderRadius: 8,
  },
  counterText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  thumbnailContainer: {
    position: 'absolute',
    bottom: 30,
    width: SCREEN_WIDTH,
  },
  thumbnailList: {
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  thumbnail: {
    width: 60,
    height: 60,
    marginHorizontal: 5,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  thumbnailActive: {
    borderColor: '#3b82f6',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
});
