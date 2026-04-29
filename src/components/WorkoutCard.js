import React, { useRef, useEffect } from 'react';
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

const WorkoutCard = ({ workout, onDelete, onPress, compact = false, delay = 0 }) => {
  const { isDark, colors } = useTheme();
  const haptics = useHaptics();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, delay, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 350, delay, useNativeDriver: true }),
    ]).start();
  }, []);

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
      friction: 8,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 5,
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
        activeOpacity={1}
      >
        <Animated.View
          style={[
            styles.compactCard,
            {
              backgroundColor: isDark ? COLORS.dark.card : COLORS.light.card,
              borderColor: isDark ? COLORS.dark.border : 'transparent',
              transform: [{ scale: scaleAnim }, { translateY: slideAnim }],
              opacity: fadeAnim,
            },
          ]}
        >
          <View style={[styles.accentBar, { backgroundColor: categoryColor }]} />

          <View style={styles.compactContent}>
            <View style={styles.compactLeft}>
              <Text
                style={[styles.exerciseName, { color: colors.text, fontSize: 15 }]}
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
                <Text style={[styles.statChip, { backgroundColor: `${categoryColor}12`, color: categoryColor }]}>
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
      activeOpacity={1}
    >
      <Animated.View
        style={[
          styles.card,
          {
            backgroundColor: isDark ? COLORS.dark.card : COLORS.light.card,
            borderColor: isDark ? COLORS.dark.border : 'transparent',
            transform: [{ scale: scaleAnim }, { translateY: slideAnim }],
            opacity: fadeAnim,
          },
        ]}
      >
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <View
              style={[
                styles.exerciseIcon,
                { backgroundColor: `${categoryColor}12` },
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
            { backgroundColor: isDark ? COLORS.dark.border : '#F0F0F0' },
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
                backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F8F8F8',
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
    <View style={[statStyles.iconBg, { backgroundColor: `${color}10` }]}>
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
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
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
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  dateText: {
    fontSize: 13,
    fontWeight: '400',
    marginTop: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
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
    borderRadius: 10,
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
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
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
    padding: 14,
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
    paddingVertical: 4,
    borderRadius: 8,
    fontSize: 12,
    fontWeight: '600',
    overflow: 'hidden',
  },
  calorieText: {
    fontSize: 13,
    fontWeight: '500',
  },
});

const statStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    minWidth: 60,
  },
  iconBg: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
  },
  label: {
    fontSize: 11,
    fontWeight: '400',
    marginTop: 1,
  },
});

export default WorkoutCard;
