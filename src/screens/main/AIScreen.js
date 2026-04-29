import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import useAuthStore from '../../store/authStore';
import useWorkoutStore from '../../store/workoutStore';
import useTheme from '../../hooks/useTheme';
import useHaptics from '../../hooks/useHaptics';
import { useToast } from '../../contexts/ToastContext';
import { COLORS } from '../../utils/constants';
import { generateWorkoutPlan } from '../../services/aiService';
import { saveAIWorkoutPlan, getSavedPlans } from '../../services/workoutService';
import { AILoadingState } from '../../components/LoadingSpinner';
import { InlineSpinner } from '../../components/LoadingSpinner';
import { checkAIRateLimit } from '../../utils/rateLimiter';
import useNetworkStatus from '../../hooks/useNetworkStatus';
import useSubscriptionStore from '../../store/subscriptionStore';
import { ProLockOverlay } from '../../components/ProBadge';
import { PRO_FEATURES } from '../../utils/proFeatures';
import { trackEvent } from '../../services/analyticsService';

const FITNESS_TIPS = [
  'Drink at least 8 glasses of water daily to stay hydrated during workouts.',
  'Aim for 7-9 hours of sleep to maximize muscle recovery.',
  'Warm up for 5-10 minutes before every workout to prevent injury.',
  'Track your progress weekly — small wins add up over time.',
  'Mix up your routine every 4-6 weeks to avoid plateaus.',
  'Post-workout protein within 30 minutes helps muscle repair.',
  'Rest days are just as important as workout days for progress.',
];

