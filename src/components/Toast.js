import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useToast } from '../contexts/ToastContext';

const VARIANT_CONFIG = {
  success: { bg: '#22C55E', icon: 'checkmark-circle' },
  error: { bg: '#EF4444', icon: 'close-circle' },
  info: { bg: '#4ADE80', icon: 'information-circle' },
  warning: { bg: '#FBBF24', icon: 'warning' },
};

const Toast = () => {
  const { toast, hideToast } = useToast();
  const topInset = Platform.OS === 'ios' ? 54 : 24;
  const translateY = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    if (toast) {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        speed: 14,
        bounciness: 4,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [toast]);

  if (!toast) return null;

  const config = VARIANT_CONFIG[toast.variant] || VARIANT_CONFIG.info;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: topInset + 8,
          backgroundColor: config.bg,
          transform: [{ translateY }],
        },
      ]}
    >
      <TouchableOpacity style={styles.content} onPress={hideToast} activeOpacity={0.9}>
        <Ionicons name={config.icon} size={20} color="#FFF" />
        <Text style={styles.text}>{toast.message}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
    borderRadius: 8,
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
    paddingVertical: 14,
  },
  text: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
});

export default Toast;
