import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../utils/constants';

/**
 * Rounded-square tinted icon container — the colorful chips in the reference
 * (indigo / coral / green). Background is the accent at low alpha; icon is solid.
 *
 * Props:
 *   icon   — Ionicons name
 *   color  — accent color (default primary indigo)
 *   size   — chip side length (default 48)
 *   solid  — filled accent background with white icon instead of tinted (default false)
 */
const IconChip = ({ icon, color = COLORS.primary, size = 48, solid = false, style }) => {
  const radius = Math.round(size * 0.32);
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: radius,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: solid ? color : `${color}18`,
        },
        style,
      ]}
    >
      <Ionicons name={icon} size={Math.round(size * 0.46)} color={solid ? '#FFF' : color} />
    </View>
  );
};

export default IconChip;