// ─── Day Card ─────────────────────────────────────────────────────────────────
const DayCard = ({ day, isDark, colors }) => {
  const [expanded, setExpanded] = useState(false);
  const isRest = day.type?.toLowerCase() === 'rest';

  const typeColors = {
    strength: COLORS.primary,
    cardio: COLORS.warning,
    rest: COLORS.success,
    hiit: COLORS.danger,
    flexibility: '#A78BFA',
    default: COLORS.info,
  };
  const typeColor = typeColors[day.type?.toLowerCase()] || typeColors.default;

  return (
    <TouchableOpacity
      onPress={() => setExpanded(!expanded)}
      activeOpacity={0.85}
      style={[
        styles.dayCard,
        {
          backgroundColor: isDark ? COLORS.dark.card : COLORS.light.card,
          borderColor: expanded ? typeColor : (isDark ? COLORS.dark.border : COLORS.light.border),
        },
      ]}
    >
      {/* Card Header */}
      <View style={styles.dayCardHeader}>
        <View
          style={[
            styles.dayBadge,
            { backgroundColor: isRest ? `${COLORS.success}20` : `${typeColor}20` },
          ]}
        >
          <Text style={[styles.dayNumber, { color: isRest ? COLORS.success : typeColor }]}>
            Day {day.day}
          </Text>
          <Text style={[styles.dayName, { color: isRest ? COLORS.success : typeColor }]}>
            {day.dayName}
          </Text>
        </View>

        <View style={styles.dayInfo}>
          <Text style={[styles.dayFocus, { color: colors.text }]} numberOfLines={1}>
            {day.focus || (isRest ? 'Rest & Recovery' : 'Workout')}
          </Text>
          <View style={styles.dayMeta}>
            {day.duration && (
              <View style={styles.metaChip}>
                <Ionicons name="time-outline" size={11} color={colors.textMuted} />
                <Text style={[styles.metaChipText, { color: colors.textMuted }]}>
                  {day.duration} min
                </Text>
              </View>
            )}
            {day.estimatedCalories && (
              <View style={styles.metaChip}>
                <Ionicons name="flame-outline" size={11} color={COLORS.warning} />
                <Text style={[styles.metaChipText, { color: COLORS.warning }]}>
                  {day.estimatedCalories} kcal
                </Text>
              </View>
            )}
            <View
              style={[
                styles.typePill,
                { backgroundColor: `${typeColor}20` },
              ]}
            >
              <Text style={[styles.typePillText, { color: typeColor }]}>
                {day.type || 'Workout'}
              </Text>
            </View>
          </View>
        </View>

        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.textMuted}
        />
      </View>

      {/* Expanded Detail */}
      {expanded && (
        <View style={styles.dayDetail}>
          <View
            style={[
              styles.divider,
              { backgroundColor: isDark ? COLORS.dark.border : COLORS.light.border },
            ]}
          />

          {/* Warmup */}
          {day.warmup && (
            <View style={styles.detailSection}>
              <View style={styles.detailTitleRow}>
                <Ionicons name="flame-outline" size={14} color={COLORS.success} />
                <Text style={[styles.detailSectionTitle, { color: COLORS.success }]}>
                  Warm-up
                </Text>
              </View>
              <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                {day.warmup}
              </Text>
            </View>
          )}

          {/* Exercises */}
          {day.exercises && day.exercises.length > 0 && (
            <View style={styles.detailSection}>
              <View style={styles.detailTitleRow}>
                <Ionicons name="barbell-outline" size={14} color={typeColor} />
                <Text style={[styles.detailSectionTitle, { color: typeColor }]}>
                  Exercises
                </Text>
              </View>
              {day.exercises.map((ex, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.exerciseRow,
                    {
                      backgroundColor: isDark ? COLORS.dark.background : '#F5F5F5',
                      borderColor: isDark ? COLORS.dark.border : COLORS.light.border,
                    },
                  ]}
                >
                  <View style={styles.exerciseRowHeader}>
                    <Text style={[styles.exerciseRowName, { color: colors.text }]}>
                      {idx + 1}. {ex.name}
                    </Text>
                    <View style={styles.exerciseRowStats}>
                      {ex.sets && (
                        <Text style={[styles.exStatBadge, { backgroundColor: `${typeColor}18`, color: typeColor }]}>
                          {ex.sets} sets
                        </Text>
                      )}
                      {ex.reps && (
                        <Text style={[styles.exStatBadge, { backgroundColor: `${typeColor}18`, color: typeColor }]}>
                          × {ex.reps}
                        </Text>
                      )}
                    </View>
                  </View>
                  {ex.rest && (
                    <Text style={[styles.exSubDetail, { color: colors.textMuted }]}>
                      Rest: {ex.rest}
                    </Text>
                  )}
                  {ex.targetMuscles && ex.targetMuscles.length > 0 && (
                    <Text style={[styles.exSubDetail, { color: colors.textMuted }]}>
                      Target: {ex.targetMuscles.join(', ')}
                    </Text>
                  )}
                  {ex.notes && (
                    <View style={styles.exNotesRow}>
                      <Ionicons name="bulb-outline" size={12} color={colors.textSecondary} />
                      <Text style={[styles.exNotes, { color: colors.textSecondary }]}>
                        {ex.notes}
                      </Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* Cooldown */}
          {day.cooldown && (
            <View style={styles.detailSection}>
              <View style={styles.detailTitleRow}>
                <Ionicons name="snow-outline" size={14} color={COLORS.info} />
                <Text style={[styles.detailSectionTitle, { color: COLORS.info }]}>
                  Cool-down
                </Text>
              </View>
              <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                {day.cooldown}
              </Text>
            </View>
          )}

          {/* Pro Tip */}
          {day.tips && (
            <View
              style={[
                styles.tipBox,
                { backgroundColor: `${COLORS.primary}12`, borderColor: `${COLORS.primary}30` },
              ]}
            >
              <Ionicons name="sparkles" size={13} color={COLORS.primary} />
              <Text style={{ fontSize: 13, color: COLORS.primary, fontWeight: '500', lineHeight: 20, flex: 1 }}>
                {day.tips}
              </Text>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
const AIScreen = ({ navigation }) => {
  const { user, profile } = useAuthStore();
  const { recentWorkouts, fetchRecentWorkouts, workouts, streak } = useWorkoutStore();
  const { isDark, colors } = useTheme();
  const haptics = useHaptics();
  const { showToast } = useToast();
  const isPro = useSubscriptionStore((s) => s.isPro);

  const [plan, setPlan] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [planSaved, setPlanSaved] = useState(false);
  const [savedPlans, setSavedPlans] = useState([]);
  const [expandedPlanId, setExpandedPlanId] = useState(null);
  const [loadingSavedPlans, setLoadingSavedPlans] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const { isConnected } = useNetworkStatus();

  // ─── Entrance Animations ────────────────────────────────────────────────────
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

  const todayTip = FITNESS_TIPS[new Date().getDate() % FITNESS_TIPS.length];

  useEffect(() => {
    if (user?.uid) {
      fetchRecentWorkouts(user.uid);
      setLoadingSavedPlans(true);
      getSavedPlans(user.uid)
        .then((plans) => setSavedPlans(plans.slice(0, 3)))
        .catch(() => {})
        .finally(() => setLoadingSavedPlans(false));
    }
  }, [user?.uid]);

  // Cooldown timer
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setCooldownSeconds((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  // ─── Generate Plan ───────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!profile) {
      Alert.alert('Profile Required', 'Please complete your profile first.');
      return;
    }

    if (!isConnected) {
      showToast("You're offline. Connect to the internet to generate a plan.", 'warning');
      return;
    }

    const rateCheck = checkAIRateLimit();
    if (!rateCheck.allowed) {
      showToast(rateCheck.message, 'warning');
      return;
    }

    haptics.medium();
    setGenerating(true);
    setPlan(null);
    setPlanSaved(false);

    try {
      const generatedPlan = await generateWorkoutPlan(profile, recentWorkouts, {
        allWorkouts: workouts,
        streak,
      });
      setPlan(generatedPlan);
      setCooldownSeconds(30);
      trackEvent('ai_plan_generated', { goal: profile.fitnessGoal });
    } catch (error) {
      showToast(error.message || 'Unable to generate plan. Please try again.', 'error');
    } finally {
      setGenerating(false);
    }
  };

  // ─── Save Plan to Firestore ──────────────────────────────────────────────────
  const handleSavePlan = async () => {
    if (!plan || !user?.uid) return;
    setSaving(true);
    try {
      await saveAIWorkoutPlan(user.uid, plan);
      setPlanSaved(true);
      haptics.success();
      trackEvent('ai_plan_saved', { goal: profile?.fitnessGoal });
      showToast('Workout plan saved!', 'success');
      getSavedPlans(user.uid).then((plans) => setSavedPlans(plans.slice(0, 3))).catch(() => {});
    } catch (error) {
      showToast('Unable to save plan. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: isDark ? COLORS.dark.background : COLORS.light.background },
      ]}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Animated.View style={[styles.header, { opacity: headerOpacity, transform: [{ translateY: headerTranslateY }] }]}>
          <View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>AI Coach</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
              Powered by GPT-4o-mini
            </Text>
          </View>
          <View style={[styles.aiBadge, { backgroundColor: `${COLORS.primary}15` }]}>
            <Ionicons name="sparkles" size={14} color={COLORS.primary} />
            <Text style={styles.aiBadgeText}>AI</Text>
          </View>
        </Animated.View>

        {/* Pro gate */}
        {!isPro && (
          <>
            <ProLockOverlay
              navigation={navigation}
              feature={PRO_FEATURES.AI_COACH}
              message="Get personalized 7-day workout plans tailored to your fitness level and goals with AI Coach."
              colors={colors}
              isDark={isDark}
            />

            {/* Fitness Tip for free users */}
            <View style={styles.emptyState}>
              <View
                style={[
                  styles.tipOfDay,
                  {
                    backgroundColor: `${COLORS.success}12`,
                    borderColor: `${COLORS.success}30`,
                  },
                ]}
              >
                <Ionicons name="bulb-outline" size={16} color={COLORS.success} />
                <Text style={[styles.tipOfDayText, { color: COLORS.success }]}>
                  {todayTip}
                </Text>
              </View>
            </View>
            <View style={{ height: 100 }} />
          </>
        )}

        {isPro && (
        <>
        {/* Profile context pill */}
        {profile && (
          <View
            style={[
              styles.contextPill,
              {
                backgroundColor: isDark ? COLORS.dark.card : COLORS.light.card,
                borderColor: isDark ? COLORS.dark.border : COLORS.light.border,
              },
            ]}
          >
            <Ionicons name="person-circle-outline" size={16} color={COLORS.primary} />
            <Text style={[styles.contextText, { color: colors.textSecondary }]}>
              {profile.name} · {profile.fitnessLevel} · {profile.fitnessGoal?.replace(/_/g, ' ')}
            </Text>
            <Ionicons name="barbell-outline" size={14} color={colors.textMuted} />
            <Text style={[styles.contextText, { color: colors.textMuted }]}>
              {recentWorkouts.length} recent workouts
            </Text>
          </View>
        )}

        {/* Generate Button */}
        {!generating && (
          <TouchableOpacity
            style={[
              styles.generateBtn,
              { opacity: cooldownSeconds > 0 ? 0.6 : 1 },
            ]}
            onPress={handleGenerate}
            disabled={generating || cooldownSeconds > 0}
            activeOpacity={0.85}
          >
            <View style={styles.generateGradient}>
              <Ionicons name="sparkles" size={22} color="#FFF" />
              <Text style={styles.generateBtnText}>
                {cooldownSeconds > 0
                  ? `Wait ${cooldownSeconds}s`
                  : plan ? 'Regenerate Plan' : 'Generate 7-Day Plan'}
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Loading State */}
        {generating && (
          <View
            style={[
              styles.loadingCard,
              {
                backgroundColor: isDark ? COLORS.dark.card : COLORS.light.card,
                borderColor: isDark ? COLORS.dark.border : COLORS.light.border,
              },
            ]}
          >
            <AILoadingState isDark={isDark} />
          </View>
        )}

        {/* Plan Display */}
        {plan && !generating && (
          <View style={styles.planContainer}>
            {/* Plan Header */}
            <View
              style={[
                styles.planHeader,
                {
                  backgroundColor: isDark ? COLORS.dark.card : COLORS.light.card,
                  borderColor: isDark ? COLORS.dark.border : COLORS.light.border,
                },
              ]}
            >
              <Text style={[styles.planTitle, { color: colors.text }]}>
                {plan.planTitle}
              </Text>
              <Text style={[styles.planDescription, { color: colors.textSecondary }]}>
                {plan.planDescription}
              </Text>

              <View style={styles.planMetaRow}>
                <View style={[styles.planMetaChip, { backgroundColor: `${COLORS.primary}18` }]}>
                  <Ionicons name="trophy-outline" size={14} color={COLORS.primary} />
                  <Text style={[styles.planMetaChipText, { color: COLORS.primary }]}>
                    {plan.weeklyGoal}
                  </Text>
                </View>
              </View>

              {plan.estimatedCaloriesPerWeek && (
                <Text style={[styles.planCalories, { color: colors.textMuted }]}>
                  ~{plan.estimatedCaloriesPerWeek.toLocaleString()} kcal/week estimated
                </Text>
              )}
            </View>

            {/* Day Cards */}
            <Text style={[styles.sectionLabel, { color: colors.text }]}>
              YOUR 7-DAY SCHEDULE
            </Text>
            {plan.days.map((day) => (
              <DayCard
                key={day.day}
                day={day}
                isDark={isDark}
                colors={colors}
              />
            ))}

            {/* Nutrition Tips */}
            {plan.nutritionTips && plan.nutritionTips.length > 0 && (
              <View
                style={[
                  styles.tipsCard,
                  {
                    backgroundColor: isDark ? COLORS.dark.card : COLORS.light.card,
                    borderColor: isDark ? COLORS.dark.border : COLORS.light.border,
                  },
                ]}
              >
                <View style={styles.tipsTitleRow}>
                  <Ionicons name="nutrition-outline" size={16} color={COLORS.success} />
                  <Text style={[styles.tipsTitle, { color: colors.text }]}>
                    Nutrition Tips
                  </Text>
                </View>
                {plan.nutritionTips.map((tip, i) => (
                  <View key={i} style={styles.tipItem}>
                    <View style={[styles.tipDot, { backgroundColor: COLORS.success }]} />
                    <Text style={[styles.tipText, { color: colors.textSecondary }]}>{tip}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Recovery Advice */}
            {plan.recoveryAdvice && (
              <View
                style={[
                  styles.tipsCard,
                  {
                    backgroundColor: isDark ? COLORS.dark.card : COLORS.light.card,
                    borderColor: isDark ? COLORS.dark.border : COLORS.light.border,
                  },
                ]}
              >
                <View style={styles.tipsTitleRow}>
                  <Ionicons name="bed-outline" size={16} color={COLORS.info} />
                  <Text style={[styles.tipsTitle, { color: colors.text }]}>
                    Recovery Advice
                  </Text>
                </View>
                <Text style={[styles.tipText, { color: colors.textSecondary }]}>
                  {plan.recoveryAdvice}
                </Text>
              </View>
            )}

            {/* Progression Note */}
            {plan.progressionNote && (
              <View
                style={[
                  styles.progressionBox,
                  {
                    backgroundColor: `${COLORS.primary}12`,
                    borderColor: `${COLORS.primary}30`,
                  },
                ]}
              >
                <Ionicons name="trending-up" size={16} color={COLORS.primary} />
                <Text style={[styles.progressionText, { color: COLORS.primary }]}>
                  {plan.progressionNote}
                </Text>
              </View>
            )}

            {/* Save Button */}
            <TouchableOpacity
              style={[
                styles.saveBtn,
                {
                  backgroundColor: planSaved ? COLORS.success : COLORS.primary,
                  opacity: saving ? 0.7 : 1,
                },
              ]}
              onPress={handleSavePlan}
              disabled={saving || planSaved}
              activeOpacity={0.85}
            >
              {saving ? (
                <View style={styles.btnContent}>
                  <InlineSpinner color="#FFF" size={18} />
                  <Text style={styles.saveBtnText}>Saving...</Text>
                </View>
              ) : (
                <View style={styles.btnContent}>
                  <Ionicons
                    name={planSaved ? 'checkmark-circle' : 'bookmark-outline'}
                    size={20}
                    color="#FFF"
                  />
                  <Text style={styles.saveBtnText}>
                    {planSaved ? 'Plan Saved' : 'Save This Plan'}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Empty state */}
        {!plan && !generating && (
          <View style={styles.emptyState}>
            <Ionicons name="sparkles" size={48} color={COLORS.primary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              Your AI Coach is Ready
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
              Press "Generate 7-Day Plan" and your AI coach will analyze your profile and recent
              workouts to build a personalized training program just for you.
            </Text>

            {/* Fitness Tip */}
            <View
              style={[
                styles.tipOfDay,
                {
                  backgroundColor: `${COLORS.success}12`,
                  borderColor: `${COLORS.success}30`,
                },
              ]}
            >
              <Ionicons name="bulb-outline" size={16} color={COLORS.success} />
              <Text style={[styles.tipOfDayText, { color: COLORS.success }]}>
                {todayTip}
              </Text>
            </View>

            {/* Saved Plans History */}
            {savedPlans.length > 0 && (
              <View style={styles.savedSection}>
                <Text style={[styles.savedTitle, { color: colors.text }]}>
                  SAVED PLANS
                </Text>
                {savedPlans.map((sp) => (
                  <TouchableOpacity
                    key={sp.id}
                    onPress={() => {
                      haptics.selection();
                      setExpandedPlanId(expandedPlanId === sp.id ? null : sp.id);
                    }}
                    style={[
                      styles.savedPlanCard,
                      {
                        backgroundColor: isDark ? COLORS.dark.card : COLORS.light.card,
                        borderColor: expandedPlanId === sp.id ? COLORS.primary : (isDark ? COLORS.dark.border : COLORS.light.border),
                      },
                    ]}
                    activeOpacity={0.8}
                  >
                    <View style={styles.savedPlanHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.savedPlanTitle, { color: colors.text }]} numberOfLines={1}>
                          {sp.planTitle || 'Workout Plan'}
                        </Text>
                        <Text style={[styles.savedPlanDate, { color: colors.textMuted }]}>
                          {sp.createdAt?.toDate ? sp.createdAt.toDate().toLocaleDateString() : 'Recently saved'}
                        </Text>
                      </View>
                      <Ionicons
                        name={expandedPlanId === sp.id ? 'chevron-up' : 'chevron-down'}
                        size={16}
                        color={colors.textMuted}
                      />
                    </View>
                    {expandedPlanId === sp.id && sp.days && (
                      <View style={styles.savedPlanDays}>
                        {sp.days.map((day) => (
                          <DayCard key={day.day} day={day} isDark={isDark} colors={colors} />
                        ))}
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerTitle: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 13, marginTop: 2, fontWeight: '400' },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
  },
  aiBadgeText: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
  contextPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    flexWrap: 'wrap',
  },
  contextText: { fontSize: 12, fontWeight: '500' },
  generateBtn: {
    marginHorizontal: 20,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 20,
  },
  generateGradient: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 10,
  },
  generateBtnText: { color: '#FFF', fontSize: 17, fontWeight: '700' },
  loadingCard: {
    marginHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1,
    padding: 24,
    marginBottom: 20,
    alignItems: 'center',
    minHeight: 200,
    justifyContent: 'center',
  },
  planContainer: { paddingHorizontal: 20 },
  planHeader: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 20,
    marginBottom: 20,
  },
  planTitle: { fontSize: 20, fontWeight: '700', letterSpacing: -0.5, marginBottom: 8 },
  planDescription: { fontSize: 14, lineHeight: 22, marginBottom: 12 },
  planMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  planMetaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  planMetaChipText: { fontSize: 12, fontWeight: '600' },
  planCalories: { fontSize: 13, fontWeight: '500', marginTop: 4 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 12,
    letterSpacing: 1.0,
    textTransform: 'uppercase',
  },
  dayCard: {
    borderRadius: 10,
    borderWidth: 1.5,
    marginBottom: 12,
    overflow: 'hidden',
  },
  dayCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  dayBadge: {
    width: 56,
    height: 56,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  dayNumber: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  dayName: { fontSize: 14, fontWeight: '700', marginTop: 2 },
  dayInfo: { flex: 1 },
  dayFocus: { fontSize: 15, fontWeight: '700', marginBottom: 6 },
  dayMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaChipText: { fontSize: 11, fontWeight: '500' },
  typePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typePillText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  dayDetail: { paddingHorizontal: 16, paddingBottom: 16 },
  divider: { height: 1, marginBottom: 12 },
  detailSection: { marginBottom: 14 },
  detailTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  detailSectionTitle: { fontSize: 13, fontWeight: '700' },
  detailText: { fontSize: 13, lineHeight: 20 },
  exerciseRow: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
  },
  exerciseRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  exerciseRowName: { fontSize: 14, fontWeight: '700', flex: 1, marginRight: 8 },
  exerciseRowStats: { flexDirection: 'row', gap: 4 },
  exStatBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    fontSize: 11,
    fontWeight: '700',
  },
  exSubDetail: { fontSize: 12, marginTop: 2 },
  exNotesRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 4,
  },
  exNotes: { fontSize: 12, fontStyle: 'italic', flex: 1 },
  tipBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: 8,
    borderWidth: 1,
    padding: 14,
    marginTop: 8,
  },
  tipsCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  tipsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  tipsTitle: { fontSize: 15, fontWeight: '700' },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 8,
  },
  tipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
    flexShrink: 0,
  },
  tipText: { fontSize: 13, lineHeight: 20, flex: 1 },
  progressionBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 10,
    borderWidth: 1,
    padding: 14,
    marginBottom: 20,
  },
  progressionText: { fontSize: 13, lineHeight: 20, flex: 1, fontWeight: '500' },
  saveBtn: {
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  btnContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 40,
  },
  emptyTitle: { fontSize: 22, fontWeight: '700', textAlign: 'center', marginBottom: 12, marginTop: 16 },
  emptySubtext: {
    fontSize: 14,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 16,
  },
  tipOfDay: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 8,
    borderWidth: 1,
    padding: 14,
    marginBottom: 20,
    width: '100%',
  },
  tipOfDayText: { fontSize: 13, fontWeight: '500', lineHeight: 20, flex: 1 },
  savedSection: { width: '100%' },
  savedTitle: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 12,
    letterSpacing: 1.0,
    textTransform: 'uppercase',
  },
  savedPlanCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  savedPlanHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  savedPlanTitle: { fontSize: 14, fontWeight: '700' },
  savedPlanDate: { fontSize: 12, marginTop: 2 },
  savedPlanDays: { marginTop: 12 },
});

export default AIScreen;
