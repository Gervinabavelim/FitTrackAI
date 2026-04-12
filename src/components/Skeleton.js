import React, { useEffect, useRef } from 'react';
import { View, Animated, Easing, StyleSheet } from 'react-native';
import useTheme from '../hooks/useTheme';

/**
 * Shimmer placeholder. Pass width/height/borderRadius to shape it, or compose
 * several for a card skeleton. Pulses the background between two theme tones.
 */
const Skeleton = ({ width = '100%', height = 16, borderRadius = 8, style }) => {
  const { isDark } = useTheme();
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  const backgroundColor = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: isDark
      ? ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.12)']
      : ['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.1)'],
  });

  return (
    <Animated.View
      style={[{ width, height, borderRadius, backgroundColor }, style]}
    />
  );
};

export const SkeletonCard = ({ height = 120 }) => (
  <View style={styles.card}>
    <Skeleton width="60%" height={14} />
    <Skeleton width="90%" height={height - 60} style={{ marginTop: 12 }} />
    <Skeleton width="40%" height={12} style={{ marginTop: 12 }} />
  </View>
);

export const SkeletonStatRow = () => (
  <View style={styles.row}>
    {[0, 1, 2, 3].map((i) => (
      <Skeleton key={i} width={110} height={100} borderRadius={16} />
    ))}
  </View>
);

const styles = StyleSheet.create({
  card: {
    padding: 16,
    marginVertical: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
  },
});

export default Skeleton;
