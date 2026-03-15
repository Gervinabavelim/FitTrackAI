import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
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
            borderRadius: compact ? 8 : 10,
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
                fontSize: compact ? 22 : 30,
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
      <Text style={[heroStyles.value, { color: isDark ? '#F5F5F5' : '#FFF' }]}>
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
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 10,
    borderWidth: 1,
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
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  unit: {
    fontWeight: '500',
    marginBottom: 2,
  },
  label: {
    fontWeight: '600',
    marginTop: 2,
    lineHeight: 16,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1.0,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
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
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    marginHorizontal: 6,
  },
  iconBg: {
    width: 60,
    height: 60,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  value: {
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: -1,
  },
  unit: {
    fontSize: 14,
    fontWeight: '500',
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1.0,
  },
});

export default StatCard;
