import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Share,
  Image,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import useAuthStore from '../../store/authStore';
import useWorkoutStore from '../../store/workoutStore';
import useTheme from '../../hooks/useTheme';
import useHaptics from '../../hooks/useHaptics';
import { COLORS, ROUTES } from '../../utils/constants';
import { formatDuration } from '../../utils/calculations';
import WorkoutCard from '../../components/WorkoutCard';
import StatCard from '../../components/StatCard';
import EmptyState from '../../components/EmptyState';
import Skeleton, { SkeletonCard } from '../../components/Skeleton';
import useNetworkStatus from '../../hooks/useNetworkStatus';
import { useToast } from '../../contexts/ToastContext';

// ─── Animated Quick Action ────────────────────────────────────────────────────
const QuickAction = ({ icon, label, color, onPress, delay = 0 }) => {
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pressScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, friction: 6, tension: 80, delay, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={() => Animated.spring(pressScale, { toValue: 0.9, friction: 8, useNativeDriver: true }).start()}
      onPressOut={() => Animated.spring(pressScale, { toValue: 1, friction: 5, useNativeDriver: true }).start()}
      activeOpacity={1}
      style={styles.quickActionBtn}
    >
      <Animated.View style={{ alignItems: 'center', opacity: fadeAnim, transform: [{ scale: Animated.multiply(scaleAnim, pressScale) }] }}>
        <View style={[styles.quickActionIcon, { backgroundColor: `${color}12` }]}>
          <Ionicons name={icon} size={22} color={color} />
        </View>
        <Text style={[styles.quickActionLabel, { color: '#888' }]}>{label}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

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
  const haptics = useHaptics();
  const { isConnected } = useNetworkStatus();
  const { showToast } = useToast();
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [greeting, setGreeting] = useState('');

  // ─── Entrance Animations ────────────────────────────────────────────────────
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(-15)).current;
  const streakOpacity = useRef(new Animated.Value(0)).current;
  const streakTranslateY = useRef(new Animated.Value(10)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 17) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  const motivationalTexts = [
    'Every rep counts.',
    'Consistency beats perfection.',
    "Let's crush it today.",
    'Your body will thank you.',
    'Small steps, big results.',
  ];
  const motivationalText = motivationalTexts[new Date().getDate() % motivationalTexts.length];

  useEffect(() => {
    if (user?.uid) {
      Promise.all([fetchWorkouts(user.uid), fetchRecentWorkouts(user.uid)])
        .finally(() => setInitialLoad(false));
    }
  }, [user?.uid]);

  useEffect(() => {
    computeWeeklyStats();
  }, [workouts]);

  // Play entrance animation once data is loaded
  useEffect(() => {
    if (!initialLoad) {
      Animated.sequence([
        Animated.parallel([
          Animated.timing(headerOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(headerTranslateY, { toValue: 0, duration: 400, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(streakOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
          Animated.timing(streakTranslateY, { toValue: 0, duration: 350, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(contentOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(contentTranslateY, { toValue: 0, duration: 400, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        ]),
      ]).start();
    }
  }, [initialLoad]);

  const onRefresh = useCallback(async () => {
    if (!isConnected) {
      showToast("You're offline. Pull to refresh when connected.", 'warning');
      return;
    }
    setRefreshing(true);
    if (user?.uid) {
      await fetchWorkouts(user.uid);
      await fetchRecentWorkouts(user.uid);
      computeWeeklyStats();
    }
    setRefreshing(false);
  }, [user?.uid, isConnected]);

  const handleDeleteWorkout = async (workoutId) => {
    if (user?.uid) {
      await removeWorkout(user.uid, workoutId);
    }
  };

  const handleShareStreak = async () => {
    try {
      await Share.share({
        message: `I'm on a ${streak}-day workout streak with FitTrack AI! ${totalCalories} calories burned so far. Let's go!`,
      });
    } catch {}
  };

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayWorkouts = recentWorkouts.filter(
    (w) => w.date && w.date.startsWith(todayStr)
  );

  const avgDuration =
    workouts.length > 0
      ? Math.round(workouts.reduce((s, w) => s + (w.duration || 0), 0) / workouts.length)
      : 0;

  const firstName = profile?.name?.split(' ')[0] || 'Athlete';

  if (initialLoad && loading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: isDark ? COLORS.dark.background : COLORS.light.background }]}
      >
        <View style={{ padding: 20 }}>
          <Skeleton width="50%" height={22} />
          <Skeleton width="80%" height={14} style={{ marginTop: 10 }} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 24 }}>
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} width="47%" height={96} borderRadius={16} />
            ))}
          </View>
          <SkeletonCard height={140} />
          <SkeletonCard height={100} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: isDark ? COLORS.dark.background : COLORS.light.background }]}
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
        {/* Header */}
        <Animated.View style={[styles.header, { opacity: headerOpacity, transform: [{ translateY: headerTranslateY }] }]}>
          <View>
            <Text style={[styles.greeting, { color: colors.textSecondary }]}>
              {greeting},
            </Text>
            <Text style={[styles.userName, { color: colors.text }]}>
              {firstName}
            </Text>
            <Text style={[styles.motivational, { color: colors.textMuted }]}>
              {motivationalText}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate(ROUTES.PROFILE)}
            activeOpacity={0.8}
          >
            {profile?.photoUri ? (
              <Image source={{ uri: profile.photoUri }} style={styles.avatarPhoto} />
            ) : (
              <View style={[styles.avatarBtn, { backgroundColor: `${COLORS.primary}12` }]}>
                <Text style={[styles.avatarEmoji, { color: COLORS.primary }]}>
                  {firstName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>

        {/* Streak Banner */}
        <Animated.View
          style={[
            styles.streakBanner,
            {
              backgroundColor: streak > 0 ? `${COLORS.primary}10` : (isDark ? COLORS.dark.card : COLORS.light.card),
              borderColor: streak > 0 ? `${COLORS.primary}25` : (isDark ? COLORS.dark.border : 'transparent'),
              opacity: streakOpacity,
              transform: [{ translateY: streakTranslateY }],
            },
          ]}
        >
          <View style={styles.streakLeft}>
            <Ionicons
              name={streak > 0 ? 'flame' : 'bed-outline'}
              size={26}
              color={streak > 0 ? COLORS.primary : colors.textMuted}
            />
            <View>
              <Text style={[styles.streakCount, { color: streak > 0 ? COLORS.primary : colors.textMuted }]}>
                {streak} day{streak !== 1 ? 's' : ''} streak
              </Text>
              <Text style={[styles.streakLabel, { color: colors.textMuted }]}>
                {streak > 0 ? 'Keep it going!' : 'Log a workout to start'}
              </Text>
            </View>
          </View>
          <View style={styles.streakRight}>
            {streak > 0 && (
              <TouchableOpacity onPress={handleShareStreak} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="share-outline" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            )}
            <Text style={[styles.todayDate, { color: colors.textMuted }]}>
              {format(new Date(), 'MMM d')}
            </Text>
          </View>
        </Animated.View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          {[
            { icon: 'add-circle-outline', label: 'Log', color: COLORS.primary, route: ROUTES.LOG_WORKOUT },
            { icon: 'sparkles-outline', label: 'AI Plan', color: COLORS.warning, route: ROUTES.AI_SUGGESTIONS },
            { icon: 'bar-chart-outline', label: 'Progress', color: COLORS.success, route: ROUTES.PROGRESS },
            { icon: 'person-outline', label: 'Profile', color: COLORS.primaryLight, route: ROUTES.PROFILE },
          ].map((action, i) => (
            <QuickAction
              key={i}
              icon={action.icon}
              label={action.label}
              color={action.color}
              delay={i * 60}
              onPress={() => { haptics.light(); navigation.navigate(action.route); }}
            />
          ))}
        </View>

        {/* Animated Content */}
        <Animated.View style={{ opacity: contentOpacity, transform: [{ translateY: contentTranslateY }] }}>
          {/* Stats or Welcome */}
          {workouts.length === 0 ? (
            <View
              style={[
                styles.welcomeCard,
                {
                  backgroundColor: isDark ? COLORS.dark.card : COLORS.light.card,
                  borderColor: isDark ? COLORS.dark.border : 'transparent',
                },
              ]}
            >
              <Text style={[styles.welcomeTitle, { color: colors.text }]}>
                Welcome to FitTrack AI
              </Text>
              <Text style={[styles.welcomeSubtext, { color: colors.textMuted }]}>
                Get started with these actions:
              </Text>
              {[
                { icon: 'add-circle-outline', label: 'Log your first workout', route: ROUTES.LOG_WORKOUT, color: COLORS.primary },
                { icon: 'sparkles-outline', label: 'Generate an AI plan', route: ROUTES.AI_SUGGESTIONS, color: COLORS.warning },
                { icon: 'person-outline', label: 'Complete your profile', route: ROUTES.PROFILE, color: COLORS.primaryLight },
              ].map((cta, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => navigation.navigate(cta.route)}
                  style={styles.welcomeCTA}
                  activeOpacity={0.7}
                >
                  <View style={[styles.welcomeCTAIcon, { backgroundColor: `${cta.color}12` }]}>
                    <Ionicons name={cta.icon} size={18} color={cta.color} />
                  </View>
                  <Text style={[styles.welcomeCTAText, { color: colors.text }]}>{cta.label}</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.statsSection}>
              <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>This Week</Text>
              <View style={styles.statsGrid}>
                <StatCard
                  icon="fitness-outline"
                  iconColor={COLORS.primary}
                  value={weeklyWorkoutCount}
                  label="Workouts"
                  style={styles.statCardHalf}
                  delay={0}
                />
                <StatCard
                  icon="flame-outline"
                  iconColor={COLORS.warning}
                  value={totalCalories > 999 ? `${(totalCalories / 1000).toFixed(1)}k` : totalCalories}
                  label="Total Calories"
                  style={styles.statCardHalf}
                  delay={80}
                />
              </View>
              <View style={[styles.statsGrid, { marginTop: 12 }]}>
                <StatCard
                  icon="time-outline"
                  iconColor={COLORS.primaryLight}
                  value={formatDuration(avgDuration)}
                  label="Avg Duration"
                  style={styles.statCardHalf}
                  delay={160}
                />
                <StatCard
                  icon="trophy-outline"
                  iconColor={COLORS.success}
                  value={workouts.length}
                  label="Total Workouts"
                  style={styles.statCardHalf}
                  delay={240}
                />
              </View>
            </View>
          )}

          {/* Today's Workouts */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Today</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate(ROUTES.LOG_WORKOUT)}
                style={[styles.addBtn, { backgroundColor: `${COLORS.primary}10` }]}
              >
                <Ionicons name="add" size={16} color={COLORS.primary} />
                <Text style={[styles.addBtnText, { color: COLORS.primary }]}>Log</Text>
              </TouchableOpacity>
            </View>

            {todayWorkouts.length > 0 ? (
              todayWorkouts.map((workout, i) => (
                <WorkoutCard
                  key={workout.id}
                  workout={workout}
                  onDelete={handleDeleteWorkout}
                  onPress={() => navigation.navigate(ROUTES.LOG_WORKOUT, { editWorkout: workout })}
                  compact
                  delay={i * 60}
                />
              ))
            ) : (
              <EmptyState
                icon="barbell-outline"
                title="No workout logged today"
                subtitle="Tap below to log your first session of the day."
                ctaLabel="Log a Workout"
                onCtaPress={() => navigation.navigate(ROUTES.LOG_WORKOUT)}
              />
            )}
          </View>

          {/* Recent Workouts */}
          {recentWorkouts.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Recent</Text>
                <TouchableOpacity onPress={() => navigation.navigate(ROUTES.PROGRESS)}>
                  <Text style={[styles.viewAllText, { color: COLORS.primary }]}>View all</Text>
                </TouchableOpacity>
              </View>
              {recentWorkouts.slice(0, 5).map((workout, i) => (
                <WorkoutCard
                  key={workout.id}
                  workout={workout}
                  onDelete={handleDeleteWorkout}
                  onPress={() => navigation.navigate(ROUTES.LOG_WORKOUT, { editWorkout: workout })}
                  compact
                  delay={i * 50}
                />
              ))}
            </View>
          )}

          {/* AI CTA */}
          <TouchableOpacity
            onPress={() => navigation.navigate(ROUTES.AI_SUGGESTIONS)}
            style={[styles.aiCTA, { backgroundColor: COLORS.primary }]}
            activeOpacity={0.9}
          >
            <View style={styles.aiCTAContent}>
              <View style={{ flex: 1 }}>
                <Text style={styles.aiCTATitle}>AI Workout Plan</Text>
                <Text style={styles.aiCTASubtext}>
                  Get a personalized 7-day plan crafted for your goals
                </Text>
              </View>
              <Ionicons name="arrow-forward" size={20} color="#FFF" />
            </View>
          </TouchableOpacity>

          <View style={{ height: 100 }} />
        </Animated.View>
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
  greeting: { fontSize: 15, fontWeight: '400' },
  userName: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5, marginTop: 2 },
  motivational: { fontSize: 14, fontWeight: '400', marginTop: 4 },
  avatarPhoto: {
    width: 48,
    height: 48,
    borderRadius: 16,
  },
  avatarBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: { fontSize: 20, fontWeight: '600' },
  streakBanner: {
    marginHorizontal: 20,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  streakLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  streakCount: { fontSize: 17, fontWeight: '600' },
  streakLabel: { fontSize: 13, fontWeight: '400', marginTop: 2 },
  streakRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  todayDate: { fontSize: 14, fontWeight: '500' },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    marginBottom: 28,
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
    fontSize: 12,
    fontWeight: '500',
  },
  statsSection: { paddingHorizontal: 20, marginBottom: 28 },
  statsGrid: { flexDirection: 'row', gap: 12 },
  statCardHalf: { flex: 1 },
  section: { paddingHorizontal: 20, marginBottom: 28 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 14, fontWeight: '600' },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addBtnText: { fontSize: 13, fontWeight: '600' },
  viewAllText: { fontSize: 14, fontWeight: '600' },
  aiCTA: {
    marginHorizontal: 20,
    borderRadius: 14,
    overflow: 'hidden',
  },
  aiCTAContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
  },
  aiCTATitle: { fontSize: 17, fontWeight: '600', color: '#FFF', marginBottom: 4 },
  aiCTASubtext: { fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 18 },
  welcomeCard: {
    marginHorizontal: 20,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 20,
    marginBottom: 28,
  },
  welcomeTitle: { fontSize: 18, fontWeight: '600', marginBottom: 4 },
  welcomeSubtext: { fontSize: 14, marginBottom: 16 },
  welcomeCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  welcomeCTAIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeCTAText: { flex: 1, fontSize: 15, fontWeight: '500' },
});

export default DashboardScreen;
