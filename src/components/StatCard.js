import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useTheme from '../hooks/useTheme';
import { COLORS } from '../utils/constants';

const StatCard = ({
  icon,
  iconColor,
  value,
  label,
  unit,
  trend,
  trendValue,
  style,
  compact = false,
  delay = 0,
}) => {
  const { isDark, colors } = useTheme();
  const accentColor = iconColor || COLORS.primary;

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, delay, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 400, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  const trendColor =
    trend === 'up' ? COLORS.success :
    trend === 'down' ? COLORS.danger :
    colors.textMuted;

  const trendIcon =
    trend === 'up' ? 'trending-up' :
    trend === 'down' ? 'trending-down' :
    null;

  return (
    <Animated.View
      style={[
        styles.card,
        {
          backgroundColor: isDark ? COLORS.dark.card : COLORS.light.card,
          borderColor: isDark ? COLORS.dark.border : 'transparent',
          padding: compact ? 14 : 16,
          opacity: fadeAnim,
          transform: [{ translateY }],
        },
        style,
      ]}
    >
      {/* Icon container */}
      <View
        style={[
          styles.iconContainer,
          {
            backgroundColor: `${accentColor}12`,
            width: compact ? 38 : 44,
            height: compact ? 38 : 44,
            borderRadius: compact ? 10 : 12,
          },
        ]}
      >
        <Ionicons
          name={icon || 'stats-chart'}
          size={compact ? 18 : 22}
          color={accentColor}
        />
      </View>

      {/* Value and label */}
      <View style={styles.textContainer}>
        <View style={styles.valueRow}>
          <Text
            style={[
              styles.value,
              {
                color: colors.text,
                fontSize: compact ? 22 : 28,
              },
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {value ?? '—'}
          </Text>
          {unit && (
            <Text
              style={[
                styles.unit,
                {
                  color: colors.textMuted,
                  fontSize: compact ? 11 : 13,
                },
              ]}
            >
              {unit}
            </Text>
          )}
        </View>

        <Text
          style={[
            styles.label,
            {
              color: colors.textSecondary,
              fontSize: compact ? 12 : 13,
            },
          ]}
          numberOfLines={2}
        >
          {label}
        </Text>
      </View>

      {/* Trend indicator */}
      {trend && trendValue && (
        <View style={[styles.trendBadge, { backgroundColor: `${trendColor}12` }]}>
          {trendIcon && (
            <Ionicons name={trendIcon} size={12} color={trendColor} />
          )}
          <Text style={[styles.trendText, { color: trendColor }]}>
            {trendValue}
          </Text>
        </View>
      )}
    </Animated.View>
  );
};

// ─── Horizontal variant for dashboard row ─────────────────────────────────────
export const StatCardRow = ({ stats }) => {
  return (
    <View style={rowStyles.container}>
      {stats.map((stat, index) => (
        <StatCard
          key={index}
          {...stat}
          style={[rowStyles.card, index < stats.length - 1 && rowStyles.cardMargin]}
          compact
          delay={index * 80}
        />
      ))}
    </View>
  );
};

// ─── Large hero stat (for progress screen) ────────────────────────────────────
export const HeroStat = ({ icon, iconColor, value, unit, label, isDark, colors, delay = 0 }) => {
  const accentColor = iconColor || COLORS.primary;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 450, delay, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 8, tension: 60, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        heroStyles.container,
        {
          backgroundColor: isDark ? COLORS.dark.card : COLORS.light.card,
          borderColor: isDark ? COLORS.dark.border : 'transparent',
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <View
        style={[
          heroStyles.iconBg,
          { backgroundColor: `${accentColor}15` },
        ]}
      >
        <Ionicons name={icon} size={30} color={accentColor} />
      </View>
      <Text style={[heroStyles.value, { color: isDark ? '#F5F5F5' : '#111' }]}>
        {value}
        {unit && (
          <Text style={[heroStyles.unit, { color: isDark ? '#A0A0A0' : '#555555' }]}>
            {' '}{unit}
          </Text>
        )}
      </Text>
      <Text style={[heroStyles.label, { color: isDark ? '#A0A0A0' : '#555555' }]}>
        {label}
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
  },
  value: {
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  unit: {
    fontWeight: '500',
    marginBottom: 3,
  },
  label: {
    fontWeight: '500',
    marginTop: 2,
    lineHeight: 16,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 8,
  },
  trendText: {
    fontSize: 11,
    fontWeight: '600',
  },
});

const rowStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
  },
  card: {
    flex: 1,
  },
  cardMargin: {
    marginRight: 12,
  },
});

const heroStyles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    marginHorizontal: 6,
  },
  iconBg: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  value: {
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: -1,
  },
  unit: {
    fontSize: 14,
    fontWeight: '500',
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
    textAlign: 'center',
  },
});

export default StatCard;
