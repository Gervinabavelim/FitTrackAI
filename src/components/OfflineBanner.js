import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet, Platform, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useNetworkStatus from '../hooks/useNetworkStatus';

const OfflineBanner = () => {
  const { isConnected } = useNetworkStatus();
  const translateY = useRef(new Animated.Value(-80)).current;
  const topInset = Platform.OS === 'ios' ? 54 : 24;

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: isConnected ? -80 : 0,
      useNativeDriver: true,
      speed: 14,
      bounciness: 4,
    }).start();
  }, [isConnected]);

  if (isConnected) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: topInset + 8,
          transform: [{ translateY }],
        },
      ]}
    >
      <View style={styles.content}>
        <Ionicons name="cloud-offline-outline" size={18} color="#FFF" />
        <Text style={styles.text}>No internet connection</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9998,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 10,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  text: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
});

export default OfflineBanner;
