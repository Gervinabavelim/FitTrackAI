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
  Alert,
  Animated,
  Easing,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import useAuthStore from '../../store/authStore';
import useTheme from '../../hooks/useTheme';
import { COLORS, ROUTES } from '../../utils/constants';
import { InlineSpinner } from '../../components/LoadingSpinner';
import { checkAuthRateLimit } from '../../utils/rateLimiter';
import { trackEvent } from '../../services/analyticsService';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const RegisterScreen = ({ navigation }) => {
  const { register, loading, authError, clearError } = useAuthStore();
  const { isDark, colors } = useTheme();

  const [showEmailForm, setShowEmailForm] = useState(false);
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
  const headerTranslateY = useRef(new Animated.Value(-15)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(20)).current;
  const footerOpacity = useRef(new Animated.Value(0)).current;
  const btnScale = useRef(new Animated.Value(1)).current;
  const checkboxScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(headerOpacity, { toValue: 1, duration: 450, useNativeDriver: true }),
        Animated.timing(headerTranslateY, { toValue: 0, duration: 450, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(contentOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(contentTranslateY, { toValue: 0, duration: 400, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      ]),
      Animated.timing(footerOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }, []);

  const onBtnPressIn = () => {
    Animated.spring(btnScale, { toValue: 0.97, friction: 8, useNativeDriver: true }).start();
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
      { score: 3, label: 'Good', color: COLORS.primary },
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

  const handleSocialSignIn = (provider) => {
    Alert.alert(`${provider} Sign Up`, `${provider} sign-up will be available soon.`);
  };

  const handleContinueWithEmail = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowEmailForm(true);
  };

  const inputBorderColor = (field) => {
    if (fieldErrors[field]) return COLORS.danger;
    if (focusedField === field) return COLORS.primary;
    return isDark ? 'rgba(255,255,255,0.15)' : COLORS.light.border;
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: isDark ? COLORS.dark.background : COLORS.light.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* Back button */}
          <Animated.View style={{ opacity: headerOpacity }}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="chevron-back" size={28} color={colors.text} />
            </TouchableOpacity>
          </Animated.View>

          {/* Header */}
          <Animated.View style={[styles.headerSection, { opacity: headerOpacity, transform: [{ translateY: headerTranslateY }] }]}>
            <Text style={[styles.title, { color: colors.text }]}>Create Account</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Start your transformation today</Text>
          </Animated.View>

          {/* Main Content */}
          <Animated.View style={{ transform: [{ translateX: shakeAnim }, { translateY: contentTranslateY }], opacity: contentOpacity }}>
            {authError && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={16} color="#FFF" />
                <Text style={styles.errorBannerText}>{authError}</Text>
              </View>
            )}

            {/* Sign up with Apple */}
            <TouchableOpacity
              style={[styles.authBtn, { borderColor: isDark ? 'rgba(255,255,255,0.2)' : '#E0E0E0', backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF' }]}
              onPress={() => handleSocialSignIn('Apple')}
              activeOpacity={0.7}
            >
              <Ionicons name="logo-apple" size={20} color={colors.text} />
              <Text style={[styles.authBtnText, { color: colors.text }]}>Sign up with Apple</Text>
            </TouchableOpacity>

            {/* Continue with Google */}
            <TouchableOpacity
              style={[styles.authBtn, { borderColor: isDark ? 'rgba(255,255,255,0.2)' : '#E0E0E0', backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF' }]}
              onPress={() => handleSocialSignIn('Google')}
              activeOpacity={0.7}
            >
              <Text style={styles.googleIcon}>G</Text>
              <Text style={[styles.authBtnText, { color: colors.text }]}>Continue with Google</Text>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={[styles.dividerLine, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : COLORS.light.border }]} />
              <Text style={[styles.dividerText, { color: colors.textMuted }]}>or</Text>
              <View style={[styles.dividerLine, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : COLORS.light.border }]} />
            </View>

            {!showEmailForm ? (
              <TouchableOpacity
                style={[styles.authBtn, { borderColor: isDark ? 'rgba(255,255,255,0.2)' : '#E0E0E0', backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF' }]}
                onPress={handleContinueWithEmail}
                activeOpacity={0.7}
              >
                <Ionicons name="mail-outline" size={20} color={colors.text} />
                <Text style={[styles.authBtnText, { color: colors.text }]}>Continue with Email</Text>
              </TouchableOpacity>
            ) : (
              <View>
                {/* Email */}
                <View style={styles.fieldGroup}>
                  <View style={[styles.inputWrapper, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : COLORS.light.inputBg, borderColor: inputBorderColor('email') }]}>
                    <Ionicons name="mail-outline" size={18} color={focusedField === 'email' ? COLORS.primary : colors.textMuted} />
                    <TextInput
                      value={email}
                      onChangeText={(t) => { setEmail(t); if (fieldErrors.email) setFieldErrors((e) => ({ ...e, email: null })); }}
                      placeholder="Email address" placeholderTextColor={colors.textMuted}
                      keyboardType="email-address" autoCapitalize="none" autoCorrect={false}
                      autoFocus
                      returnKeyType="next" onSubmitEditing={() => passwordRef.current?.focus()}
                      onFocus={() => setFocusedField('email')}
                      onBlur={() => setFocusedField(null)}
                      style={[styles.input, { color: colors.text }]} editable={!loading} maxLength={254}
                    />
                  </View>
                  {fieldErrors.email && <Text style={styles.fieldError}>{fieldErrors.email}</Text>}
                </View>

                {/* Password */}
                <View style={styles.fieldGroup}>
                  <View style={[styles.inputWrapper, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : COLORS.light.inputBg, borderColor: inputBorderColor('password') }]}>
                    <Ionicons name="lock-closed-outline" size={18} color={focusedField === 'password' ? COLORS.primary : colors.textMuted} />
                    <TextInput
                      ref={passwordRef} value={password}
                      onChangeText={(t) => { setPassword(t); if (fieldErrors.password) setFieldErrors((e) => ({ ...e, password: null })); }}
                      placeholder="Create a password" placeholderTextColor={colors.textMuted}
                      secureTextEntry={!showPassword} returnKeyType="next"
                      onSubmitEditing={() => confirmRef.current?.focus()}
                      onFocus={() => setFocusedField('password')}
                      onBlur={() => setFocusedField(null)}
                      style={[styles.input, { color: colors.text }]} editable={!loading} maxLength={128}
                    />
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                  {password.length > 0 && (
                    <View style={styles.strengthRow}>
                      {[1, 2, 3, 4].map((i) => (
                        <View key={i} style={[styles.strengthSegment, { backgroundColor: i <= strength.score ? strength.color : (isDark ? 'rgba(255,255,255,0.1)' : COLORS.light.border) }]} />
                      ))}
                      <Text style={[styles.strengthLabel, { color: strength.color }]}>{strength.label}</Text>
                    </View>
                  )}
                  {fieldErrors.password && <Text style={styles.fieldError}>{fieldErrors.password}</Text>}
                </View>

                {/* Confirm Password */}
                <View style={styles.fieldGroup}>
                  <View style={[styles.inputWrapper, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : COLORS.light.inputBg, borderColor: inputBorderColor('confirmPassword') }]}>
                    <Ionicons name="shield-checkmark-outline" size={18} color={focusedField === 'confirmPassword' ? COLORS.primary : colors.textMuted} />
                    <TextInput
                      ref={confirmRef} value={confirmPassword}
                      onChangeText={(t) => { setConfirmPassword(t); if (fieldErrors.confirmPassword) setFieldErrors((e) => ({ ...e, confirmPassword: null })); }}
                      placeholder="Re-enter password" placeholderTextColor={colors.textMuted}
                      secureTextEntry={!showConfirm} returnKeyType="done" onSubmitEditing={handleRegister}
                      onFocus={() => setFocusedField('confirmPassword')}
                      onBlur={() => setFocusedField(null)}
                      style={[styles.input, { color: colors.text }]} editable={!loading} maxLength={128}
                    />
                    <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                  {fieldErrors.confirmPassword && <Text style={styles.fieldError}>{fieldErrors.confirmPassword}</Text>}
                </View>

                {/* Terms */}
                <TouchableOpacity
                  style={styles.termsRow}
                  onPress={() => { setAgreedToTerms(!agreedToTerms); bounceCheckbox(); if (fieldErrors.terms) setFieldErrors((e) => ({ ...e, terms: null })); }}
                  activeOpacity={0.7}
                >
                  <Animated.View
                    style={[styles.checkbox, {
                      backgroundColor: agreedToTerms ? COLORS.primary : 'transparent',
                      borderColor: fieldErrors.terms ? COLORS.danger : agreedToTerms ? COLORS.primary : (isDark ? 'rgba(255,255,255,0.2)' : COLORS.light.border),
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
                {fieldErrors.terms && <Text style={[styles.fieldError, { marginBottom: 16 }]}>{fieldErrors.terms}</Text>}

                {/* Create Account Button */}
                <Animated.View style={{ transform: [{ scale: btnScale }] }}>
                  <TouchableOpacity
                    style={[styles.createBtn, { backgroundColor: COLORS.primary, opacity: loading ? 0.7 : 1 }]}
                    onPress={handleRegister} onPressIn={onBtnPressIn} onPressOut={onBtnPressOut}
                    disabled={loading} activeOpacity={1}
                  >
                    {loading ? (
                      <View style={styles.btnContent}>
                        <InlineSpinner color="#FFF" size={18} />
                        <Text style={styles.createBtnText}>Creating account...</Text>
                      </View>
                    ) : (
                      <Text style={styles.createBtnText}>Create Account</Text>
                    )}
                  </TouchableOpacity>
                </Animated.View>
              </View>
            )}
          </Animated.View>

          {/* Footer */}
          <Animated.View style={[styles.footer, { opacity: footerOpacity }]}>
            <View style={styles.loginRow}>
              <Text style={[styles.loginPrompt, { color: colors.textSecondary }]}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate(ROUTES.LOGIN)} disabled={loading}>
                <Text style={[styles.loginLink, { color: COLORS.primary }]}>Sign in</Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.legalText, { color: colors.textMuted }]}>
              By continuing, you agree to our{' '}
              <Text style={{ color: colors.textSecondary }}>Terms</Text>
              {' '}and acknowledge our{'\n'}
              <Text style={{ color: colors.textSecondary }}>Privacy Policy</Text>.
            </Text>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 28, paddingTop: 12, paddingBottom: 24, justifyContent: 'space-between' },

  backBtn: { marginBottom: 20 },
  headerSection: { marginBottom: 32 },
  title: { fontSize: 28, fontWeight: '700', letterSpacing: -0.3 },
  subtitle: { fontSize: 15, marginTop: 6, fontWeight: '400' },

  // Error
  errorBanner: { backgroundColor: COLORS.danger, borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  errorBannerText: { color: '#FFF', fontSize: 13, fontWeight: '500', flex: 1 },

  // Auth buttons
  authBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 15,
    gap: 10,
    marginBottom: 12,
  },
  authBtnText: { fontSize: 16, fontWeight: '600' },
  googleIcon: { fontSize: 18, fontWeight: '700', color: '#4285F4' },

  // Divider
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth },
  dividerText: { marginHorizontal: 16, fontSize: 13, fontWeight: '500' },

  // Fields
  fieldGroup: { marginBottom: 14 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
  },
  input: { flex: 1, fontSize: 16, padding: 0 },
  fieldError: { color: COLORS.danger, fontSize: 12, marginTop: 6, fontWeight: '500' },

  strengthRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 4 },
  strengthSegment: { flex: 1, height: 4, borderRadius: 2 },
  strengthLabel: { fontSize: 11, fontWeight: '700', marginLeft: 4, minWidth: 40 },

  // Terms
  termsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 24 },
  checkbox: { width: 22, height: 22, borderRadius: 7, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginTop: 1, flexShrink: 0 },
  termsText: { fontSize: 14, flex: 1, lineHeight: 21 },

  // Create Account
  createBtn: { borderRadius: 12, paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  createBtnText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  btnContent: { flexDirection: 'row', alignItems: 'center', gap: 10 },

  // Footer
  footer: { marginTop: 32 },
  loginRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 16 },
  loginPrompt: { fontSize: 15 },
  loginLink: { fontSize: 15, fontWeight: '600' },
  legalText: { fontSize: 12, textAlign: 'center', lineHeight: 18 },
});

export default RegisterScreen;
