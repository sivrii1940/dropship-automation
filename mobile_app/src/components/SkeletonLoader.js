import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';

const SkeletonLoader = ({ width = '100%', height = 20, borderRadius = 8, style }) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
};

// Product Card Skeleton
export const ProductCardSkeleton = () => (
  <View style={styles.productCard}>
    <SkeletonLoader width="100%" height={150} borderRadius={12} />
    <View style={styles.productInfo}>
      <SkeletonLoader width="80%" height={16} style={{ marginBottom: 8 }} />
      <SkeletonLoader width="60%" height={14} style={{ marginBottom: 8 }} />
      <View style={styles.productFooter}>
        <SkeletonLoader width={80} height={20} />
        <SkeletonLoader width={60} height={28} borderRadius={6} />
      </View>
    </View>
  </View>
);

// Order Card Skeleton
export const OrderCardSkeleton = () => (
  <View style={styles.orderCard}>
    <View style={styles.orderHeader}>
      <SkeletonLoader width={120} height={20} />
      <SkeletonLoader width={80} height={24} borderRadius={12} />
    </View>
    <View style={styles.orderBody}>
      <SkeletonLoader width="70%" height={14} style={{ marginBottom: 8 }} />
      <SkeletonLoader width="60%" height={14} style={{ marginBottom: 8 }} />
      <SkeletonLoader width="40%" height={14} />
    </View>
    <View style={styles.orderFooter}>
      <SkeletonLoader width={100} height={12} />
      <SkeletonLoader width={80} height={18} />
    </View>
  </View>
);

// Dashboard Stat Card Skeleton
export const StatCardSkeleton = () => (
  <View style={styles.statCard}>
    <SkeletonLoader width={40} height={40} borderRadius={12} />
    <View style={styles.statContent}>
      <SkeletonLoader width="60%" height={14} style={{ marginBottom: 8 }} />
      <SkeletonLoader width="80%" height={24} style={{ marginBottom: 4 }} />
      <SkeletonLoader width="50%" height={12} />
    </View>
  </View>
);

// List Skeleton
export const ListSkeleton = ({ count = 5, ItemSkeleton = OrderCardSkeleton }) => (
  <View style={styles.listContainer}>
    {Array.from({ length: count }).map((_, index) => (
      <ItemSkeleton key={index} />
    ))}
  </View>
);

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#2a2a3e',
  },
  productCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  productInfo: {
    padding: 12,
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  orderCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderBody: {
    marginBottom: 12,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#2a2a3e',
  },
  statCard: {
    flexDirection: 'row',
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  statContent: {
    flex: 1,
    marginLeft: 12,
  },
  listContainer: {
    padding: 16,
  },
});

export default SkeletonLoader;
