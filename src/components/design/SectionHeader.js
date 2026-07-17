import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import useTheme from '../../hooks/useTheme';

/**
 * Bold section title on the left with an optional muted "See All" action on the right.
 * Matches the "Today Starts / See All" headers in the reference.
 */
const SectionHeader = ({ title, actionLabel = 'See All', onAction, style }) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.row, style]}>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      {onAction && (
        <TouchableOpacity onPress={onAction} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={[styles.action, { color: colors.textMuted }]}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  title: { fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
  action: { fontSize: 13, fontWeight: '500' },
});

export default SectionHeader;
