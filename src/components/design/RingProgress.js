import React from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import useTheme from '../../hooks/useTheme';
import { COLORS } from '../../utils/constants';

/**
 * Concentric circular progress rings, like the Exercise/Stand card in the reference.
 *
 * Props:
 *   size    — outer diameter (default 120)
 *   stroke  — ring thickness (default 12)
 *   gap     — spacing between concentric rings (default 6)
 *   rings   — [{ value: 0..1, color }]; first item is the outermost ring
 *   children— centered content (e.g. a value label)
 */
const RingProgress = ({ size = 120, stroke = 12, gap = 6, rings = [], children }) => {
  const { isDark } = useTheme();
  const trackColor = isDark ? COLORS.dark.cardSecondary : '#ECEBE6';
  const center = size / 2;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        {rings.map((ring, i) => {
          const r = center - stroke / 2 - i * (stroke + gap);
          if (r <= 0) return null;
          const circumference = 2 * Math.PI * r;
          const clamped = Math.max(0, Math.min(1, ring.value || 0));
          return (
            <React.Fragment key={i}>
              <Circle
                cx={center}
                cy={center}
                r={r}
                stroke={trackColor}
                strokeWidth={stroke}
                fill="none"
              />
              <Circle
                cx={center}
                cy={center}
                r={r}
                stroke={ring.color || COLORS.primary}
                strokeWidth={stroke}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - clamped)}
                transform={`rotate(-90 ${center} ${center})`}
              />
            </React.Fragment>
          );
        })}
      </Svg>
      {children}
    </View>
  );
};

export default RingProgress;
