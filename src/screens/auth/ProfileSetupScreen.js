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
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import useAuthStore from '../../store/authStore';
import useTheme from '../../hooks/useTheme';
import { COLORS, FITNESS_LEVELS, FITNESS_GOALS } from '../../utils/constants';
import { calculateBMI } from '../../utils/calculations';
import { InlineSpinner } from '../../components/LoadingSpinner';
import { setupNotifications } from '../../services/notificationService';

const TOTAL_STEPS = 3;

const ProfileSetupScreen = ({ navigation }) => {
  const { saveProfile, loading, user } = useAuthStore();
  const { isDark, colors } = useTheme();

  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState({});
  const slideAnim = useRef(new Animated.Value(0)).current;

  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [fitnessLevel, setFitnessLevel] = useState('');
  const [fitnessGoal, setFitnessGoal] = useState('');

  const bmiInfo = heightCm && weightKg ? calculateBMI(parseFloat(weightKg), parseFloat(heightCm)) : null;

  const validateStep = (currentStep) => {
    const newErrors = {};
    if (currentStep === 1) {
      if (!name.trim()) newErrors.name = 'Please enter your name';
      const ageNum = parseInt(age);
      if (!age) newErrors.age = 'Age is required';
      else if (isNaN(ageNum) || ageNum < 13 || ageNum > 100) newErrors.age = 'Enter a valid age (13–100)';
    }
    if (currentStep === 2) {
      const h = parseFloat(heightCm);
      const w = parseFloat(weightKg);
      if (!heightCm) newErrors.heightCm = 'Height is required';
      else if (isNaN(h) || h < 100 || h > 250) newErrors.heightCm = 'Enter a valid height (100–250 cm)';
      if (!weightKg) newErrors.weightKg = 'Weight is required';
      else if (isNaN(w) || w < 30 || w > 300) newErrors.weightKg = 'Enter a valid weight (30–300 kg)';
    }
    if (currentStep === 3) {
      if (!fitnessLevel) newErrors.fitnessLevel = 'Please select your fitness level';
      if (!fitnessGoal) newErrors.fitnessGoal = 'Please select your goal';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const animateStep = (direction) => {
    Animated.sequence([
      Animated.timing(slideAnim, { toValue: direction === 'next' ? -30 : 30, duration: 150, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
  };

  const goNext = () => {
    if (!validateStep(step)) return;
    if (step < TOTAL_STEPS) { animateStep('next'); setStep(step + 1); }
    else handleSave();
  };

  const goBack = () => {
    if (step > 1) { animateStep('back'); setStep(step - 1); setErrors({}); }
  };

  const handleSave = async () => {
    if (!validateStep(3)) return;
    const profileData = { name: name.trim(), age: parseInt(age), heightCm: parseFloat(heightCm), weightKg: parseFloat(weightKg), fitnessLevel, fitnessGoal };
    const result = await saveProfile(profileData);
    if (result.success) {
      await setupNotifications(name.trim().split(' ')[0]);
    } else {
      setErrors({ submit: result.error || 'Failed to save profile. Please try again.' });
    }
  };

  const renderProgressBar = () => (
    <View style={styles.progressContainer}>
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <View key={i} style={[styles.progressSegment, { backgroundColor: i < step ? COLORS.primary : isDark ? COLORS.dark.border : COLORS.light.border }]} />
      ))}
    </View>
  );

  const renderStep1 = () => (
    <View>
      <Text style={[styles.stepTitle, { color: colors.text }]}>Tell us about yourself</Text>
      <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>We'll use this to personalize your experience</Text>
      <View style={styles.fieldGroup}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Full Name</Text>
        <View style={[styles.inputContainer, { backgroundColor: isDark ? COLORS.dark.inputBg : COLORS.light.inputBg, borderColor: errors.name ? COLORS.danger : (isDark ? COLORS.dark.border : COLORS.light.border) }]}>
          <Ionicons name="person-outline" size={18} color={colors.textMuted} />
          <TextInput value={name} onChangeText={(t) => { setName(t); if (errors.name) setErrors((e) => ({ ...e, name: null })); }} placeholder="John Doe" placeholderTextColor={colors.textMuted} style={[styles.textInput, { color: colors.text }]} autoCapitalize="words" returnKeyType="next" maxLength={100} />
        </View>
        {errors.name && <Text style={styles.fieldError}>{errors.name}</Text>}
      </View>
      <View style={styles.fieldGroup}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Age</Text>
        <View style={[styles.inputContainer, { backgroundColor: isDark ? COLORS.dark.inputBg : COLORS.light.inputBg, borderColor: errors.age ? COLORS.danger : (isDark ? COLORS.dark.border : COLORS.light.border) }]}>
          <Ionicons name="calendar-outline" size={18} color={colors.textMuted} />
          <TextInput value={age} onChangeText={(t) => { setAge(t.replace(/[^0-9]/g, '')); if (errors.age) setErrors((e) => ({ ...e, age: null })); }} placeholder="25" placeholderTextColor={colors.textMuted} keyboardType="number-pad" style={[styles.textInput, { color: colors.text }]} maxLength={3} returnKeyType="done" />
          <Text style={[styles.inputUnit, { color: colors.textMuted }]}>years</Text>
        </View>
        {errors.age && <Text style={styles.fieldError}>{errors.age}</Text>}
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View>
      <Text style={[styles.stepTitle, { color: colors.text }]}>Body Measurements</Text>
      <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>Used for accurate calorie and BMI calculations</Text>
      <View style={styles.fieldGroup}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Height</Text>
        <View style={[styles.inputContainer, { backgroundColor: isDark ? COLORS.dark.inputBg : COLORS.light.inputBg, borderColor: errors.heightCm ? COLORS.danger : (isDark ? COLORS.dark.border : COLORS.light.border) }]}>
          <Ionicons name="resize-outline" size={18} color={colors.textMuted} />
          <TextInput value={heightCm} onChangeText={(t) => { setHeightCm(t.replace(/[^0-9.]/g, '')); if (errors.heightCm) setErrors((e) => ({ ...e, heightCm: null })); }} placeholder="175" placeholderTextColor={colors.textMuted} keyboardType="decimal-pad" style={[styles.textInput, { color: colors.text }]} maxLength={6} />
          <Text style={[styles.inputUnit, { color: colors.textMuted }]}>cm</Text>
        </View>
        {errors.heightCm && <Text style={styles.fieldError}>{errors.heightCm}</Text>}
      </View>
      <View style={styles.fieldGroup}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Weight</Text>
        <View style={[styles.inputContainer, { backgroundColor: isDark ? COLORS.dark.inputBg : COLORS.light.inputBg, borderColor: errors.weightKg ? COLORS.danger : (isDark ? COLORS.dark.border : COLORS.light.border) }]}>
          <Ionicons name="scale-outline" size={18} color={colors.textMuted} />
          <TextInput value={weightKg} onChangeText={(t) => { setWeightKg(t.replace(/[^0-9.]/g, '')); if (errors.weightKg) setErrors((e) => ({ ...e, weightKg: null })); }} placeholder="70" placeholderTextColor={colors.textMuted} keyboardType="decimal-pad" style={[styles.textInput, { color: colors.text }]} maxLength={6} />
          <Text style={[styles.inputUnit, { color: colors.textMuted }]}>kg</Text>
        </View>
        {errors.weightKg && <Text style={styles.fieldError}>{errors.weightKg}</Text>}
      </View>
      {bmiInfo && bmiInfo.bmi > 0 && (
        <View style={[styles.bmiCard, { backgroundColor: `${bmiInfo.color}15`, borderColor: `${bmiInfo.color}30` }]}>
          <Text style={[styles.bmiLabel, { color: colors.textSecondary }]}>Your BMI</Text>
          <Text style={[styles.bmiValue, { color: bmiInfo.color }]}>{bmiInfo.bmi}</Text>
          <Text style={[styles.bmiCategory, { color: bmiInfo.color }]}>{bmiInfo.category}</Text>
        </View>
      )}
    </View>
  );

  const renderStep3 = () => (
    <View>
      <Text style={[styles.stepTitle, { color: colors.text }]}>Your Fitness Profile</Text>
      <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>This shapes your AI-generated workout plans</Text>

      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Current Fitness Level</Text>
      {errors.fitnessLevel && <Text style={styles.fieldError}>{errors.fitnessLevel}</Text>}
      <View style={styles.optionsGrid}>
        {FITNESS_LEVELS.map((level) => {
          const isSelected = fitnessLevel === level.value;
          return (
            <TouchableOpacity key={level.value} onPress={() => { setFitnessLevel(level.value); if (errors.fitnessLevel) setErrors((e) => ({ ...e, fitnessLevel: null })); }}
              style={[styles.optionCard, { backgroundColor: isSelected ? `${COLORS.primary}18` : (isDark ? COLORS.dark.card : COLORS.light.card), borderColor: isSelected ? COLORS.primary : (isDark ? COLORS.dark.border : COLORS.light.border) }]}
              activeOpacity={0.7}>
              <Text style={[styles.optionLabel, { color: isSelected ? COLORS.primary : colors.text }]}>{level.label}</Text>
              <Text style={[styles.optionDesc, { color: colors.textMuted }]}>{level.description}</Text>
              {isSelected && <View style={[styles.checkBadge, { backgroundColor: COLORS.primary }]}><Ionicons name="checkmark" size={10} color="#FFF" /></View>}
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginTop: 20 }]}>Primary Goal</Text>
      {errors.fitnessGoal && <Text style={styles.fieldError}>{errors.fitnessGoal}</Text>}
      <View style={styles.goalsGrid}>
        {FITNESS_GOALS.map((goal) => {
          const isSelected = fitnessGoal === goal.value;
          return (
            <TouchableOpacity key={goal.value} onPress={() => { setFitnessGoal(goal.value); if (errors.fitnessGoal) setErrors((e) => ({ ...e, fitnessGoal: null })); }}
              style={[styles.goalCard, { backgroundColor: isSelected ? `${COLORS.primary}18` : (isDark ? COLORS.dark.card : COLORS.light.card), borderColor: isSelected ? COLORS.primary : (isDark ? COLORS.dark.border : COLORS.light.border) }]}
              activeOpacity={0.7}>
              <Ionicons name={goal.icon} size={28} color={isSelected ? COLORS.primary : colors.textMuted} />
              <Text style={[styles.goalLabel, { color: isSelected ? COLORS.primary : colors.text }]}>{goal.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {errors.submit && (
        <View style={[styles.errorBanner, { marginTop: 16 }]}>
          <Ionicons name="alert-circle" size={16} color="#FFF" />
          <Text style={styles.errorBannerText}>{errors.submit}</Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: isDark ? COLORS.dark.background : COLORS.light.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.topBar}>
          {step > 1 ? (
            <TouchableOpacity onPress={goBack} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
          ) : <View style={{ width: 24 }} />}
          <Text style={[styles.stepIndicator, { color: colors.textSecondary }]}>Step {step} of {TOTAL_STEPS}</Text>
          <View style={{ width: 24 }} />
        </View>

        {renderProgressBar()}

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Animated.View style={{ transform: [{ translateX: slideAnim }] }}>
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
          </Animated.View>
        </ScrollView>

        <View style={styles.bottomBar}>
          <TouchableOpacity style={[styles.nextBtn, { backgroundColor: COLORS.primary, opacity: loading ? 0.7 : 1 }]} onPress={goNext} disabled={loading} activeOpacity={0.85}>
            {loading ? (
              <View style={styles.btnContent}>
                <InlineSpinner color="#FFF" size={18} />
                <Text style={styles.nextBtnText}>Saving...</Text>
              </View>
            ) : (
              <View style={styles.btnContent}>
                <Text style={styles.nextBtnText}>{step === TOTAL_STEPS ? 'Complete Setup' : 'Continue'}</Text>
                {step < TOTAL_STEPS && <Ionicons name="arrow-forward" size={18} color="#FFF" />}
              </View>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  stepIndicator: { fontSize: 14, fontWeight: '600' },
  progressContainer: { flexDirection: 'row', paddingHorizontal: 20, gap: 6, marginBottom: 8 },
  progressSegment: { flex: 1, height: 4, borderRadius: 2 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 100 },
  stepTitle: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5, marginBottom: 8 },
  stepSubtitle: { fontSize: 14, lineHeight: 22, marginBottom: 28 },
  fieldGroup: { marginBottom: 18 },
  label: { fontSize: 11, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1.0 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 14, gap: 10 },
  textInput: { flex: 1, fontSize: 16, padding: 0 },
  inputUnit: { fontSize: 14, fontWeight: '600' },
  fieldError: { color: COLORS.danger, fontSize: 12, marginTop: 6, fontWeight: '500' },
  bmiCard: { borderRadius: 10, borderWidth: 1.5, padding: 16, alignItems: 'center', flexDirection: 'row', gap: 12, marginTop: 4 },
  bmiLabel: { fontSize: 13, fontWeight: '600' },
  bmiValue: { fontSize: 28, fontWeight: '800', flex: 1, textAlign: 'center' },
  bmiCategory: { fontSize: 14, fontWeight: '700' },
  sectionLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1.0, marginBottom: 12 },
  optionsGrid: { gap: 10 },
  optionCard: { borderRadius: 10, borderWidth: 1.5, padding: 16, position: 'relative' },
  optionLabel: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  optionDesc: { fontSize: 12, lineHeight: 18 },
  checkBadge: { position: 'absolute', top: 12, right: 12, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  goalsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  goalCard: { borderRadius: 10, borderWidth: 1.5, padding: 14, alignItems: 'center', width: '47%' },
  goalLabel: { fontSize: 13, fontWeight: '700', textAlign: 'center', marginTop: 6 },
  errorBanner: { backgroundColor: COLORS.danger, borderRadius: 10, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  errorBannerText: { color: '#FFF', fontSize: 13, fontWeight: '500', flex: 1 },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 24 },
  nextBtn: { borderRadius: 10, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 8 },
  nextBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  btnContent: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});

export default ProfileSetupScreen;
