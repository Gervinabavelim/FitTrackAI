import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useTheme from '../hooks/useTheme';
import { COLORS } from '../utils/constants';

/**
 * Reusable stat card with icon, value, and label
 *
 * Props:
 * - icon: Ionicons icon name (string)
 * - iconColor: color string (default primary)
 * - value: string | number — the main value to display
 * - label: string — description label below the value
 * - unit: string — optional unit appended to value (e.g., "kcal", "days")
 * - trend: 'up' | 'down' | null — show trend indicator
 * - trendValue: string — trend percentage or absolute change
 * - style: ViewStyle — additional container styles
 * - compact: bool — smaller version for dense layouts
 */
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
}) => {
  const { isDark, colors } = useTheme();
  const accentColor = iconColor || COLORS.primary;

  const trendColor =
    trend === 'up' ? COLORS.success :
    trend === 'down' ? COLORS.danger :
    colors.textMuted;

  const trendIcon =
    trend === 'up' ? 'trending-up' :
    trend === 'down' ? 'trending-down' :
    null;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isDark ? COLORS.dark.card : COLORS.light.card,
          borderColor: isDark ? COLORS.dark.border : COLORS.light.border,
          padding: compact ? 12 : 16,
        },
        style,
      ]}
    >
      {/* Icon container */}
      <View
        style={[
          styles.iconContainer,
          {
            backgroundColor: `${accentColor}18`,
            width: compact ? 36 : 44,
            height: compact ? 36 : 44,
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
                fontSize: compact ? 20 : 26,
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
              fontSize: compact ? 11 : 12,
            },
          ]}
          numberOfLines={2}
        >
          {label}
        </Text>
      </View>

      {/* Trend indicator */}
      {trend && trendValue && (
        <View style={[styles.trendBadge, { backgroundColor: `${trendColor}18` }]}>
          {trendIcon && (
            <Ionicons name={trendIcon} size={12} color={trendColor} />
          )}
          <Text style={[styles.trendText, { color: trendColor }]}>
            {trendValue}
          </Text>
        </View>
      )}
    </View>
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
        />
      ))}
    </View>
  );
};

// ─── Large hero stat (for progress screen) ────────────────────────────────────
export const HeroStat = ({ icon, iconColor, value, unit, label, isDark, colors }) => {
  const accentColor = iconColor || COLORS.primary;

  return (
    <View
      style={[
        heroStyles.container,
        {
          backgroundColor: isDark ? COLORS.dark.card : COLORS.light.card,
          borderColor: isDark ? COLORS.dark.border : COLORS.light.border,
        },
      ]}
    >
      <View
        style={[
          heroStyles.iconBg,
          { backgroundColor: `${accentColor}20` },
        ]}
      >
        <Ionicons name={icon} size={32} color={accentColor} />
      </View>
      <Text style={[heroStyles.value, { color: isDark ? '#F1F5F9' : '#0F172A' }]}>
        {value}
        {unit && (
          <Text style={[heroStyles.unit, { color: isDark ? '#94A3B8' : '#64748B' }]}>
            {' '}{unit}
          </Text>
        )}
      </Text>
      <Text style={[heroStyles.label, { color: isDark ? '#94A3B8' : '#64748B' }]}>
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
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
    marginBottom: 2,
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
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    marginHorizontal: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  iconBg: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  value: {
    fontSize: 28,
    fontWeight: '800',
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
