import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import useAuthStore from '../../store/authStore';
import useWorkoutStore from '../../store/workoutStore';
import useTheme from '../../hooks/useTheme';
import { COLORS } from '../../utils/constants';
import { estimateCalories } from '../../utils/calculations';
import ExercisePicker from '../../components/ExercisePicker';
import { InlineSpinner } from '../../components/LoadingSpinner';
import { sendImmediateNotification, sendStreakMilestoneNotification } from '../../services/notificationService';
import { checkWorkoutLogRateLimit } from '../../utils/rateLimiter';

const LogWorkoutScreen = ({ navigation }) => {
  const { user, profile } = useAuthStore();
  const { logWorkout, loading, streak } = useWorkoutStore();
  const { isDark, colors } = useTheme();

  // Form state
  const [exerciseName, setExerciseName] = useState('');
  const [sets, setSets] = useState('');
  const [reps, setReps] = useState('');
  const [weight, setWeight] = useState('');
  const [duration, setDuration] = useState('');
  const [calories, setCalories] = useState('');
  const [bodyWeight, setBodyWeight] = useState('');
  const [notes, setNotes] = useState('');
  const [workoutDate, setWorkoutDate] = useState(new Date());
  const [isCaloriesManual, setIsCaloriesManual] = useState(false);

  // UI state
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);

  // Refs for field focus chaining
  const setsRef = useRef(null);
  const repsRef = useRef(null);
  const weightRef = useRef(null);
  const durationRef = useRef(null);
  const caloriesRef = useRef(null);
  const notesRef = useRef(null);

  // Auto-calculate calories when exercise/duration/weight changes
  const handleDurationChange = (val) => {
    const cleanVal = val.replace(/[^0-9]/g, '');
    setDuration(cleanVal);
    if (!isCaloriesManual && exerciseName && cleanVal) {
      const userWeight = parseFloat(profile?.weightKg || 70);
      const estimated = estimateCalories(exerciseName, parseInt(cleanVal), userWeight);
      if (estimated > 0) setCalories(String(estimated));
    }
  };

  const handleExerciseSelect = (name) => {
    setExerciseName(name);
    if (!isCaloriesManual && duration) {
      const userWeight = parseFloat(profile?.weightKg || 70);
      const estimated = estimateCalories(name, parseInt(duration), userWeight);
      if (estimated > 0) setCalories(String(estimated));
    }
    if (errors.exerciseName) setErrors((e) => ({ ...e, exerciseName: null }));
  };

  // ─── Validation ────────────────────────────────────────────────────────────────
  const validate = () => {
    const newErrors = {};
    if (!exerciseName.trim()) newErrors.exerciseName = 'Please select an exercise';
    if (!duration && !sets) newErrors.duration = 'Enter duration or at least sets';
    if (sets && isNaN(parseInt(sets))) newErrors.sets = 'Sets must be a number';
    if (reps && isNaN(parseInt(reps))) newErrors.reps = 'Reps must be a number';
    if (weight && isNaN(parseFloat(weight))) newErrors.weight = 'Weight must be a number';
    if (duration && (isNaN(parseInt(duration)) || parseInt(duration) <= 0))
      newErrors.duration = 'Enter a valid duration in minutes';
    if (calories && isNaN(parseInt(calories))) newErrors.calories = 'Calories must be a number';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ─── Save Workout ──────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!validate()) return;

    const rateCheck = checkWorkoutLogRateLimit();
    if (!rateCheck.allowed) {
      Alert.alert('Slow Down', rateCheck.message);
      return;
    }

    const workoutData = {
      exerciseName: exerciseName.trim(),
      date: workoutDate.toISOString(),
      ...(sets && { sets: parseInt(sets) }),
      ...(reps && { reps: parseInt(reps) }),
      ...(weight && { weight: parseFloat(weight) }),
      ...(duration && { duration: parseInt(duration) }),
      ...(calories && { calories: parseInt(calories) }),
      ...(bodyWeight && { bodyWeight: parseFloat(bodyWeight) }),
      ...(notes.trim() && { notes: notes.trim() }),
    };

    const result = await logWorkout(user.uid, workoutData);

    if (result.success) {
      setSuccess(true);

      // Send congratulatory notification
      await sendImmediateNotification(
        '✅ Workout Logged!',
        `Great job logging ${exerciseName}${calories ? ` — ${calories} calories burned!` : '!'}`
      );

      // Check for streak milestone
      const newStreak = streak + (/* today */ 1);
      await sendStreakMilestoneNotification(newStreak, profile?.name?.split(' ')[0]);

      // Reset form after short delay
      setTimeout(() => {
        resetForm();
        setSuccess(false);
      }, 1500);
    } else {
      Alert.alert('Error', result.error || 'Failed to save workout. Please try again.');
    }
  };

  const resetForm = () => {
    setExerciseName('');
    setSets('');
    setReps('');
    setWeight('');
    setDuration('');
    setCalories('');
    setBodyWeight('');
    setNotes('');
    setWorkoutDate(new Date());
    setIsCaloriesManual(false);
    setErrors({});
  };

  // ─── Date Cycle (simple prev/next day) ───────────────────────────────────────
  const adjustDate = (days) => {
    const d = new Date(workoutDate);
    d.setDate(d.getDate() + days);
    if (d > new Date()) return; // Cannot log future workouts
    setWorkoutDate(d);
  };

  const isToday =
    format(workoutDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

  const inputStyle = (field) => ({
    flex: 1,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: errors[field] ? COLORS.danger : (isDark ? COLORS.dark.border : COLORS.light.border),
    backgroundColor: isDark ? COLORS.dark.inputBg : COLORS.light.inputBg,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: colors.text,
    fontSize: 16,
  });

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: isDark ? COLORS.dark.background : COLORS.light.background },
      ]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Log Workout</Text>
          <TouchableOpacity onPress={resetForm}>
            <Text style={[styles.clearText, { color: COLORS.primary }]}>Clear</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Success Banner */}
          {success && (
            <View style={[styles.successBanner, { backgroundColor: COLORS.success }]}>
              <Ionicons name="checkmark-circle" size={20} color="#FFF" />
              <Text style={styles.successText}>Workout saved successfully! 🎉</Text>
            </View>
          )}

          {/* ── Popular Exercises Quick Pick ── */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Quick Pick</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickPickRow}
            >
              {[
                { name: 'Running', icon: 'walk-outline', color: '#F59E0B' },
                { name: 'Bench Press', icon: 'barbell-outline', color: '#6366F1' },
                { name: 'Squat', icon: 'fitness-outline', color: '#6366F1' },
                { name: 'Push-up', icon: 'body-outline', color: '#10B981' },
                { name: 'Cycling', icon: 'bicycle-outline', color: '#F59E0B' },
                { name: 'HIIT', icon: 'flash-outline', color: '#EF4444' },
                { name: 'Yoga', icon: 'leaf-outline', color: '#EC4899' },
                { name: 'Deadlift', icon: 'barbell-outline', color: '#6366F1' },
              ].map((ex) => (
                <TouchableOpacity
                  key={ex.name}
                  onPress={() => handleExerciseSelect(ex.name)}
                  style={[
                    styles.quickPickChip,
                    {
                      backgroundColor: exerciseName === ex.name ? ex.color : `${ex.color}15`,
                      borderColor: exerciseName === ex.name ? ex.color : `${ex.color}30`,
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={ex.icon}
                    size={14}
                    color={exerciseName === ex.name ? '#FFF' : ex.color}
                  />
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '700',
                      color: exerciseName === ex.name ? '#FFF' : ex.color,
                    }}
                  >
                    {ex.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* ── Exercise Picker ── */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Exercise *</Text>
            <TouchableOpacity
              onPress={() => setShowExercisePicker(true)}
              style={[
                styles.exercisePickerBtn,
                {
                  backgroundColor: isDark ? COLORS.dark.inputBg : COLORS.light.inputBg,
                  borderColor: errors.exerciseName ? COLORS.danger : (isDark ? COLORS.dark.border : COLORS.light.border),
                },
              ]}
              activeOpacity={0.7}
            >
              <Ionicons
                name={exerciseName ? 'barbell-outline' : 'search-outline'}
                size={18}
                color={exerciseName ? COLORS.primary : colors.textMuted}
              />
              <Text
                style={[
                  styles.exercisePickerText,
                  { color: exerciseName ? colors.text : colors.textMuted },
                ]}
              >
                {exerciseName || 'Select an exercise...'}
              </Text>
              <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
            </TouchableOpacity>
            {errors.exerciseName && (
              <Text style={styles.fieldError}>{errors.exerciseName}</Text>
            )}
          </View>

          {/* ── Date Picker (simple) ── */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Date</Text>
            <View
              style={[
                styles.datePicker,
                {
                  backgroundColor: isDark ? COLORS.dark.card : COLORS.light.card,
                  borderColor: isDark ? COLORS.dark.border : COLORS.light.border,
                },
              ]}
            >
              <TouchableOpacity onPress={() => adjustDate(-1)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
              <Text style={[styles.dateText, { color: colors.text }]}>
                {isToday ? 'Today' : format(workoutDate, 'EEE, MMM d, yyyy')}
              </Text>
              <TouchableOpacity
                onPress={() => adjustDate(1)}
                disabled={isToday}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={isToday ? colors.textMuted : colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Sets / Reps / Weight Row ── */}
          <View style={styles.row}>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Sets</Text>
              <TextInput
                ref={setsRef}
                style={inputStyle('sets')}
                value={sets}
                onChangeText={(t) => { setSets(t.replace(/[^0-9]/g, '')); if (errors.sets) setErrors((e) => ({ ...e, sets: null })); }}
                placeholder="3"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                returnKeyType="next"
                onSubmitEditing={() => repsRef.current?.focus()}
                maxLength={3}
              />
              {errors.sets && <Text style={styles.fieldError}>{errors.sets}</Text>}
            </View>

            <View style={{ width: 12 }} />

            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Reps</Text>
              <TextInput
                ref={repsRef}
                style={inputStyle('reps')}
                value={reps}
                onChangeText={(t) => { setReps(t.replace(/[^0-9]/g, '')); if (errors.reps) setErrors((e) => ({ ...e, reps: null })); }}
                placeholder="10"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                returnKeyType="next"
                onSubmitEditing={() => weightRef.current?.focus()}
                maxLength={4}
              />
              {errors.reps && <Text style={styles.fieldError}>{errors.reps}</Text>}
            </View>

            <View style={{ width: 12 }} />

            <View style={[styles.fieldGroup, { flex: 1.3 }]}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Weight (kg)</Text>
              <TextInput
                ref={weightRef}
                style={inputStyle('weight')}
                value={weight}
                onChangeText={(t) => { setWeight(t.replace(/[^0-9.]/g, '')); if (errors.weight) setErrors((e) => ({ ...e, weight: null })); }}
                placeholder="60"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
                returnKeyType="next"
                onSubmitEditing={() => durationRef.current?.focus()}
                maxLength={6}
              />
              {errors.weight && <Text style={styles.fieldError}>{errors.weight}</Text>}
            </View>
          </View>

          {/* ── Duration ── */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Duration (minutes)
            </Text>
            <View style={styles.row}>
              <TextInput
                ref={durationRef}
                style={[inputStyle('duration')]}
                value={duration}
                onChangeText={handleDurationChange}
                placeholder="30"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                returnKeyType="next"
                onSubmitEditing={() => caloriesRef.current?.focus()}
                maxLength={4}
              />
              <View style={styles.durationShortcuts}>
                {[15, 30, 45, 60].map((min) => (
                  <TouchableOpacity
                    key={min}
                    onPress={() => handleDurationChange(String(min))}
                    style={[
                      styles.durationChip,
                      {
                        backgroundColor: duration === String(min)
                          ? COLORS.primary
                          : `${COLORS.primary}15`,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: duration === String(min) ? '#FFF' : COLORS.primary,
                        fontSize: 12,
                        fontWeight: '700',
                      }}
                    >
                      {min}m
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            {errors.duration && <Text style={styles.fieldError}>{errors.duration}</Text>}
          </View>

          {/* ── Calories ── */}
          <View style={styles.fieldGroup}>
            <View style={styles.caloriesHeader}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Calories Burned
              </Text>
              <TouchableOpacity onPress={() => setIsCaloriesManual(!isCaloriesManual)}>
                <Text style={[styles.autoLabel, { color: COLORS.primary }]}>
                  {isCaloriesManual ? '🔄 Auto-calculate' : '✏️ Manual'}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.row}>
              <TextInput
                ref={caloriesRef}
                style={inputStyle('calories')}
                value={calories}
                onChangeText={(t) => {
                  setCalories(t.replace(/[^0-9]/g, ''));
                  setIsCaloriesManual(true);
                  if (errors.calories) setErrors((e) => ({ ...e, calories: null }));
                }}
                placeholder={isCaloriesManual ? '250' : 'Auto-calculated'}
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                maxLength={5}
                editable={isCaloriesManual}
              />
              <View
                style={[
                  styles.caloriesBadge,
                  { backgroundColor: `${COLORS.warning}18` },
                ]}
              >
                <Text style={{ fontSize: 18 }}>🔥</Text>
                <Text style={{ color: COLORS.warning, fontWeight: '700', fontSize: 12 }}>kcal</Text>
              </View>
            </View>
            {errors.calories && <Text style={styles.fieldError}>{errors.calories}</Text>}
          </View>

          {/* ── Body Weight (optional) ── */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Body Weight Today (kg) — optional
            </Text>
            <TextInput
              style={[inputStyle('bodyWeight')]}
              value={bodyWeight}
              onChangeText={(t) => setBodyWeight(t.replace(/[^0-9.]/g, ''))}
              placeholder={profile?.weightKg ? String(profile.weightKg) : '70'}
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              returnKeyType="next"
              onSubmitEditing={() => notesRef.current?.focus()}
              maxLength={6}
            />
          </View>

          {/* ── Notes ── */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Notes — optional
            </Text>
            <TextInput
              ref={notesRef}
              style={[
                inputStyle('notes'),
                {
                  height: 90,
                  textAlignVertical: 'top',
                  paddingTop: 12,
                },
              ]}
              value={notes}
              onChangeText={setNotes}
              placeholder="How did the workout feel? Any PRs?"
              placeholderTextColor={colors.textMuted}
              multiline
              maxLength={300}
            />
          </View>

          {/* ── Save Button ── */}
          <TouchableOpacity
            style={[
              styles.saveBtn,
              { backgroundColor: COLORS.primary, opacity: loading ? 0.7 : 1 },
            ]}
            onPress={handleSave}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <View style={styles.btnContent}>
                <InlineSpinner color="#FFF" size={18} />
                <Text style={styles.saveBtnText}>Saving...</Text>
              </View>
            ) : (
              <View style={styles.btnContent}>
                <Ionicons name="checkmark-circle-outline" size={20} color="#FFF" />
                <Text style={styles.saveBtnText}>Save Workout</Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={{ height: 100 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Exercise Picker Modal */}
      <ExercisePicker
        visible={showExercisePicker}
        onSelect={handleExerciseSelect}
        onClose={() => setShowExercisePicker(false)}
        selectedExercise={exerciseName}
      />
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
  headerTitle: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  clearText: { fontSize: 14, fontWeight: '600' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 24 },
  successBanner: {
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  successText: { color: '#FFF', fontSize: 14, fontWeight: '600', flex: 1 },
  fieldGroup: { marginBottom: 18 },
  label: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  quickPickRow: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 8,
  },
  quickPickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  exercisePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
  },
  exercisePickerText: { flex: 1, fontSize: 16, fontWeight: '400' },
  datePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dateText: { fontSize: 15, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  durationShortcuts: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    flexShrink: 0,
  },
  durationChip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
  },
  caloriesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  autoLabel: { fontSize: 12, fontWeight: '600' },
  caloriesBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 14,
  },
  fieldError: { color: COLORS.danger, fontSize: 12, marginTop: 6, fontWeight: '500' },
  saveBtn: {
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    marginTop: 8,
  },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  btnContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});

export default LogWorkoutScreen;
