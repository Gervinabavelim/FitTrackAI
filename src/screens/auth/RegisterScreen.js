import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import useAuthStore from '../../store/authStore';
import useTheme from '../../hooks/useTheme';
import { COLORS, ROUTES } from '../../utils/constants';
import { InlineSpinner } from '../../components/LoadingSpinner';
import { checkAuthRateLimit } from '../../utils/rateLimiter';
import { trackEvent } from '../../services/analyticsService';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ─── Floating Orb Component ──────────────────────────────────────────────────
const FloatingOrb = ({ size, color, startX, startY, duration, delay }) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: 800, delay, useNativeDriver: true }).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(translateX, { toValue: 25, duration: duration * 0.6, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(translateX, { toValue: -15, duration: duration * 0.4, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(translateY, { toValue: -20, duration: duration * 0.5, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 12, duration: duration * 0.5, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={{
        position: 'absolute', left: startX, top: startY,
        width: size, height: size, borderRadius: size / 2,
        backgroundColor: color, opacity,
        transform: [{ translateX }, { translateY }],
      }}
    />
  );
};

const RegisterScreen = ({ navigation }) => {
  const { register, loading, authError, clearError } = useAuthStore();
  const { isDark, colors } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  const passwordRef = useRef(null);
  const confirmRef = useRef(null);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // ─── Entrance Animations ────────────────────────────────────────────────────
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslateX = useRef(new Animated.Value(-30)).current;
  const fieldsOpacity = useRef(new Animated.Value(0)).current;
  const fieldsTranslateY = useRef(new Animated.Value(50)).current;
  const footerOpacity = useRef(new Animated.Value(0)).current;
  const footerTranslateY = useRef(new Animated.Value(20)).current;
  const btnScale = useRef(new Animated.Value(1)).current;
  const checkboxScale = useRef(new Animated.Value(1)).current;

  const emailFieldAnim = useRef(new Animated.Value(0)).current;
  const passwordFieldAnim = useRef(new Animated.Value(0)).current;
  const confirmFieldAnim = useRef(new Animated.Value(0)).current;
  const termsFieldAnim = useRef(new Animated.Value(0)).current;

  // Input focus animations
  const emailBorderAnim = useRef(new Animated.Value(0)).current;
  const passwordBorderAnim = useRef(new Animated.Value(0)).current;
  const confirmBorderAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const stagger = 80;
    Animated.sequence([
      Animated.parallel([
        Animated.timing(headerOpacity, { toValue: 1, duration: 450, useNativeDriver: true }),
        Animated.timing(headerTranslateX, { toValue: 0, duration: 450, easing: Easing.out(Easing.back(1.3)), useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(fieldsOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(fieldsTranslateY, { toValue: 0, friction: 8, tension: 50, useNativeDriver: true }),
      ]),
      Animated.stagger(stagger, [
        Animated.spring(emailFieldAnim, { toValue: 1, friction: 7, tension: 60, useNativeDriver: true }),
        Animated.spring(passwordFieldAnim, { toValue: 1, friction: 7, tension: 60, useNativeDriver: true }),
        Animated.spring(confirmFieldAnim, { toValue: 1, friction: 7, tension: 60, useNativeDriver: true }),
        Animated.spring(termsFieldAnim, { toValue: 1, friction: 7, tension: 60, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(footerOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(footerTranslateY, { toValue: 0, duration: 300, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  const fieldStyle = (anim) => ({
    opacity: anim,
    transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
  });

  const animateFocus = (anim, focused) => {
    Animated.timing(anim, { toValue: focused ? 1 : 0, duration: 200, useNativeDriver: false }).start();
  };

  const getInputBorderColor = (field, focusAnim) => {
    if (fieldErrors[field]) return COLORS.danger;
    return focusAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [isDark ? COLORS.dark.border : COLORS.light.border, COLORS.primary],
    });
  };

  const onBtnPressIn = () => {
    Animated.spring(btnScale, { toValue: 0.95, friction: 8, useNativeDriver: true }).start();
  };
  const onBtnPressOut = () => {
    Animated.spring(btnScale, { toValue: 1, friction: 5, useNativeDriver: true }).start();
  };

  const bounceCheckbox = () => {
    Animated.sequence([
      Animated.timing(checkboxScale, { toValue: 1.3, duration: 100, useNativeDriver: true }),
      Animated.spring(checkboxScale, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();
  };

  const getPasswordStrength = (pwd) => {
    if (!pwd) return { score: 0, label: '', color: 'transparent' };
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    const levels = [
      { score: 0, label: '', color: 'transparent' },
      { score: 1, label: 'Weak', color: COLORS.danger },
      { score: 2, label: 'Fair', color: COLORS.warning },
      { score: 3, label: 'Good', color: COLORS.info },
      { score: 4, label: 'Strong', color: COLORS.success },
    ];
    return levels[Math.min(score, 4)];
  };
  const strength = getPasswordStrength(password);

  const validate = () => {
    const errors = {};
    if (!email.trim()) errors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errors.email = 'Enter a valid email address';
    if (!password) errors.password = 'Password is required';
    else if (password.length < 6) errors.password = 'Password must be at least 6 characters';
    if (!confirmPassword) errors.confirmPassword = 'Please confirm your password';
    else if (password !== confirmPassword) errors.confirmPassword = 'Passwords do not match';
    if (!agreedToTerms) errors.terms = 'You must agree to the terms to continue';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const handleRegister = async () => {
    clearError();
    setFieldErrors({});
    if (!validate()) { shake(); return; }
    const rateCheck = checkAuthRateLimit();
    if (!rateCheck.allowed) { setFieldErrors({ email: rateCheck.message }); shake(); return; }
    const result = await register(email.trim().toLowerCase(), password);
    if (result.success) {
      trackEvent('signup_success');
      navigation.navigate(ROUTES.PROFILE_SETUP);
    } else {
      trackEvent('signup_failed');
      shake();
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: isDark ? COLORS.dark.background : COLORS.light.background }]}>
      {/* Floating orbs */}
      <FloatingOrb size={90} color={`${COLORS.primary}08`} startX={SCREEN_W * 0.75} startY={SCREEN_H * 0.08} duration={6500} delay={0} />
      <FloatingOrb size={70} color={`${COLORS.primaryLight}06`} startX={-20} startY={SCREEN_H * 0.3} duration={5500} delay={400} />
      <FloatingOrb size={50} color={`${COLORS.info}06`} startX={SCREEN_W * 0.6} startY={SCREEN_H * 0.75} duration={7000} delay={200} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Animated.View style={{ opacity: headerOpacity }}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
          </Animated.View>

          <Animated.View style={[styles.headerSection, { opacity: headerOpacity, transform: [{ translateX: headerTranslateX }] }]}>
            <Text style={[styles.title, { color: colors.text }]}>Create Account</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Start your transformation today</Text>
          </Animated.View>

          {authError && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={16} color="#FFF" />
              <Text style={styles.errorBannerText}>{authError}</Text>
            </View>
          )}

          <Animated.View style={{ transform: [{ translateX: shakeAnim }, { translateY: fieldsTranslateY }], opacity: fieldsOpacity }}>
            {/* Email */}
            <Animated.View style={[styles.fieldGroup, fieldStyle(emailFieldAnim)]}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Email</Text>
              <Animated.View style={[styles.inputContainer, { backgroundColor: isDark ? COLORS.dark.inputBg : COLORS.light.inputBg, borderColor: getInputBorderColor('email', emailBorderAnim) }]}>
                <Ionicons name="mail-outline" size={18} color={focusedField === 'email' ? COLORS.primary : colors.textMuted} />
                <TextInput
                  value={email}
                  onChangeText={(t) => { setEmail(t); if (fieldErrors.email) setFieldErrors((e) => ({ ...e, email: null })); }}
                  placeholder="you@example.com" placeholderTextColor={colors.textMuted}
                  keyboardType="email-address" autoCapitalize="none" autoCorrect={false}
                  returnKeyType="next" onSubmitEditing={() => passwordRef.current?.focus()}
                  onFocus={() => { setFocusedField('email'); animateFocus(emailBorderAnim, true); }}
                  onBlur={() => { setFocusedField(null); animateFocus(emailBorderAnim, false); }}
                  style={[styles.textInput, { color: colors.text }]} editable={!loading} maxLength={254}
                />
              </Animated.View>
              {fieldErrors.email && <Text style={styles.fieldError}>{fieldErrors.email}</Text>}
            </Animated.View>

            {/* Password */}
            <Animated.View style={[styles.fieldGroup, fieldStyle(passwordFieldAnim)]}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Password</Text>
              <Animated.View style={[styles.inputContainer, { backgroundColor: isDark ? COLORS.dark.inputBg : COLORS.light.inputBg, borderColor: getInputBorderColor('password', passwordBorderAnim) }]}>
                <Ionicons name="lock-closed-outline" size={18} color={focusedField === 'password' ? COLORS.primary : colors.textMuted} />
                <TextInput
                  ref={passwordRef} value={password}
                  onChangeText={(t) => { setPassword(t); if (fieldErrors.password) setFieldErrors((e) => ({ ...e, password: null })); }}
                  placeholder="••••••••" placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showPassword} returnKeyType="next"
                  onSubmitEditing={() => confirmRef.current?.focus()}
                  onFocus={() => { setFocusedField('password'); animateFocus(passwordBorderAnim, true); }}
                  onBlur={() => { setFocusedField(null); animateFocus(passwordBorderAnim, false); }}
                  style={[styles.textInput, { color: colors.text }]} editable={!loading} maxLength={128}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textMuted} />
                </TouchableOpacity>
              </Animated.View>
              {password.length > 0 && (
                <View style={styles.strengthRow}>
                  {[1, 2, 3, 4].map((i) => (
                    <View key={i} style={[styles.strengthSegment, { backgroundColor: i <= strength.score ? strength.color : (isDark ? COLORS.dark.border : COLORS.light.border) }]} />
                  ))}
                  <Text style={[styles.strengthLabel, { color: strength.color }]}>{strength.label}</Text>
                </View>
              )}
              {fieldErrors.password && <Text style={styles.fieldError}>{fieldErrors.password}</Text>}
            </Animated.View>

            {/* Confirm Password */}
            <Animated.View style={[styles.fieldGroup, fieldStyle(confirmFieldAnim)]}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Confirm Password</Text>
              <Animated.View style={[styles.inputContainer, { backgroundColor: isDark ? COLORS.dark.inputBg : COLORS.light.inputBg, borderColor: getInputBorderColor('confirmPassword', confirmBorderAnim) }]}>
                <Ionicons name="shield-checkmark-outline" size={18} color={focusedField === 'confirm' ? COLORS.primary : colors.textMuted} />
                <TextInput
                  ref={confirmRef} value={confirmPassword}
                  onChangeText={(t) => { setConfirmPassword(t); if (fieldErrors.confirmPassword) setFieldErrors((e) => ({ ...e, confirmPassword: null })); }}
                  placeholder="Re-enter password" placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showConfirm} returnKeyType="done" onSubmitEditing={handleRegister}
                  onFocus={() => { setFocusedField('confirm'); animateFocus(confirmBorderAnim, true); }}
                  onBlur={() => { setFocusedField(null); animateFocus(confirmBorderAnim, false); }}
                  style={[styles.textInput, { color: colors.text }]} editable={!loading} maxLength={128}
                />
                <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)}>
                  <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textMuted} />
                </TouchableOpacity>
              </Animated.View>
              {fieldErrors.confirmPassword && <Text style={styles.fieldError}>{fieldErrors.confirmPassword}</Text>}
            </Animated.View>

            {/* Terms */}
            <Animated.View style={fieldStyle(termsFieldAnim)}>
              <TouchableOpacity
                style={styles.termsRow}
                onPress={() => { setAgreedToTerms(!agreedToTerms); bounceCheckbox(); if (fieldErrors.terms) setFieldErrors((e) => ({ ...e, terms: null })); }}
                activeOpacity={0.7}
              >
                <Animated.View
                  style={[styles.checkbox, {
                    backgroundColor: agreedToTerms ? COLORS.primary : 'transparent',
                    borderColor: fieldErrors.terms ? COLORS.danger : agreedToTerms ? COLORS.primary : (isDark ? COLORS.dark.border : COLORS.light.border),
                    transform: [{ scale: checkboxScale }],
                  }]}
                >
                  {agreedToTerms && <Ionicons name="checkmark" size={12} color="#FFF" />}
                </Animated.View>
                <Text style={[styles.termsText, { color: colors.textSecondary }]}>
                  I agree to the{' '}
                  <Text style={{ color: COLORS.primary, fontWeight: '600' }}>Terms of Service</Text>
                  {' '}and{' '}
                  <Text style={{ color: COLORS.primary, fontWeight: '600' }}>Privacy Policy</Text>
                </Text>
              </TouchableOpacity>
              {fieldErrors.terms && <Text style={styles.fieldError}>{fieldErrors.terms}</Text>}
            </Animated.View>

            {/* Register Button */}
            <Animated.View style={{ transform: [{ scale: btnScale }] }}>
              <TouchableOpacity
                style={[styles.registerBtn, { backgroundColor: COLORS.primary, opacity: loading ? 0.7 : 1 }]}
                onPress={handleRegister} onPressIn={onBtnPressIn} onPressOut={onBtnPressOut}
                disabled={loading} activeOpacity={1}
              >
                {loading ? (
                  <View style={styles.btnContent}>
                    <InlineSpinner color="#FFF" size={18} />
                    <Text style={styles.registerBtnText}>Creating account...</Text>
                  </View>
                ) : (
                  <Text style={styles.registerBtnText}>Create Account</Text>
                )}
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>

          <Animated.View style={[styles.loginRow, { opacity: footerOpacity, transform: [{ translateY: footerTranslateY }] }]}>
            <Text style={[styles.loginPrompt, { color: colors.textSecondary }]}>Already have an account?</Text>
            <TouchableOpacity onPress={() => navigation.navigate(ROUTES.LOGIN)} disabled={loading}>
              <Text style={[styles.loginLink, { color: COLORS.primary }]}> Sign in</Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 32 },
  backBtn: { marginBottom: 24 },
  headerSection: { marginBottom: 28 },
  title: { fontSize: 30, fontWeight: '800', letterSpacing: -1 },
  subtitle: { fontSize: 15, marginTop: 6, fontWeight: '400' },
  errorBanner: { backgroundColor: COLORS.danger, borderRadius: 10, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
  errorBannerText: { color: '#FFF', fontSize: 13, fontWeight: '500', flex: 1 },
  fieldGroup: { marginBottom: 18 },
  label: { fontSize: 11, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1.0 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  textInput: { flex: 1, fontSize: 16, padding: 0 },
  fieldError: { color: COLORS.danger, fontSize: 12, marginTop: 6, fontWeight: '500' },
  strengthRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 4 },
  strengthSegment: { flex: 1, height: 4, borderRadius: 2 },
  strengthLabel: { fontSize: 11, fontWeight: '700', marginLeft: 4, minWidth: 40 },
  termsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 24 },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginTop: 2, flexShrink: 0 },
  termsText: { fontSize: 13, flex: 1, lineHeight: 20 },
  registerBtn: { borderRadius: 10, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  registerBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  btnContent: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  loginRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 28 },
  loginPrompt: { fontSize: 14 },
  loginLink: { fontSize: 14, fontWeight: '700' },
});

export default RegisterScreen;
