import React from 'react';
import { View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import useTheme from '../../hooks/useTheme';
import { COLORS } from '../../utils/constants';

/**
 * Compact vertical bar chart (the Calories card mini-chart in the reference).
 * Highlights the most recent bar in the accent color; the rest are muted.
 *
 * Props:
 *   data   — array of numbers
 *   color  — accent color for the latest bar (default success green)
 *   width  — chart width (default 120)
 *   height — chart height (default 40)
 */
const MiniBars = ({ data = [], color = COLORS.success, width = 120, height = 40 }) => {
  const { isDark } = useTheme();
  const mutedColor = isDark ? COLORS.dark.cardSecondary : '#E4E3DE';
  const values = data.length ? data : [0];
  const max = Math.max(...values, 1);
  const n = values.length;
  const gap = 3;
  const barW = Math.max((width - gap * (n - 1)) / n, 2);

  return (
    <Svg width={width} height={height}>
      {values.map((v, i) => {
        const h = Math.max((v / max) * height, 2);
        const x = i * (barW + gap);
        const isLast = i === n - 1;
        return (
          <Rect
            key={i}
            x={x}
            y={height - h}
            width={barW}
            height={h}
            rx={Math.min(barW / 2, 3)}
            fill={isLast ? color : mutedColor}
          />
        );
      })}
    </Svg>
  );
};

export default MiniBars;
