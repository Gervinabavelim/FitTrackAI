import React, { useRef } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import useTheme from '../../hooks/useTheme';
import { COLORS } from '../../utils/constants';

// Module-level counter so each mounted ring set gets globally-unique gradient ids
// (SVG <defs> ids must be unique across every rendered Svg on the screen).
let _ringUid = 0;

/**
 * Concentric circular progress rings, like the Exercise/Stand card in the reference.
 *
 * Props:
 *   size    — outer diameter (default 120)
 *   stroke  — ring thickness (default 12)
 *   gap     — spacing between concentric rings (default 6)
 *   rings   — [{ value: 0..1, color, gradient: ['#start','#end'] }]; first item is the
 *             outermost ring. `gradient` (two colors) takes precedence over `color`.
 *   children— centered content (e.g. a value label)
 */
const RingProgress = ({ size = 120, stroke = 12, gap = 6, rings = [], children }) => {
  const { isDark } = useTheme();
  const uidRef = useRef(null);
  if (uidRef.current === null) uidRef.current = ++_ringUid;
  const uid = uidRef.current;

  const trackColor = isDark ? COLORS.dark.cardSecondary : '#ECEBE6';
  const center = size / 2;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Defs>
          {rings.map((ring, i) =>
            ring.gradient ? (
              <LinearGradient key={i} id={`rg${uid}_${i}`} x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor={ring.gradient[0]} />
                <Stop offset="1" stopColor={ring.gradient[1]} />
              </LinearGradient>
            ) : null
          )}
        </Defs>
        {rings.map((ring, i) => {
          const r = center - stroke / 2 - i * (stroke + gap);
          if (r <= 0) return null;
          const circumference = 2 * Math.PI * r;
          const clamped = Math.max(0, Math.min(1, ring.value || 0));
          const strokeColor = ring.gradient ? `url(#rg${uid}_${i})` : (ring.color || COLORS.primary);
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
                stroke={strokeColor}
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
