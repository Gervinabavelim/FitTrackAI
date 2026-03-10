import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import useAuthStore from '../../store/authStore';
import useWorkoutStore from '../../store/workoutStore';
import useTheme from '../../hooks/useTheme';
import { COLORS, ROUTES } from '../../utils/constants';
import { formatDuration } from '../../utils/calculations';
import WorkoutCard from '../../components/WorkoutCard';
import StatCard from '../../components/StatCard';

const DashboardScreen = ({ navigation }) => {
  const { user, profile } = useAuthStore();
  const {
    fetchWorkouts,
    fetchRecentWorkouts,
    removeWorkout,
    recentWorkouts,
    workouts,
    streak,
    totalCalories,
    weeklyWorkoutCount,
    computeWeeklyStats,
    loading,
  } = useWorkoutStore();

  const { isDark, colors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [greeting, setGreeting] = useState('');

  // Compute greeting based on time of day
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 17) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  // Motivational subtitle
  const motivationalTexts = [
    'Every rep counts!',
    'Consistency beats perfection.',
    "Let's crush it today!",
    'Your body will thank you.',
    'Small steps, big results.',
  ];
  const motivationalText = motivationalTexts[new Date().getDate() % motivationalTexts.length];

  // Load data on mount
  useEffect(() => {
    if (user?.uid) {
      fetchWorkouts(user.uid);
      fetchRecentWorkouts(user.uid);
    }
  }, [user?.uid]);

  // Compute weekly stats after workouts load
  useEffect(() => {
    computeWeeklyStats();
  }, [workouts]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (user?.uid) {
      await fetchWorkouts(user.uid);
      await fetchRecentWorkouts(user.uid);
      computeWeeklyStats();
    }
    setRefreshing(false);
  }, [user?.uid]);

  const handleDeleteWorkout = async (workoutId) => {
    if (user?.uid) {
      await removeWorkout(user.uid, workoutId);
    }
  };

  // Today's workout (first of today)
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayWorkouts = recentWorkouts.filter(
    (w) => w.date && w.date.startsWith(todayStr)
  );

  // Average workout duration
  const avgDuration =
    workouts.length > 0
      ? Math.round(workouts.reduce((s, w) => s + (w.duration || 0), 0) / workouts.length)
      : 0;

  const firstName = profile?.name?.split(' ')[0] || 'Athlete';

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: isDark ? COLORS.dark.background : COLORS.light.background },
      ]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: colors.textSecondary }]}>
              {greeting},
            </Text>
            <Text style={[styles.userName, { color: colors.text }]}>
              {firstName} 👋
            </Text>
            <Text style={[styles.motivational, { color: colors.textMuted }]}>
              {motivationalText}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate(ROUTES.PROFILE)}
            style={[
              styles.avatarBtn,
              { backgroundColor: `${COLORS.primary}20` },
            ]}
          >
            <Text style={styles.avatarEmoji}>
              {firstName.charAt(0).toUpperCase()}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Date and Streak Banner ── */}
        <View
          style={[
            styles.streakBanner,
            {
              backgroundColor: streak > 0 ? `${COLORS.warning}18` : (isDark ? COLORS.dark.card : COLORS.light.card),
              borderColor: streak > 0 ? `${COLORS.warning}40` : (isDark ? COLORS.dark.border : COLORS.light.border),
            },
          ]}
        >
          <View style={styles.streakLeft}>
            <Text style={styles.streakFlame}>{streak > 0 ? '🔥' : '💤'}</Text>
            <View>
              <Text style={[styles.streakCount, { color: streak > 0 ? COLORS.warning : colors.textMuted }]}>
                {streak} day{streak !== 1 ? 's' : ''} streak
              </Text>
              <Text style={[styles.streakLabel, { color: colors.textMuted }]}>
                {streak > 0 ? 'Keep it going!' : 'Log a workout to start'}
              </Text>
            </View>
          </View>
          <Text style={[styles.todayDate, { color: colors.textMuted }]}>
            {format(new Date(), 'MMM d')}
          </Text>
        </View>

        {/* ── Quick Actions ── */}
        <View style={styles.quickActions}>
          {[
            { icon: 'add-circle-outline', label: 'Log', color: COLORS.primary, route: ROUTES.LOG_WORKOUT },
            { icon: 'sparkles-outline', label: 'AI Plan', color: COLORS.warning, route: ROUTES.AI_SUGGESTIONS },
            { icon: 'bar-chart-outline', label: 'Progress', color: COLORS.success, route: ROUTES.PROGRESS },
            { icon: 'person-outline', label: 'Profile', color: COLORS.info, route: ROUTES.PROFILE },
          ].map((action, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => navigation.navigate(action.route)}
              style={styles.quickActionBtn}
              activeOpacity={0.7}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: `${action.color}15` }]}>
                <Ionicons name={action.icon} size={22} color={action.color} />
              </View>
              <Text style={[styles.quickActionLabel, { color: colors.textSecondary }]}>
                {action.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Quick Stats ── */}
        <View style={styles.statsSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>This Week</Text>
          <View style={styles.statsGrid}>
            <StatCard
              icon="fitness-outline"
              iconColor={COLORS.primary}
              value={weeklyWorkoutCount}
              label="Workouts"
              style={styles.statCardHalf}
            />
            <StatCard
              icon="flame-outline"
              iconColor={COLORS.warning}
              value={totalCalories > 999 ? `${(totalCalories / 1000).toFixed(1)}k` : totalCalories}
              label="Total Calories"
              style={styles.statCardHalf}
            />
          </View>
          <View style={[styles.statsGrid, { marginTop: 12 }]}>
            <StatCard
              icon="time-outline"
              iconColor={COLORS.info}
              value={formatDuration(avgDuration)}
              label="Avg Duration"
              style={styles.statCardHalf}
            />
            <StatCard
              icon="trophy-outline"
              iconColor={COLORS.success}
              value={workouts.length}
              label="Total Workouts"
              style={styles.statCardHalf}
            />
          </View>
        </View>

        {/* ── Today's Workouts ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Today</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate(ROUTES.LOG_WORKOUT)}
              style={[styles.addBtn, { backgroundColor: `${COLORS.primary}18` }]}
            >
              <Ionicons name="add" size={16} color={COLORS.primary} />
              <Text style={[styles.addBtnText, { color: COLORS.primary }]}>Log</Text>
            </TouchableOpacity>
          </View>

          {todayWorkouts.length > 0 ? (
            todayWorkouts.map((workout) => (
              <WorkoutCard
                key={workout.id}
                workout={workout}
                onDelete={handleDeleteWorkout}
                compact
              />
            ))
          ) : (
            <TouchableOpacity
              onPress={() => navigation.navigate(ROUTES.LOG_WORKOUT)}
              style={[
                styles.emptyTodayCard,
                {
                  backgroundColor: isDark ? COLORS.dark.card : COLORS.light.card,
                  borderColor: isDark ? COLORS.dark.border : COLORS.light.border,
                },
              ]}
              activeOpacity={0.8}
            >
              <Text style={styles.emptyTodayEmoji}>🏋️</Text>
              <Text style={[styles.emptyTodayTitle, { color: colors.text }]}>
                No workout logged today
              </Text>
              <Text style={[styles.emptyTodaySubtext, { color: colors.textMuted }]}>
                Tap here to log your first workout of the day
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Recent Workouts ── */}
        {recentWorkouts.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent</Text>
              <TouchableOpacity onPress={() => navigation.navigate(ROUTES.PROGRESS)}>
                <Text style={[styles.viewAllText, { color: COLORS.primary }]}>
                  View all →
                </Text>
              </TouchableOpacity>
            </View>
            {recentWorkouts.slice(0, 5).map((workout) => (
              <WorkoutCard
                key={workout.id}
                workout={workout}
                onDelete={handleDeleteWorkout}
                compact
              />
            ))}
          </View>
        )}

        {/* ── AI Workout CTA ── */}
        <TouchableOpacity
          onPress={() => navigation.navigate(ROUTES.AI_SUGGESTIONS)}
          style={styles.aiCTA}
          activeOpacity={0.9}
        >
          <View style={styles.aiCTAContent}>
            <View>
              <Text style={styles.aiCTATitle}>AI Workout Plan ✨</Text>
              <Text style={styles.aiCTASubtext}>
                Get a personalized 7-day plan crafted for your goals
              </Text>
            </View>
            <Ionicons name="arrow-forward" size={20} color="#FFF" />
          </View>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  greeting: { fontSize: 14, fontWeight: '500' },
  userName: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5, marginTop: 2 },
  motivational: { fontSize: 13, fontWeight: '500', marginTop: 3, fontStyle: 'italic' },
  avatarBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: { fontSize: 20, fontWeight: '700', color: COLORS.primary },
  streakBanner: {
    marginHorizontal: 20,
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  streakLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  streakFlame: { fontSize: 28 },
  streakCount: { fontSize: 18, fontWeight: '800' },
  streakLabel: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  todayDate: { fontSize: 14, fontWeight: '600' },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  quickActionBtn: {
    alignItems: 'center',
    gap: 6,
  },
  quickActionIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  statsSection: { paddingHorizontal: 20, marginBottom: 24 },
  statsGrid: { flexDirection: 'row', gap: 12 },
  statCardHalf: { flex: 1 },
  section: { paddingHorizontal: 20, marginBottom: 24 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  addBtnText: { fontSize: 13, fontWeight: '700' },
  viewAllText: { fontSize: 13, fontWeight: '600' },
  emptyTodayCard: {
    borderRadius: 20,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    padding: 24,
    alignItems: 'center',
  },
  emptyTodayEmoji: { fontSize: 36, marginBottom: 8 },
  emptyTodayTitle: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
  emptyTodaySubtext: { fontSize: 13, textAlign: 'center', marginTop: 4, lineHeight: 18 },
  aiCTA: {
    marginHorizontal: 20,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  aiCTAContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
  },
  aiCTATitle: { fontSize: 16, fontWeight: '800', color: '#FFF', marginBottom: 4 },
  aiCTASubtext: { fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 18 },
});

export default DashboardScreen;
