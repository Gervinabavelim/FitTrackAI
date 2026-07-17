import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../utils/constants';

/**
 * Small "PRO" badge shown next to pro features
 */
export const ProBadge = ({ size = 'small' }) => {
  const isSmall = size === 'small';
  return (
    <View
      style={[
        styles.badge,
        {
          paddingHorizontal: isSmall ? 6 : 10,
          paddingVertical: isSmall ? 2 : 4,
          borderRadius: isSmall ? 4 : 6,
        },
      ]}
    >
      <Ionicons name="diamond" size={isSmall ? 10 : 14} color={COLORS.warning} />
      <Text
        style={[
          styles.badgeText,
          { fontSize: isSmall ? 9 : 12 },
        ]}
      >
        PRO
      </Text>
    </View>
  );
};

/**
 * Lock overlay shown on gated features for free users.
 * Tapping navigates to the paywall.
 */
export const ProLockOverlay = ({ navigation, feature, message, colors, isDark }) => (
  <View
    style={[
      styles.lockCard,
      {
        backgroundColor: isDark ? COLORS.dark.card : COLORS.light.card,
        borderColor: isDark ? COLORS.dark.border : COLORS.light.border,
      },
    ]}
  >
    <View style={[styles.lockIcon, { backgroundColor: `${COLORS.warning}18` }]}>
      <Ionicons name="lock-closed" size={28} color={COLORS.warning} />
    </View>
    <Text style={[styles.lockTitle, { color: colors.text }]}>
      Pro Feature
    </Text>
    <Text style={[styles.lockMessage, { color: colors.textSecondary }]}>
      {message}
    </Text>
    <TouchableOpacity
      style={styles.upgradeBtn}
      onPress={() => navigation.navigate('Paywall', { feature })}
      activeOpacity={0.85}
    >
      <Ionicons name="diamond" size={16} color="#FFF" />
      <Text style={styles.upgradeBtnText}>Upgrade to Pro</Text>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: `${COLORS.warning}18`,
  },
  badgeText: {
    fontWeight: '800',
    color: COLORS.warning,
    letterSpacing: 0.5,
  },
  lockCard: {
    alignItems: 'center',
    padding: 32,
    borderRadius: 12,
    borderWidth: 1,
    marginHorizontal: 20,
    marginVertical: 20,
  },
  lockIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  lockTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
  },
  lockMessage: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  upgradeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
  },
  upgradeBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
