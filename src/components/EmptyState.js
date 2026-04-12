import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useTheme from '../hooks/useTheme';
import { COLORS } from '../utils/constants';

/**
 * Shared empty-state block. Consolidates the ad-hoc "no data" views so they
 * all feel consistent. Optional CTA becomes a primary button.
 */
const EmptyState = ({
  icon = 'sparkles-outline',
  title,
  subtitle,
  ctaLabel,
  onCtaPress,
  style,
}) => {
  const { colors } = useTheme();
  return (
    <View style={[styles.wrap, style]}>
      <View style={[styles.iconRing, { backgroundColor: `${COLORS.primary}15` }]}>
        <Ionicons name={icon} size={36} color={COLORS.primary} />
      </View>
      {title ? (
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      ) : null}
      {subtitle ? (
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text>
      ) : null}
      {ctaLabel && onCtaPress ? (
        <TouchableOpacity
          onPress={onCtaPress}
          style={[styles.cta, { backgroundColor: COLORS.primary }]}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaText}>{ctaLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  iconRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  cta: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 999,
  },
  ctaText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 15,
  },
});

export default EmptyState;
