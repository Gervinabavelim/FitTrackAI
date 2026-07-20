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
  ImageBackground,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { format, subDays } from 'date-fns';
import useAuthStore from '../../store/authStore';
import useWorkoutStore from '../../store/workoutStore';
import useSubscriptionStore from '../../store/subscriptionStore';
import useTheme from '../../hooks/useTheme';
import useHaptics from '../../hooks/useHaptics';
import { COLORS, ROUTES } from '../../utils/constants';
import { formatDuration, getDailyCalories } from '../../utils/calculations';
import WorkoutCard from '../../components/WorkoutCard';
import EmptyState from '../../components/EmptyState';
import Skeleton, { SkeletonCard } from '../../components/Skeleton';
import { Card, IconChip, SectionHeader, RingProgress, ProgressBar, MiniBars, Sparkline } from '../../components/design';
import useNetworkStatus from '../../hooks/useNetworkStatus';
import { useToast } from '../../contexts/ToastContext';

const HERO_IMAGE = 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&q=80';

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

  const isPro = useSubscriptionStore((s) => s.isPro);
  const { isDark, colors } = useTheme();
  const haptics = useHaptics();
  const { isConnected } = useNetworkStatus();
  const { showToast } = useToast();
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    if (user?.uid) {
      Promise.all([fetchWorkouts(user.uid), fetchRecentWorkouts(user.uid)])
        .finally(() => setInitialLoad(false));
    }
  }, [user?.uid]);

  useEffect(() => {
    computeWeeklyStats();
  }, [workouts]);

  useEffect(() => {
    if (!initialLoad) {
      Animated.parallel([
        Animated.timing(contentOpacity, { toValue: 1, duration: 450, useNativeDriver: true }),
        Animated.timing(contentTranslateY, { toValue: 0, duration: 450, useNativeDriver: true }),
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
    if (user?.uid) await removeWorkout(user.uid, workoutId);
  };

  const handleShareStreak = async () => {
    try {
      await Share.share({
        message: `I'm on a ${streak}-day workout streak with FitTrack AI! ${totalCalories} calories burned so far. Let's go!`,
      });
    } catch {}
  };

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayWorkouts = recentWorkouts.filter((w) => w.date && w.date.startsWith(todayStr));

  const avgDuration =
    workouts.length > 0
      ? Math.round(workouts.reduce((s, w) => s + (w.duration || 0), 0) / workouts.length)
      : 0;

  const firstName = profile?.name?.split(' ')[0] || 'Athlete';
  const weeklyGoal = Number(profile?.workoutDaysPerWeek) || 5;
  const goalProgress = weeklyGoal > 0 ? weeklyWorkoutCount / weeklyGoal : 0;
  const streakProgress = streak / 7;
  const caloriesLabel = totalCalories > 999 ? `${(totalCalories / 1000).toFixed(1)}k` : `${totalCalories}`;

  // 7-day series for the metric-card mini charts
  const calories7 = getDailyCalories(workouts, 7);
  const counts7 = Array.from({ length: 7 }, (_, i) => {
    const key = format(subDays(new Date(), 6 - i), 'yyyy-MM-dd');
    return workouts.filter((w) => w.date && w.date.startsWith(key)).length;
  });

  const bg = isDark ? COLORS.dark.background : COLORS.light.background;

  if (initialLoad && loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: bg }]} edges={['top']}>
        <View style={{ padding: 20 }}>
          <Skeleton width="55%" height={26} />
          <Skeleton width="35%" height={14} style={{ marginTop: 10 }} />
          <SkeletonCard height={150} />
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
            <Skeleton width="47%" height={110} borderRadius={24} />
            <Skeleton width="47%" height={110} borderRadius={24} />
          </View>
          <SkeletonCard height={130} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]} edges={['top']}>
      {/* Soft gradient glow behind the header (borrowed from the reference's top fade) */}
      <LinearGradient
        colors={
          isDark
            ? ['rgba(91,95,232,0.22)', 'rgba(91,95,232,0)']
            : ['rgba(124,128,240,0.20)', 'rgba(241,240,236,0)']
        }
        style={styles.topGlow}
        pointerEvents="none"
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 110 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      >
        {/* ─── Header ─── */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerLeft}
            activeOpacity={0.8}
            onPress={() => navigation.navigate(ROUTES.PROFILE)}
          >
            {profile?.photoUri ? (
              <Image source={{ uri: profile.photoUri }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: `${COLORS.primary}18` }]}>
                <Text style={[styles.avatarEmoji, { color: COLORS.primary }]}>
                  {firstName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={{ marginLeft: 12 }}>
              <Text style={[styles.hello, { color: colors.text }]}>Hello {firstName}! 👋</Text>
              {isPro ? (
                <View style={[styles.badge, { backgroundColor: `${COLORS.primary}18` }]}>
                  <Ionicons name="diamond" size={11} color={COLORS.primary} />
                  <Text style={[styles.badgeText, { color: COLORS.primary }]}>Pro Member</Text>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={handleShareStreak}
                  style={[styles.badge, { backgroundColor: `${COLORS.primary}18` }]}
                  activeOpacity={0.8}
                >
                  <Ionicons name="flame" size={12} color={COLORS.primary} />
                  <Text style={[styles.badgeText, { color: COLORS.primary }]}>
                    {streak} day streak
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </TouchableOpacity>
          <View style={styles.headerBtns}>
            <TouchableOpacity
              style={[styles.iconBtn, { backgroundColor: isDark ? COLORS.dark.card : COLORS.light.card }]}
              activeOpacity={0.8}
              onPress={() => { haptics.light(); showToast("You're all caught up — no new notifications.", 'info'); }}
            >
              <Ionicons name="notifications-outline" size={20} color={colors.text} />
              {streak > 0 && <View style={styles.bellDot} />}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.iconBtn, { backgroundColor: isDark ? COLORS.dark.card : COLORS.light.card }]}
              activeOpacity={0.8}
              onPress={() => { haptics.light(); navigation.navigate(ROUTES.PROFILE); }}
            >
              <Ionicons name="ellipsis-horizontal" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        <Animated.View style={{ opacity: contentOpacity, transform: [{ translateY: contentTranslateY }] }}>
          {workouts.length === 0 ? (
            // ─── First-run welcome ───
            <Card style={styles.block}>
              <Text style={[styles.welcomeTitle, { color: colors.text }]}>Welcome to FitTrack AI</Text>
              <Text style={[styles.welcomeSubtext, { color: colors.textMuted }]}>Get started with these actions:</Text>
              {[
                { icon: 'add-circle-outline', label: 'Log your first workout', route: ROUTES.LOG_WORKOUT, color: COLORS.primary },
                { icon: 'sparkles-outline', label: 'Generate an AI plan', route: ROUTES.AI_SUGGESTIONS, color: COLORS.warning },
                { icon: 'person-outline', label: 'Complete your profile', route: ROUTES.PROFILE, color: COLORS.success },
              ].map((cta, i) => (
                <TouchableOpacity key={i} onPress={() => navigation.navigate(cta.route)} style={styles.welcomeCTA} activeOpacity={0.7}>
                  <IconChip icon={cta.icon} color={cta.color} size={40} />
                  <Text style={[styles.welcomeCTAText, { color: colors.text }]}>{cta.label}</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              ))}
            </Card>
          ) : (
            <>
              {/* ─── Today Starts ─── */}
              <View style={styles.block}>
                <SectionHeader
                  title="Today Starts"
                  onAction={() => navigation.navigate(ROUTES.WORKOUT_HISTORY)}
                />
                <Card style={styles.ringCard}>
                  <RingProgress
                    size={124}
                    stroke={13}
                    gap={6}
                    rings={[
                      { value: goalProgress, gradient: ['#5B5FE8', '#22C55E'] },
                      { value: streakProgress, gradient: ['#FF7A59', '#FBBF24'] },
                    ]}
                  >
                    <View style={{ alignItems: 'center' }}>
                      <View style={styles.ringBadge}>
                        <Ionicons name="barbell" size={15} color="#FFF" />
                      </View>
                      <Text style={[styles.ringValue, { color: colors.text }]}>{weeklyWorkoutCount}</Text>
                      <Text style={[styles.ringUnit, { color: colors.textMuted }]}>this week</Text>
                    </View>
                  </RingProgress>
                  <View style={styles.ringLegend}>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: COLORS.primary }]} />
                      <View>
                        <Text style={[styles.legendLabel, { color: colors.textSecondary }]}>Workouts</Text>
                        <Text style={[styles.legendValue, { color: colors.text }]}>
                          {weeklyWorkoutCount}<Text style={{ color: colors.textMuted }}>/{weeklyGoal}</Text>
                        </Text>
                      </View>
                    </View>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: '#FF7A59' }]} />
                      <View>
                        <Text style={[styles.legendLabel, { color: colors.textSecondary }]}>Streak</Text>
                        <Text style={[styles.legendValue, { color: colors.text }]}>
                          {streak}<Text style={{ color: colors.textMuted }}>/7 days</Text>
                        </Text>
                      </View>
                    </View>
                  </View>
                </Card>
              </View>

              {/* ─── Metric chip cards ─── */}
              <View style={[styles.block, styles.metricRow]}>
                <Card style={styles.metricCard}>
                  <View style={styles.metricHead}>
                    <IconChip icon="flame" color="#FF7A59" size={40} />
                    <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Calories</Text>
                  </View>
                  <Text style={[styles.metricValue, { color: colors.text }]}>
                    {caloriesLabel}<Text style={[styles.metricUnit, { color: colors.textMuted }]}> kcal</Text>
                  </Text>
                  <View style={styles.metricChart}>
                    <MiniBars data={calories7} color="#FF7A59" width={130} height={38} />
                  </View>
                </Card>
                <Card style={styles.metricCard}>
                  <View style={styles.metricHead}>
                    <IconChip icon="pulse" color={COLORS.primary} size={40} />
                    <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Activity</Text>
                  </View>
                  <Text style={[styles.metricValue, { color: colors.text }]}>
                    {workouts.length}<Text style={[styles.metricUnit, { color: colors.textMuted }]}> total</Text>
                  </Text>
                  <View style={styles.metricChart}>
                    <Sparkline data={counts7} color={COLORS.primary} width={130} height={38} />
                  </View>
                </Card>
              </View>
            </>
          )}

          {/* ─── Today's Challenge (AI plan hero) ─── */}
          <View style={styles.block}>
            <TouchableOpacity activeOpacity={0.9} onPress={() => { haptics.light(); navigation.navigate(ROUTES.AI_SUGGESTIONS); }}>
              <ImageBackground
                source={{ uri: HERO_IMAGE }}
                style={styles.hero}
                imageStyle={styles.heroImage}
              >
                <LinearGradient
                  colors={['rgba(65,69,201,0.35)', 'rgba(43,45,128,0.92)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={styles.heroOverlay}
                >
                  <View style={styles.heroChip}>
                    <Ionicons name="sparkles" size={13} color="#FFF" />
                    <Text style={styles.heroChipText}>AI Plan</Text>
                  </View>
                  <Text style={styles.heroTitle}>Your Daily Challenge{'\n'}Awaits! 🔥</Text>
                  <View style={styles.heroFooter}>
                    <ProgressBar
                      value={Math.min(goalProgress || 0, 1)}
                      color="#FFFFFF"
                      track="rgba(255,255,255,0.3)"
                      height={8}
                      style={{ flex: 1 }}
                    />
                    <View style={styles.heroArrow}>
                      <Ionicons name="arrow-forward" size={18} color={COLORS.primary} />
                    </View>
                  </View>
                </LinearGradient>
              </ImageBackground>
            </TouchableOpacity>
          </View>

          {/* ─── Today's workouts ─── */}
          <View style={styles.block}>
            <SectionHeader
              title="Today"
              actionLabel="Log"
              onAction={() => navigation.navigate(ROUTES.LOG_WORKOUT)}
            />
            {todayWorkouts.length > 0 ? (
              todayWorkouts.map((workout, i) => (
                <WorkoutCard
                  key={workout.id}
                  workout={workout}
                  onDelete={handleDeleteWorkout}
                  onPress={() => navigation.navigate(ROUTES.WORKOUT_DETAIL, { workout })}
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

          {/* ─── Recent ─── */}
          {recentWorkouts.length > 0 && (
            <View style={styles.block}>
              <SectionHeader
                title="Recent"
                actionLabel="View all"
                onAction={() => navigation.navigate(ROUTES.WORKOUT_HISTORY)}
              />
              {recentWorkouts.slice(0, 5).map((workout, i) => (
                <WorkoutCard
                  key={workout.id}
                  workout={workout}
                  onDelete={handleDeleteWorkout}
                  onPress={() => navigation.navigate(ROUTES.WORKOUT_DETAIL, { workout })}
                  compact
                  delay={i * 50}
                />
              ))}
            </View>
          )}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  topGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 340,
  },
  ringBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#17171C',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatar: { width: 48, height: 48, borderRadius: 16 },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarEmoji: { fontSize: 20, fontWeight: '700' },
  hello: { fontSize: 20, fontWeight: '700', letterSpacing: -0.4 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 5,
  },
  badgeText: { fontSize: 12, fontWeight: '600' },
  headerBtns: { flexDirection: 'row', gap: 10 },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellDot: {
    position: 'absolute',
    top: 11,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF7A59',
  },
  block: { paddingHorizontal: 20, marginBottom: 22 },
  ringCard: { flexDirection: 'row', alignItems: 'center' },
  ringValue: { fontSize: 22, fontWeight: '700', letterSpacing: -0.5 },
  ringUnit: { fontSize: 10, fontWeight: '500', marginTop: 1 },
  ringLegend: { flex: 1, marginLeft: 22, gap: 18 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { fontSize: 12, fontWeight: '500' },
  legendValue: { fontSize: 17, fontWeight: '700', letterSpacing: -0.3, marginTop: 1 },
  metricRow: { flexDirection: 'row', gap: 12 },
  metricCard: { flex: 1 },
  metricHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  metricValue: { fontSize: 22, fontWeight: '700', letterSpacing: -0.5, marginTop: 12 },
  metricUnit: { fontSize: 13, fontWeight: '500' },
  metricLabel: { fontSize: 12, fontWeight: '600' },
  metricChart: { marginTop: 10, alignItems: 'flex-start' },
  hero: { borderRadius: 24, overflow: 'hidden', minHeight: 150, justifyContent: 'flex-end', backgroundColor: COLORS.primaryDark },
  heroImage: { borderRadius: 24 },
  heroOverlay: { padding: 20 },
  heroChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  heroChipText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
  heroTitle: { color: '#FFF', fontSize: 22, fontWeight: '700', letterSpacing: -0.5, marginTop: 14, lineHeight: 28 },
  heroFooter: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 20 },
  heroArrow: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeTitle: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  welcomeSubtext: { fontSize: 14, marginBottom: 12 },
  welcomeCTA: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12 },
  welcomeCTAText: { flex: 1, fontSize: 15, fontWeight: '500' },
});

export default DashboardScreen;
