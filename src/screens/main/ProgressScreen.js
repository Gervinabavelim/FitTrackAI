import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LineChart, BarChart } from 'react-native-chart-kit';
import useAuthStore from '../../store/authStore';
import useWorkoutStore from '../../store/workoutStore';
import useTheme from '../../hooks/useTheme';
import { COLORS, MONTHS, DAYS_OF_WEEK, ROUTES } from '../../utils/constants';
import {
  calculateStreak,
  getDailyCalories,
  getWeightTrend,
  calculateWeeklyVolume,
  calculatePersonalBests,
  average,
  formatDuration,
} from '../../utils/calculations';
import { HeroStat } from '../../components/StatCard';
import LoadingSpinner from '../../components/LoadingSpinner';
import { subDays, format } from 'date-fns';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_WIDTH = SCREEN_WIDTH - 40;

const ProgressScreen = ({ navigation }) => {
  const { user, profile } = useAuthStore();
  const { workouts, fetchWorkouts, loading } = useWorkoutStore();
  const { isDark, colors } = useTheme();

  const [refreshing, setRefreshing] = useState(false);
  const [dailyCalories30, setDailyCalories30] = useState([]);
  const [weightTrend30, setWeightTrend30] = useState([]);
  const [weeklyVolume4, setWeeklyVolume4] = useState([]);
  const [chartDataReady, setChartDataReady] = useState(false);

  useEffect(() => {
    if (user?.uid) {
      fetchWorkouts(user.uid);
    }
  }, [user?.uid]);

  useEffect(() => {
    if (workouts.length >= 0) {
      processChartData();
    }
  }, [workouts]);

  const processChartData = () => {
    const calories = getDailyCalories(workouts, 30);
    const weight = getWeightTrend(workouts, 30);
    const weekly = calculateWeeklyVolume(workouts, 4);
    setDailyCalories30(calories);
    setWeightTrend30(weight);
    setWeeklyVolume4(weekly);
    setChartDataReady(true);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (user?.uid) {
      await fetchWorkouts(user.uid);
    }
    setRefreshing(false);
  }, [user?.uid]);

  // ─── Computed stats ────────────────────────────────────────────────────────────
  const streak = calculateStreak(workouts);
  const totalCalories = workouts.reduce((s, w) => s + (w.calories || 0), 0);
  const avgDuration = average(workouts.map((w) => w.duration || 0));

  const last30Workouts = workouts.filter((w) => {
    try {
      return new Date(w.date) >= subDays(new Date(), 30);
    } catch { return false; }
  });

  // Personal bests
  const personalBests = useMemo(() => calculatePersonalBests(workouts), [workouts]);

  // Weekly insight text
  const weeklyInsight = useMemo(() => {
    const vol = calculateWeeklyVolume(workouts, 2);
    if (vol.length < 2) return null;
    const thisWeek = vol[1].count;
    const lastWeek = vol[0].count;
    if (thisWeek === 0 && lastWeek === 0) return 'No workouts yet. Time to get moving!';
    if (thisWeek === 0) return `No workouts this week yet. Last week you did ${lastWeek}!`;
    if (thisWeek > lastWeek) return `${thisWeek} workout${thisWeek !== 1 ? 's' : ''} this week, up from ${lastWeek} last week!`;
    if (thisWeek < lastWeek) return `${thisWeek} workout${thisWeek !== 1 ? 's' : ''} this week, down from ${lastWeek} last week.`;
    return `${thisWeek} workout${thisWeek !== 1 ? 's' : ''} this week, same as last week. Keep it steady!`;
  }, [workouts]);

  // ─── Chart config ──────────────────────────────────────────────────────────────
  const chartConfig = {
    backgroundColor: isDark ? COLORS.dark.card : COLORS.light.card,
    backgroundGradientFrom: isDark ? COLORS.dark.card : COLORS.light.card,
    backgroundGradientTo: isDark ? COLORS.dark.card : COLORS.light.card,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
    labelColor: () => (isDark ? '#A0A0A0' : '#555555'),
    style: { borderRadius: 10 },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: COLORS.primary,
    },
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: isDark ? '#2A2A2A' : '#E0E0E0',
      strokeWidth: 1,
    },
  };

  const calorieChartConfig = {
    ...chartConfig,
    color: (opacity = 1) => `rgba(251, 191, 36, ${opacity})`,
    propsForDots: {
      r: '3',
      strokeWidth: '2',
      stroke: COLORS.warning,
    },
  };

  const barChartConfig = {
    ...chartConfig,
    color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`,
  };

  // ─── Generate 30-day labels (every 7th day) ───────────────────────────────────
  const generate30DayLabels = () => {
    return Array.from({ length: 30 }, (_, i) => {
      if (i % 7 === 0) {
        const d = subDays(new Date(), 29 - i);
        return format(d, 'M/d');
      }
      return '';
    });
  };

  // ─── Safe chart data (avoid empty arrays crashing chart) ─────────────────────
  const safeCalorieData = dailyCalories30.length > 0
    ? dailyCalories30
    : Array(30).fill(0);

  const hasWeightData = weightTrend30.some((w) => w > 0);
  const safeWeightData = hasWeightData
    ? weightTrend30
    : Array(30).fill(profile?.weightKg || 70);

  const safeWeeklyData = weeklyVolume4.length > 0
    ? weeklyVolume4.map((w) => w.count)
    : [0, 0, 0, 0];

  const weeklyLabels = weeklyVolume4.length > 0
    ? weeklyVolume4.map((w) => w.week)
    : ['W1', 'W2', 'W3', 'W4'];

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
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Progress</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            Last 30 days
          </Text>
        </View>

        {loading && !refreshing ? (
          <LoadingSpinner
            size="large"
            message="Loading your progress..."
            fullScreen
          />
        ) : (
          <>
            {/* ── Hero Stats ── */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.heroStatsRow}
            >
              <HeroStat
                icon="fitness-outline"
                iconColor={COLORS.primary}
                value={workouts.length}
                label="Total Workouts"
                isDark={isDark}
                colors={colors}
              />
              <HeroStat
                icon="flame-outline"
                iconColor={COLORS.warning}
                value={totalCalories > 999 ? `${(totalCalories / 1000).toFixed(1)}k` : totalCalories}
                unit="kcal"
                label="Total Burned"
                isDark={isDark}
                colors={colors}
              />
              <HeroStat
                icon="trending-up-outline"
                iconColor={COLORS.success}
                value={streak}
                unit="days"
                label="Current Streak"
                isDark={isDark}
                colors={colors}
              />
              <HeroStat
                icon="time-outline"
                iconColor={COLORS.info}
                value={formatDuration(avgDuration)}
                label="Avg Duration"
                isDark={isDark}
                colors={colors}
              />
            </ScrollView>

            {/* ── This Month Summary ── */}
            <View
              style={[
                styles.summaryCard,
                {
                  backgroundColor: isDark ? COLORS.dark.card : COLORS.light.card,
                  borderColor: isDark ? COLORS.dark.border : COLORS.light.border,
                },
              ]}
            >
              <Text style={[styles.summaryTitle, { color: colors.text }]}>
                THIS MONTH
              </Text>
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryValue, { color: COLORS.primary }]}>
                    {last30Workouts.length}
                  </Text>
                  <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>
                    WORKOUTS
                  </Text>
                </View>
                <View
                  style={[
                    styles.summaryDivider,
                    { backgroundColor: isDark ? COLORS.dark.border : COLORS.light.border },
                  ]}
                />
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryValue, { color: COLORS.warning }]}>
                    {last30Workouts.reduce((s, w) => s + (w.calories || 0), 0).toLocaleString()}
                  </Text>
                  <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>
                    CALORIES
                  </Text>
                </View>
                <View
                  style={[
                    styles.summaryDivider,
                    { backgroundColor: isDark ? COLORS.dark.border : COLORS.light.border },
                  ]}
                />
                <View style={styles.summaryItem}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={[styles.summaryValue, { color: COLORS.success }]}>
                      {streak}
                    </Text>
                    <Ionicons name="flame" size={20} color={COLORS.success} />
                  </View>
                  <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>
                    STREAK
                  </Text>
                </View>
              </View>
            </View>

            {chartDataReady && (
              <>
                {/* ── Calories Burned Chart ── */}
                <View style={styles.chartSection}>
                  <View style={styles.chartTitleRow}>
                    <Ionicons name="flame" size={16} color={COLORS.warning} />
                    <Text style={[styles.chartTitle, { color: colors.text }]}>
                      Calories Burned — Last 30 Days
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.chartCard,
                      {
                        backgroundColor: isDark ? COLORS.dark.card : COLORS.light.card,
                        borderColor: isDark ? COLORS.dark.border : COLORS.light.border,
                      },
                    ]}
                  >
                    <LineChart
                      data={{
                        labels: generate30DayLabels(),
                        datasets: [{ data: safeCalorieData, strokeWidth: 2 }],
                      }}
                      width={CHART_WIDTH - 32}
                      height={200}
                      chartConfig={calorieChartConfig}
                      bezier
                      withDots={false}
                      withShadow={false}
                      style={styles.chart}
                    />
                  </View>
                </View>

                {/* ── Weekly Workout Count Bar Chart ── */}
                <View style={styles.chartSection}>
                  <View style={styles.chartTitleRow}>
                    <Ionicons name="calendar-outline" size={16} color={COLORS.info} />
                    <Text style={[styles.chartTitle, { color: colors.text }]}>
                      Weekly Workout Count — Last 4 Weeks
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.chartCard,
                      {
                        backgroundColor: isDark ? COLORS.dark.card : COLORS.light.card,
                        borderColor: isDark ? COLORS.dark.border : COLORS.light.border,
                      },
                    ]}
                  >
                    <BarChart
                      data={{
                        labels: weeklyLabels,
                        datasets: [{ data: safeWeeklyData }],
                      }}
                      width={CHART_WIDTH - 32}
                      height={180}
                      chartConfig={barChartConfig}
                      style={styles.chart}
                      showValuesOnTopOfBars
                      fromZero
                    />
                  </View>
                </View>

                {/* ── Weight Trend Chart ── */}
                <View style={styles.chartSection}>
                  <View style={styles.chartTitleRow}>
                    <Ionicons name="scale-outline" size={16} color={COLORS.info} />
                    <Text style={[styles.chartTitle, { color: colors.text }]}>
                      Body Weight Trend — Last 30 Days
                    </Text>
                  </View>
                  {hasWeightData ? (
                    <View
                      style={[
                        styles.chartCard,
                        {
                          backgroundColor: isDark ? COLORS.dark.card : COLORS.light.card,
                          borderColor: isDark ? COLORS.dark.border : COLORS.light.border,
                        },
                      ]}
                    >
                      <LineChart
                        data={{
                          labels: generate30DayLabels(),
                          datasets: [{ data: safeWeightData, strokeWidth: 2 }],
                        }}
                        width={CHART_WIDTH - 32}
                        height={200}
                        chartConfig={{
                          ...chartConfig,
                          color: (opacity = 1) => `rgba(167, 139, 250, ${opacity})`,
                          propsForDots: { r: '4', strokeWidth: '2', stroke: '#A78BFA' },
                        }}
                        bezier
                        withDots
                        withShadow={false}
                        style={styles.chart}
                        yAxisSuffix=" kg"
                      />
                    </View>
                  ) : (
                    <View
                      style={[
                        styles.chartCard,
                        styles.emptyChartCard,
                        {
                          backgroundColor: isDark ? COLORS.dark.card : COLORS.light.card,
                          borderColor: isDark ? COLORS.dark.border : COLORS.light.border,
                        },
                      ]}
                    >
                      <Ionicons name="scale-outline" size={32} color={colors.textMuted} />
                      <Text style={[styles.emptyChartText, { color: colors.textMuted }]}>
                        Log your body weight when logging workouts to see your weight trend here.
                      </Text>
                    </View>
                  )}
                </View>
              </>
            )}

            {/* ── Weekly Insight ── */}
            {weeklyInsight && workouts.length > 0 && (
              <View
                style={[
                  styles.insightCard,
                  {
                    backgroundColor: `${COLORS.primary}12`,
                    borderColor: `${COLORS.primary}30`,
                  },
                ]}
              >
                <Ionicons name="trending-up" size={18} color={COLORS.primary} />
                <Text style={[styles.insightText, { color: COLORS.primary }]}>
                  {weeklyInsight}
                </Text>
              </View>
            )}

            {/* ── Personal Bests ── */}
            {workouts.length > 0 && (personalBests.heaviestLifts.length > 0 || personalBests.longestDuration || personalBests.highestCalories) && (
              <View
                style={[
                  styles.summaryCard,
                  {
                    backgroundColor: isDark ? COLORS.dark.card : COLORS.light.card,
                    borderColor: isDark ? COLORS.dark.border : COLORS.light.border,
                  },
                ]}
              >
                <Text style={[styles.summaryTitle, { color: colors.text }]}>
                  PERSONAL BESTS
                </Text>
                {personalBests.heaviestLifts.map((pr, i) => (
                  <View key={i} style={styles.prRow}>
                    <Ionicons name="trophy" size={16} color={COLORS.warning} />
                    <Text style={[styles.prText, { color: colors.text }]}>
                      {pr.exerciseName}
                    </Text>
                    <Text style={[styles.prValue, { color: COLORS.primary }]}>
                      {pr.weight} kg
                    </Text>
                  </View>
                ))}
                {personalBests.longestDuration && (
                  <View style={styles.prRow}>
                    <Ionicons name="time" size={16} color={COLORS.info} />
                    <Text style={[styles.prText, { color: colors.text }]}>
                      {personalBests.longestDuration.exerciseName}
                    </Text>
                    <Text style={[styles.prValue, { color: COLORS.info }]}>
                      {formatDuration(personalBests.longestDuration.duration)}
                    </Text>
                  </View>
                )}
                {personalBests.highestCalories && (
                  <View style={styles.prRow}>
                    <Ionicons name="flame" size={16} color={COLORS.warning} />
                    <Text style={[styles.prText, { color: colors.text }]}>
                      {personalBests.highestCalories.exerciseName}
                    </Text>
                    <Text style={[styles.prValue, { color: COLORS.warning }]}>
                      {personalBests.highestCalories.calories} kcal
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* ── Empty State with CTA ── */}
            {workouts.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="bar-chart-outline" size={48} color={colors.textMuted} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  No data yet
                </Text>
                <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                  Start your fitness journey today and watch your progress unfold!
                </Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate(ROUTES.LOG_WORKOUT)}
                  style={styles.emptyCTA}
                  activeOpacity={0.85}
                >
                  <Ionicons name="add-circle-outline" size={18} color="#FFF" />
                  <Text style={styles.emptyCTAText}>Log Your First Workout</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={{ height: 100 }} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerTitle: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 13, marginTop: 4, fontWeight: '400' },
  heroStatsRow: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 0,
  },
  summaryCard: {
    marginHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1,
    padding: 20,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 1.0,
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center' },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryValue: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 1.0,
  },
  summaryDivider: { width: 1, height: 48 },
  chartSection: { marginBottom: 20 },
  chartTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 12,
  },
  chartTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  chartCard: {
    marginHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1,
    padding: 16,
    overflow: 'hidden',
  },
  chart: { borderRadius: 8 },
  emptyChartCard: {
    alignItems: 'center',
    padding: 32,
    gap: 12,
  },
  emptyChartText: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 40,
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8, marginTop: 12, textAlign: 'center' },
  emptySubtext: { fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 16 },
  emptyCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyCTAText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1,
    padding: 14,
    marginBottom: 20,
  },
  insightText: { fontSize: 13, fontWeight: '600', flex: 1, lineHeight: 20 },
  prRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  prText: { flex: 1, fontSize: 14, fontWeight: '600' },
  prValue: { fontSize: 14, fontWeight: '800' },
});

export default ProgressScreen;
