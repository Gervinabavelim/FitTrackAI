import React from 'react';
import { View } from 'react-native';
import useTheme from '../../hooks/useTheme';
import { COLORS } from '../../utils/constants';

/**
 * Rounded horizontal progress bar (task progress / challenge cards in the reference).
 *
 * Props:
 *   value  — 0..1 fill fraction
 *   color  — fill color (default primary indigo)
 *   height — bar thickness (default 8)
 *   track  — optional custom track color
 */
const ProgressBar = ({ value = 0, color = COLORS.primary, height = 8, track, style }) => {
  const { isDark } = useTheme();
  const clamped = Math.max(0, Math.min(1, value));
  const trackColor = track || (isDark ? COLORS.dark.cardSecondary : '#ECEBE6');

  return (
    <View
      style={[
        { height, borderRadius: height / 2, backgroundColor: trackColor, overflow: 'hidden' },
        style,
      ]}
    >
      <View
        style={{
          height: '100%',
          width: `${clamped * 100}%`,
          borderRadius: height / 2,
          backgroundColor: color,
        }}
      />
    </View>
  );
};

export default ProgressBar;
