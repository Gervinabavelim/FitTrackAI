import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Share,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import useTheme from '../../hooks/useTheme';
import useHaptics from '../../hooks/useHaptics';
import useAuthStore from '../../store/authStore';
import useWorkoutStore from '../../store/workoutStore';
import { useToast } from '../../contexts/ToastContext';
import { COLORS, EXERCISE_CATEGORIES } from '../../utils/constants';
import { formatDuration } from '../../utils/calculations';

const WorkoutDetailScreen = ({ route, navigation }) => {
  const { workout } = route.params;
  const { isDark, colors } = useTheme();
  const haptics = useHaptics();
  const { user } = useAuthStore();
  const { removeWorkout } = useWorkoutStore();
  const { showToast } = useToast();

  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(-15)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(headerOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(headerTranslateY, { toValue: 0, duration: 400, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(contentOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(contentTranslateY, { toValue: 0, duration: 400, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  const getCategoryInfo = (exerciseName) => {
    for (const [key, cat] of Object.entries(EXERCISE_CATEGORIES)) {
      if (cat.exercises.includes(exerciseName)) {
        return { color: cat.color, label: cat.label };
      }
    }
    return { color: COLORS.primary, label: 'Other' };
  };

  const categoryInfo = getCategoryInfo(workout.exerciseName || '');

  const formattedDate = (() => {
    try {
      const date = typeof workout.date === 'string' ? parseISO(workout.date) : new Date(workout.date);
      return format(date, 'EEEE, MMMM d, yyyy');
    } catch {
      return 'Unknown date';
    }
  })();

  const formattedTime = (() => {
    try {
      const date = typeof workout.date === 'string' ? parseISO(workout.date) : new Date(workout.date);
      return format(date, 'h:mm a');
    } catch {
      return '';
    }
  })();

  const handleDelete = () => {
    haptics.warning();
    Alert.alert(
      'Delete Workout',
      `Remove "${workout.exerciseName || 'this workout'}" from your history? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (user?.uid) {
              const result = await removeWorkout(user.uid, workout.id);
              if (result.success) {
                showToast('Workout deleted.', 'success');
                navigation.goBack();
              } else {
                showToast('Failed to delete workout.', 'error');
              }
            }
          },
        },
      ]
    );
  };

  const handleShare = async () => {
    const parts = [`${workout.exerciseName || 'Workout'} — ${formattedDate}`];
    if (workout.sets && workout.reps) parts.push(`${workout.sets} sets x ${workout.reps} reps`);
    if (workout.weight) parts.push(`Weight: ${workout.weight} kg`);
    if (workout.duration) parts.push(`Duration: ${formatDuration(workout.duration)}`);
    if (workout.calories) parts.push(`Calories: ${workout.calories} kcal`);
    parts.push('\nLogged with FitTrack AI');

    try {
      await Share.share({ message: parts.join('\n') });
    } catch {}
  };

  const statItems = [
    workout.sets != null && { icon: 'repeat', label: 'Sets', value: workout.sets, color: categoryInfo.color },
    workout.reps != null && { icon: 'shuffle', label: 'Reps', value: workout.reps, color: categoryInfo.color },
    workout.weight != null && { icon: 'barbell-outline', label: 'Weight', value: `${workout.weight} kg`, color: categoryInfo.color },
    workout.duration != null && { icon: 'time-outline', label: 'Duration', value: formatDuration(workout.duration), color: COLORS.info },
    workout.calories != null && { icon: 'flame-outline', label: 'Calories', value: `${workout.calories} kcal`, color: COLORS.warning },
    workout.bodyWeight != null && { icon: 'body-outline', label: 'Body Weight', value: `${workout.bodyWeight} kg`, color: COLORS.success },
  ].filter(Boolean);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? COLORS.dark.background : COLORS.light.background }]}>
      {/* Nav bar */}
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.navActions}>
          <TouchableOpacity onPress={handleShare} style={styles.navActionBtn} activeOpacity={0.7}>
            <Ionicons name="share-outline" size={20} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} style={styles.navActionBtn} activeOpacity={0.7}>
            <Ionicons name="trash-outline" size={20} color={COLORS.danger} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Animated.View style={[styles.header, { opacity: headerOpacity, transform: [{ translateY: headerTranslateY }] }]}>
          <View style={[styles.categoryIcon, { backgroundColor: `${categoryInfo.color}15` }]}>
            <Ionicons name={getExerciseIcon(workout.exerciseName)} size={32} color={categoryInfo.color} />
          </View>
          <Text style={[styles.exerciseName, { color: colors.text }]}>
            {workout.exerciseName || 'Workout'}
          </Text>
          <View style={[styles.categoryBadge, { backgroundColor: `${categoryInfo.color}18` }]}>
            <Text style={[styles.categoryText, { color: categoryInfo.color }]}>{categoryInfo.label}</Text>
          </View>
          <Text style={[styles.dateText, { color: colors.textSecondary }]}>{formattedDate}</Text>
          {formattedTime && (
            <Text style={[styles.timeText, { color: colors.textMuted }]}>{formattedTime}</Text>
          )}
        </Animated.View>

        {/* Stats */}
        <Animated.View style={{ opacity: contentOpacity, transform: [{ translateY: contentTranslateY }] }}>
          {statItems.length > 0 && (
            <View style={[styles.statsCard, { backgroundColor: isDark ? COLORS.dark.card : COLORS.light.card, borderColor: isDark ? COLORS.dark.border : COLORS.light.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Workout Stats</Text>
              <View style={styles.statsGrid}>
                {statItems.map((stat, i) => (
                  <View key={i} style={[styles.statItem, { backgroundColor: `${stat.color}08` }]}>
                    <View style={[styles.statIcon, { backgroundColor: `${stat.color}15` }]}>
                      <Ionicons name={stat.icon} size={18} color={stat.color} />
                    </View>
                    <Text style={[styles.statValue, { color: colors.text }]}>{stat.value}</Text>
                    <Text style={[styles.statLabel, { color: colors.textMuted }]}>{stat.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Volume summary */}
          {workout.sets && workout.reps && workout.weight && (
            <View style={[styles.volumeCard, { backgroundColor: `${categoryInfo.color}10`, borderColor: `${categoryInfo.color}20` }]}>
              <Ionicons name="trending-up" size={20} color={categoryInfo.color} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.volumeTitle, { color: colors.text }]}>Total Volume</Text>
                <Text style={[styles.volumeValue, { color: categoryInfo.color }]}>
                  {(workout.sets * workout.reps * workout.weight).toLocaleString()} kg
                </Text>
              </View>
            </View>
          )}

          {/* Notes */}
          {workout.notes && (
            <View style={[styles.notesCard, { backgroundColor: isDark ? COLORS.dark.card : COLORS.light.card, borderColor: isDark ? COLORS.dark.border : COLORS.light.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Notes</Text>
              <Text style={[styles.notesText, { color: colors.textSecondary }]}>{workout.notes}</Text>
            </View>
          )}
        </Animated.View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

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
  navActions: {
    flexDirection: 'row',
    gap: 4,
  },
  navActionBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 28,
  },
  categoryIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  exerciseName: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  categoryBadge: {
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '600',
  },
  dateText: {
    fontSize: 15,
    fontWeight: '500',
    marginTop: 12,
  },
  timeText: {
    fontSize: 13,
    fontWeight: '400',
    marginTop: 4,
  },
  statsCard: {
    marginHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 14,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statItem: {
    flex: 1,
    minWidth: '45%',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  statIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  volumeCard: {
    marginHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  volumeTitle: {
    fontSize: 13,
    fontWeight: '500',
  },
  volumeValue: {
    fontSize: 22,
    fontWeight: '800',
    marginTop: 2,
  },
  notesCard: {
    marginHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  notesText: {
    fontSize: 15,
    lineHeight: 22,
  },
});

export default WorkoutDetailScreen;
