import React from 'react';
import Svg, { Polyline, Circle } from 'react-native-svg';
import { COLORS } from '../../utils/constants';

/**
 * Minimal line chart (the Activity Tracking squiggle in the reference).
 *
 * Props:
 *   data   — array of numbers
 *   color  — line color (default primary indigo)
 *   width  — chart width (default 120)
 *   height — chart height (default 40)
 */
const Sparkline = ({ data = [], color = COLORS.primary, width = 120, height = 40 }) => {
  const values = data.length > 1 ? data : [0, 0];
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const n = values.length;
  const pad = 3;
  const stepX = (width - pad * 2) / (n - 1);

  const points = values.map((v, i) => {
    const x = pad + i * stepX;
    const y = pad + (1 - (v - min) / range) * (height - pad * 2);
    return { x, y };
  });

  const last = points[points.length - 1];

  return (
    <Svg width={width} height={height}>
      <Polyline
        points={points.map((p) => `${p.x},${p.y}`).join(' ')}
        fill="none"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={last.x} cy={last.y} r={3.5} fill={color} />
    </Svg>
  );
};

export default Sparkline;
