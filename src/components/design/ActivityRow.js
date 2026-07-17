import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useTheme from '../../hooks/useTheme';
import { COLORS } from '../../utils/constants';
import IconChip from './IconChip';

/**
 * A single "Activity Plan" style row: tinted icon chip, title + subtitle on the
 * left, a bold value (+ unit) on the right. Used inside a Card list.
 */
const ActivityRow = ({ icon, color = COLORS.primary, title, subtitle, value, unit, onPress, showChevron = false, style }) => {
  const { colors } = useTheme();
  const Wrapper = onPress ? TouchableOpacity : View;

  return (
    <Wrapper onPress={onPress} activeOpacity={0.7} style={[styles.row, style]}>
      <IconChip icon={icon} color={color} size={46} />
      <View style={styles.text}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{title}</Text>
        {subtitle != null && (
          <Text style={[styles.subtitle, { color: colors.textMuted }]} numberOfLines={1}>{subtitle}</Text>
        )}
      </View>
      {value != null && (
        <View style={styles.valueWrap}>
          <Text style={[styles.value, { color: colors.text }]}>{value}</Text>
          {unit && <Text style={[styles.unit, { color: colors.textMuted }]}>{unit}</Text>}
        </View>
      )}
      {showChevron && <Ionicons name="chevron-forward" size={18} color={colors.textMuted} style={{ marginLeft: 8 }} />}
    </Wrapper>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  text: { flex: 1, marginLeft: 14 },
  title: { fontSize: 15, fontWeight: '600', letterSpacing: -0.2 },
  subtitle: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  valueWrap: { flexDirection: 'row', alignItems: 'flex-end', gap: 3 },
  value: { fontSize: 18, fontWeight: '700', letterSpacing: -0.4 },
  unit: { fontSize: 12, fontWeight: '500', marginBottom: 2 },
});

export default ActivityRow;
