import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import useTheme from '../hooks/useTheme';
import useHaptics from '../hooks/useHaptics';
import { COLORS, EXERCISE_CATEGORIES } from '../utils/constants';
import { formatDuration } from '../utils/calculations';

const WorkoutCard = ({ workout, onDelete, onPress, compact = false }) => {
  const { isDark, colors } = useTheme();
  const haptics = useHaptics();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const getCategoryColor = (exerciseName) => {
    for (const [, cat] of Object.entries(EXERCISE_CATEGORIES)) {
      if (cat.exercises.includes(exerciseName)) {
        return cat.color;
      }
    }
    return COLORS.primary;
  };

  const categoryColor = getCategoryColor(workout.exerciseName || '');

  const formattedDate = (() => {
    try {
      const date = typeof workout.date === 'string' ? parseISO(workout.date) : new Date(workout.date);
      return format(date, 'EEE, MMM d');
    } catch {
      return 'Unknown date';
    }
  })();

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 50,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
    }).start();
  };

  const handleDelete = () => {
    haptics.warning();
    Alert.alert(
      'Delete Workout',
      `Remove "${workout.exerciseName || 'this workout'}" from your history?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDelete && onDelete(workout.id),
        },
      ]
    );
  };

  if (compact) {
    return (
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
      >
        <Animated.View
          style={[
            styles.compactCard,
            {
              backgroundColor: isDark ? COLORS.dark.card : COLORS.light.card,
              borderColor: isDark ? COLORS.dark.border : COLORS.light.border,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <View style={[styles.accentBar, { backgroundColor: categoryColor }]} />

          <View style={styles.compactContent}>
            <View style={styles.compactLeft}>
              <Text
                style={[styles.exerciseName, { color: colors.text, fontSize: 14 }]}
                numberOfLines={1}
              >
                {workout.exerciseName || 'Workout'}
              </Text>
              <Text style={[styles.dateText, { color: colors.textMuted }]}>
                {formattedDate}
              </Text>
            </View>

            <View style={styles.compactStats}>
              {workout.sets && workout.reps && (
                <Text style={[styles.statChip, { backgroundColor: `${categoryColor}18`, color: categoryColor }]}>
                  {workout.sets}x{workout.reps}
                </Text>
              )}
              {workout.calories ? (
                <Text style={[styles.calorieText, { color: colors.textSecondary }]}>
                  {workout.calories} kcal
                </Text>
              ) : null}
            </View>
          </View>
        </Animated.View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={0.9}
    >
      <Animated.View
        style={[
          styles.card,
          {
            backgroundColor: isDark ? COLORS.dark.card : COLORS.light.card,
            borderColor: isDark ? COLORS.dark.border : COLORS.light.border,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <View
              style={[
                styles.exerciseIcon,
                { backgroundColor: `${categoryColor}20` },
              ]}
            >
              <Ionicons
                name={getExerciseIcon(workout.exerciseName)}
                size={20}
                color={categoryColor}
              />
            </View>
            <View>
              <Text
                style={[styles.exerciseName, { color: colors.text }]}
                numberOfLines={1}
              >
                {workout.exerciseName || 'Workout'}
              </Text>
              <Text style={[styles.dateText, { color: colors.textMuted }]}>
                {formattedDate}
              </Text>
            </View>
          </View>

          {onDelete && (
            <TouchableOpacity onPress={handleDelete} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
              <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
            </TouchableOpacity>
          )}
        </View>

        {/* Divider */}
        <View
          style={[
            styles.divider,
            { backgroundColor: isDark ? COLORS.dark.border : COLORS.light.border },
          ]}
        />

        {/* Stats grid */}
        <View style={styles.statsGrid}>
          {workout.sets != null && (
            <StatItem icon="repeat" value={workout.sets} label="Sets" color={categoryColor} isDark={isDark} colors={colors} />
          )}
          {workout.reps != null && (
            <StatItem icon="shuffle" value={workout.reps} label="Reps" color={categoryColor} isDark={isDark} colors={colors} />
          )}
          {workout.weight != null && (
            <StatItem icon="barbell-outline" value={`${workout.weight}kg`} label="Weight" color={categoryColor} isDark={isDark} colors={colors} />
          )}
          {workout.duration != null && (
            <StatItem icon="time-outline" value={formatDuration(workout.duration)} label="Duration" color={categoryColor} isDark={isDark} colors={colors} />
          )}
          {workout.calories != null && (
            <StatItem icon="flame-outline" value={workout.calories} label="Calories" color={COLORS.warning} isDark={isDark} colors={colors} />
          )}
        </View>

        {/* Notes */}
        {workout.notes && (
          <View
            style={[
              styles.notes,
              {
                backgroundColor: isDark ? COLORS.dark.border : '#F0F0F0',
              },
            ]}
          >
            <Ionicons name="document-text-outline" size={14} color={colors.textSecondary} style={{ marginTop: 1 }} />
            <Text
              style={[styles.notesText, { color: colors.textSecondary }]}
              numberOfLines={2}
            >
              {workout.notes}
            </Text>
          </View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
};

const StatItem = ({ icon, value, label, color, isDark, colors }) => (
  <View style={statStyles.container}>
    <View style={[statStyles.iconBg, { backgroundColor: `${color}15` }]}>
      <Ionicons name={icon} size={14} color={color} />
    </View>
    <Text style={[statStyles.value, { color: colors.text }]}>{value}</Text>
    <Text style={[statStyles.label, { color: colors.textMuted }]}>{label}</Text>
  </View>
);

function getExerciseIcon(exerciseName = '') {
  const name = exerciseName.toLowerCase();
  if (name.includes('run') || name.includes('sprint')) return 'walk-outline';
  if (name.includes('cycle') || name.includes('bike')) return 'bicycle-outline';
  if (name.includes('swim')) return 'water-outline';
  if (name.includes('yoga') || name.includes('stretch')) return 'body-outline';
  if (name.includes('jump') || name.includes('rope')) return 'trending-up-outline';
  if (name.includes('row')) return 'boat-outline';
  return 'barbell-outline';
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  exerciseIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginHorizontal: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    gap: 8,
  },
  notes: {
    margin: 16,
    marginTop: 4,
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  notesText: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  compactCard: {
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  accentBar: {
    width: 4,
    alignSelf: 'stretch',
  },
  compactContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  compactLeft: {
    flex: 1,
  },
  compactStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    fontSize: 12,
    fontWeight: '700',
  },
  calorieText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

const statStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    minWidth: 60,
  },
  iconBg: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  value: {
    fontSize: 14,
    fontWeight: '700',
  },
  label: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 1,
  },
});

export default WorkoutCard;
