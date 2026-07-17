import React from 'react';
import { View, StyleSheet } from 'react-native';
import useTheme from '../../hooks/useTheme';
import { COLORS } from '../../utils/constants';

/**
 * Rounded, soft-shadowed surface — the base card of the design language.
 * White on cream in light mode; elevated dark card with a hairline border in dark.
 *
 * Props:
 *   padding   — inner padding (default 20)
 *   radius    — corner radius (default 24)
 *   elevated  — apply the soft drop shadow (default true, light mode only)
 */
const Card = ({ children, style, padding = 20, radius = 24, elevated = true }) => {
  const { isDark } = useTheme();

  return (
    <View
      style={[
        {
          backgroundColor: isDark ? COLORS.dark.card : COLORS.light.card,
          borderRadius: radius,
          padding,
          borderWidth: isDark ? StyleSheet.hairlineWidth : 0,
          borderColor: isDark ? COLORS.dark.border : 'transparent',
        },
        elevated && !isDark && styles.shadow,
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  shadow: {
    shadowColor: '#1A1A2E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
});

export default Card;
