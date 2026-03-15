import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, Easing, StyleSheet } from 'react-native';
import useTheme from '../hooks/useTheme';
import { COLORS } from '../utils/constants';

/**
 * Animated loading spinner component
 *
 * Props:
 * - size: 'small' | 'medium' | 'large' (default: 'medium')
 * - message: string (optional label below spinner)
 * - fullScreen: bool (center in full screen)
 * - color: string (custom spinner color)
 */
const LoadingSpinner = ({
  size = 'medium',
  message,
  fullScreen = false,
  color,
}) => {
  const { isDark, colors } = useTheme();
  const rotation = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  const spinnerColor = color || COLORS.primary;

  // Continuous rotation animation
  useEffect(() => {
    const spinAnimation = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    // Pulse for the message text
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.6,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    spinAnimation.start();
    if (message) pulseAnimation.start();

    return () => {
      spinAnimation.stop();
      pulseAnimation.stop();
    };
  }, [message]);

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const sizeMap = {
    small: 24,
    medium: 40,
    large: 60,
  };

  const borderMap = {
    small: 3,
    medium: 4,
    large: 5,
  };

  const spinnerSize = sizeMap[size] || sizeMap.medium;
  const borderWidth = borderMap[size] || borderMap.medium;

  const containerStyle = [
    styles.container,
    fullScreen && {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: isDark ? 'rgba(10, 10, 10, 0.85)' : 'rgba(245, 245, 245, 0.85)',
      zIndex: 999,
    },
  ];

  return (
    <View style={containerStyle}>
      {/* Outer glow ring */}
      <View
        style={[
          styles.glowRing,
          {
            width: spinnerSize + 16,
            height: spinnerSize + 16,
            borderRadius: (spinnerSize + 16) / 2,
            backgroundColor: `${spinnerColor}15`,
          },
        ]}
      />

      {/* Spinning ring */}
      <Animated.View
        style={[
          styles.spinner,
          {
            width: spinnerSize,
            height: spinnerSize,
            borderRadius: spinnerSize / 2,
            borderWidth,
            borderTopColor: spinnerColor,
            borderRightColor: `${spinnerColor}40`,
            borderBottomColor: `${spinnerColor}20`,
            borderLeftColor: `${spinnerColor}60`,
            transform: [{ rotate: spin }],
          },
        ]}
      />

      {/* Optional message */}
      {message && (
        <Animated.Text
          style={[
            styles.message,
            {
              color: colors.textSecondary,
              opacity: pulse,
              marginTop: size === 'large' ? 16 : 12,
            },
          ]}
        >
          {message}
        </Animated.Text>
      )}
    </View>
  );
};

// ─── Inline Loading (for buttons / inside containers) ─────────────────────────
export const InlineSpinner = ({ color, size = 20 }) => {
  const { colors } = useTheme();
  const rotation = useRef(new Animated.Value(0)).current;
  const spinnerColor = color || COLORS.primary;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 800,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    anim.start();
    return () => anim.stop();
  }, []);

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 2,
        borderTopColor: spinnerColor,
        borderRightColor: `${spinnerColor}40`,
        borderBottomColor: `${spinnerColor}20`,
        borderLeftColor: `${spinnerColor}60`,
        transform: [{ rotate: spin }],
      }}
    />
  );
};

// ─── AI Loading State ─────────────────────────────────────────────────────────
export const AILoadingState = ({ isDark }) => {
  const dots = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  useEffect(() => {
    const animations = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 200),
          Animated.timing(dot, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      )
    );
    animations.forEach((a) => a.start());
    return () => animations.forEach((a) => a.stop());
  }, []);

  return (
    <View style={styles.aiContainer}>
      <LoadingSpinner size="large" color={COLORS.primary} />
      <Text
        style={[
          styles.aiTitle,
          { color: isDark ? '#F5F5F5' : '#FFF' },
        ]}
      >
        AI is crafting your plan
      </Text>
      <View style={styles.dotsRow}>
        {dots.map((dot, i) => (
          <Animated.View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor: COLORS.primary,
                opacity: dot,
                transform: [
                  {
                    scale: dot.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.6, 1],
                    }),
                  },
                ],
              },
            ]}
          />
        ))}
      </View>
      <Text style={[styles.aiSubtext, { color: isDark ? '#A0A0A0' : '#555555' }]}>
        Analyzing your profile and workout history...
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowRing: {
    position: 'absolute',
  },
  spinner: {
    // border colors set inline
  },
  message: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  aiContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  aiTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 24,
    textAlign: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  aiSubtext: {
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
});

export default LoadingSpinner;
