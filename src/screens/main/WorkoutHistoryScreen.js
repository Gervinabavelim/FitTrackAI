import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO, isToday, isYesterday, isThisWeek, isThisMonth } from 'date-fns';
import useAuthStore from '../../store/authStore';
import useWorkoutStore from '../../store/workoutStore';
import useTheme from '../../hooks/useTheme';
import useHaptics from '../../hooks/useHaptics';
import { COLORS, EXERCISE_CATEGORIES, ROUTES } from '../../utils/constants';
import { formatDuration } from '../../utils/calculations';
import EmptyState from '../../components/EmptyState';

const FILTER_OPTIONS = [
  { key: 'all', label: 'All' },
  { key: 'strength', label: 'Strength' },
  { key: 'cardio', label: 'Cardio' },
  { key: 'bodyweight', label: 'Bodyweight' },
  { key: 'flexibility', label: 'Flexibility' },
];

const WorkoutHistoryScreen = ({ navigation }) => {
  const { user } = useAuthStore();
  const { workouts, fetchWorkouts, removeWorkout, loading } = useWorkoutStore();
  const { isDark, colors } = useTheme();
  const haptics = useHaptics();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(15)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(contentOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(contentTranslateY, { toValue: 0, duration: 400, easing: Easing.out(Easing.ease), useNativeDriver: true }),
    ]).start();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (user?.uid) {
      await fetchWorkouts(user.uid);
    }
    setRefreshing(false);
  }, [user?.uid]);

  const getCategoryKey = (exerciseName) => {
    for (const [key, cat] of Object.entries(EXERCISE_CATEGORIES)) {
      if (cat.exercises.includes(exerciseName)) return key;
    }
    return null;
  };

  const getCategoryColor = (exerciseName) => {
    for (const [, cat] of Object.entries(EXERCISE_CATEGORIES)) {
      if (cat.exercises.includes(exerciseName)) return cat.color;
    }
    return COLORS.primary;
  };

  const filteredWorkouts = useMemo(() => {
    let filtered = workouts;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (w) =>
          (w.exerciseName || '').toLowerCase().includes(q) ||
          (w.notes || '').toLowerCase().includes(q)
      );
    }

    if (activeFilter !== 'all') {
      filtered = filtered.filter((w) => getCategoryKey(w.exerciseName) === activeFilter);
    }

    return filtered;
  }, [workouts, searchQuery, activeFilter]);

  const groupedWorkouts = useMemo(() => {
    const groups = {};
    filteredWorkouts.forEach((w) => {
      let groupKey;
      try {
        const date = typeof w.date === 'string' ? parseISO(w.date) : new Date(w.date);
        if (isToday(date)) groupKey = 'Today';
        else if (isYesterday(date)) groupKey = 'Yesterday';
        else if (isThisWeek(date)) groupKey = 'This Week';
        else if (isThisMonth(date)) groupKey = 'This Month';
        else groupKey = format(date, 'MMMM yyyy');
      } catch {
        groupKey = 'Other';
      }

      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(w);
    });
    return groups;
  }, [filteredWorkouts]);

  const groupOrder = Object.keys(groupedWorkouts);

  const totalCalories = filteredWorkouts.reduce((sum, w) => sum + (w.calories || 0), 0);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? COLORS.dark.background : COLORS.light.background }]}>
      {/* Nav bar */}
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: colors.text }]}>Workout History</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, { backgroundColor: isDark ? COLORS.dark.inputBg : COLORS.light.inputBg, borderColor: isDark ? COLORS.dark.border : COLORS.light.border }]}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search exercises..."
            placeholderTextColor={colors.textMuted}
            style={[styles.searchInput, { color: colors.text }]}
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterContent}>
        {FILTER_OPTIONS.map((f) => (
          <TouchableOpacity
            key={f.key}
            onPress={() => { haptics.selection(); setActiveFilter(f.key); }}
            style={[
              styles.filterChip,
              {
                backgroundColor: activeFilter === f.key ? COLORS.primary : `${COLORS.primary}12`,
                borderColor: activeFilter === f.key ? COLORS.primary : 'transparent',
              },
            ]}
          >
            <Text style={{ color: activeFilter === f.key ? '#0F172A' : COLORS.primary, fontSize: 13, fontWeight: '600' }}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Summary bar */}
      <View style={styles.summaryBar}>
        <Text style={[styles.summaryText, { color: colors.textMuted }]}>
          {filteredWorkouts.length} workout{filteredWorkouts.length !== 1 ? 's' : ''}
        </Text>
        <Text style={[styles.summaryText, { color: colors.textMuted }]}>
          {totalCalories.toLocaleString()} kcal total
        </Text>
      </View>

      {/* Workout list */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} />
        }
      >
        <Animated.View style={{ opacity: contentOpacity, transform: [{ translateY: contentTranslateY }] }}>
          {filteredWorkouts.length === 0 ? (
            <EmptyState
              icon="barbell-outline"
              title={searchQuery || activeFilter !== 'all' ? 'No matching workouts' : 'No workouts yet'}
              subtitle={searchQuery || activeFilter !== 'all' ? 'Try adjusting your search or filter.' : 'Start logging workouts to see your history here.'}
              ctaLabel={searchQuery || activeFilter !== 'all' ? 'Clear Filters' : 'Log a Workout'}
              onCtaPress={() => {
                if (searchQuery || activeFilter !== 'all') {
                  setSearchQuery('');
                  setActiveFilter('all');
                } else {
                  navigation.navigate(ROUTES.LOG_WORKOUT);
                }
              }}
            />
          ) : (
            groupOrder.map((groupName) => (
              <View key={groupName} style={styles.group}>
                <Text style={[styles.groupTitle, { color: colors.textMuted }]}>{groupName}</Text>
                {groupedWorkouts[groupName].map((workout) => {
                  const catColor = getCategoryColor(workout.exerciseName || '');
                  const formattedDate = (() => {
                    try {
                      const date = typeof workout.date === 'string' ? parseISO(workout.date) : new Date(workout.date);
                      return format(date, 'EEE, MMM d · h:mm a');
                    } catch {
                      return '';
                    }
                  })();

                  return (
                    <TouchableOpacity
                      key={workout.id}
                      onPress={() => navigation.navigate(ROUTES.WORKOUT_DETAIL, { workout })}
                      style={[
                        styles.workoutRow,
                        {
                          backgroundColor: isDark ? COLORS.dark.card : COLORS.light.card,
                          borderColor: isDark ? COLORS.dark.border : 'transparent',
                        },
                      ]}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.accentBar, { backgroundColor: catColor }]} />
                      <View style={styles.workoutContent}>
                        <View style={styles.workoutLeft}>
                          <Text style={[styles.workoutName, { color: colors.text }]} numberOfLines={1}>
                            {workout.exerciseName || 'Workout'}
                          </Text>
                          <Text style={[styles.workoutDate, { color: colors.textMuted }]}>{formattedDate}</Text>
                        </View>
                        <View style={styles.workoutRight}>
                          {workout.sets && workout.reps && (
                            <Text style={[styles.chipText, { backgroundColor: `${catColor}12`, color: catColor }]}>
                              {workout.sets}x{workout.reps}
                            </Text>
                          )}
                          {workout.weight != null && (
                            <Text style={[styles.weightText, { color: colors.textSecondary }]}>
                              {workout.weight}kg
                            </Text>
                          )}
                          {workout.calories != null && (
                            <Text style={[styles.calText, { color: colors.textMuted }]}>
                              {workout.calories} kcal
                            </Text>
                          )}
                          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} style={{ marginLeft: 4 }} />
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))
          )}
          <View style={{ height: 100 }} />
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  filterScroll: {
    maxHeight: 44,
    marginBottom: 8,
  },
  filterContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 6,
    borderWidth: 1.5,
  },
  summaryBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  summaryText: {
    fontSize: 13,
    fontWeight: '500',
  },
  group: {
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  groupTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 12,
  },
  workoutRow: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  accentBar: {
    width: 4,
    alignSelf: 'stretch',
  },
  workoutContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  workoutLeft: {
    flex: 1,
    marginRight: 12,
  },
  workoutName: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  workoutDate: {
    fontSize: 12,
    fontWeight: '400',
    marginTop: 3,
  },
  workoutRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chipText: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    fontSize: 12,
    fontWeight: '600',
    overflow: 'hidden',
  },
  weightText: {
    fontSize: 13,
    fontWeight: '600',
  },
  calText: {
    fontSize: 12,
    fontWeight: '500',
  },
});

export default WorkoutHistoryScreen;
