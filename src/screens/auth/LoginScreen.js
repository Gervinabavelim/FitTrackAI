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
import { trackEvent } from '../../services/analyticsService';
import { InlineSpinner } from '../../components/LoadingSpinner';
import { checkAuthRateLimit } from '../../utils/rateLimiter';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const LoginScreen = ({ navigation }) => {
  const { login, resetPassword, loading, authError, clearError } = useAuthStore();
  const { isDark, colors } = useTheme();

  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const passwordRef = useRef(null);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // ─── Entrance Animations ────────────────────────────────────────────────────
  const heroOpacity = useRef(new Animated.Value(0)).current;
  const heroTranslateY = useRef(new Animated.Value(-15)).current;
  const buttonsOpacity = useRef(new Animated.Value(0)).current;
  const buttonsTranslateY = useRef(new Animated.Value(20)).current;
  const footerOpacity = useRef(new Animated.Value(0)).current;
  const btnScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(heroOpacity, { toValue: 1, duration: 500, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(heroTranslateY, { toValue: 0, duration: 500, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(buttonsOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(buttonsTranslateY, { toValue: 0, duration: 400, easing: Easing.out(Easing.ease), useNativeDriver: true }),
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

  const validate = () => {
    const errors = {};
    if (!email.trim()) errors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errors.email = 'Enter a valid email address';
    if (!password) errors.password = 'Password is required';
    else if (password.length < 6) errors.password = 'Password must be at least 6 characters';
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

  const handleLogin = async () => {
    clearError();
    setFieldErrors({});
    if (!validate()) { shake(); return; }
    const rateCheck = checkAuthRateLimit();
    if (!rateCheck.allowed) { setFieldErrors({ email: rateCheck.message }); shake(); return; }
    const result = await login(email.trim().toLowerCase(), password);
    if (result.success) {
      trackEvent('login_success');
    } else {
      trackEvent('login_failed');
      shake();
    }
  };

  const handleSocialSignIn = (provider) => {
    Alert.alert(`${provider} Sign In`, `${provider} sign-in will be available soon.`);
  };

  const handleContinueWithEmail = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowEmailForm(true);
  };

  const inputBorderColor = (field) => {
    if (fieldErrors[field]) return COLORS.danger;
    if (field === 'email' && emailFocused) return COLORS.primary;
    if (field === 'password' && passwordFocused) return COLORS.primary;
    return isDark ? 'rgba(255,255,255,0.15)' : COLORS.light.border;
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: isDark ? COLORS.dark.background : COLORS.light.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Hero */}
          <Animated.View style={[styles.heroSection, { opacity: heroOpacity, transform: [{ translateY: heroTranslateY }] }]}>
            <View style={[styles.logoContainer, { backgroundColor: COLORS.primary }]}>
              <Ionicons name="flash" size={32} color="#FFFFFF" />
            </View>
            <Text style={[styles.appName, { color: colors.text }]}>FitTrack AI</Text>
            <Text style={[styles.tagline, { color: colors.textSecondary }]}>Your AI-powered fitness companion</Text>
          </Animated.View>

          {/* Buttons Section */}
          <Animated.View style={[{ opacity: buttonsOpacity, transform: [{ translateX: shakeAnim }, { translateY: buttonsTranslateY }] }]}>
            <Text style={[styles.signInHeading, { color: colors.text }]}>Sign in</Text>

            {authError && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={16} color="#FFF" />
                <Text style={styles.errorBannerText}>{authError}</Text>
              </View>
            )}

            {/* Sign in with Apple */}
            <TouchableOpacity
              style={[styles.authBtn, { borderColor: isDark ? 'rgba(255,255,255,0.2)' : '#E0E0E0', backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF' }]}
              onPress={() => handleSocialSignIn('Apple')}
              activeOpacity={0.7}
            >
              <Ionicons name="logo-apple" size={20} color={colors.text} />
              <Text style={[styles.authBtnText, { color: colors.text }]}>Sign in with Apple</Text>
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

            {/* Continue with Email */}
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
                  <View
                    style={[
                      styles.inputWrapper,
                      {
                        borderColor: inputBorderColor('email'),
                        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : COLORS.light.inputBg,
                      },
                    ]}
                  >
                    <Ionicons name="mail-outline" size={18} color={emailFocused ? COLORS.primary : colors.textMuted} />
                    <TextInput
                      style={[styles.input, { color: colors.text }]}
                      value={email}
                      onChangeText={(text) => { setEmail(text); if (fieldErrors.email) setFieldErrors((e) => ({ ...e, email: null })); }}
                      placeholder="Email address"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoFocus
                      returnKeyType="next"
                      onSubmitEditing={() => passwordRef.current?.focus()}
                      onFocus={() => setEmailFocused(true)}
                      onBlur={() => setEmailFocused(false)}
                      editable={!loading}
                      maxLength={254}
                    />
                  </View>
                  {fieldErrors.email && <Text style={styles.fieldError}>{fieldErrors.email}</Text>}
                </View>

                {/* Password */}
                <View style={styles.fieldGroup}>
                  <View
                    style={[
                      styles.inputWrapper,
                      {
                        borderColor: inputBorderColor('password'),
                        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : COLORS.light.inputBg,
                      },
                    ]}
                  >
                    <Ionicons name="lock-closed-outline" size={18} color={passwordFocused ? COLORS.primary : colors.textMuted} />
                    <TextInput
                      ref={passwordRef}
                      style={[styles.input, { color: colors.text }]}
                      value={password}
                      onChangeText={(text) => { setPassword(text); if (fieldErrors.password) setFieldErrors((e) => ({ ...e, password: null })); }}
                      placeholder="Password"
                      placeholderTextColor={colors.textMuted}
                      secureTextEntry={!showPassword}
                      returnKeyType="done"
                      onSubmitEditing={handleLogin}
                      onFocus={() => setPasswordFocused(true)}
                      onBlur={() => setPasswordFocused(false)}
                      editable={!loading}
                      maxLength={128}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                  {fieldErrors.password && <Text style={styles.fieldError}>{fieldErrors.password}</Text>}
                </View>

                <TouchableOpacity
                  style={styles.forgotBtn}
                  onPress={async () => {
                    const trimmedEmail = email.trim().toLowerCase();
                    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
                      Alert.alert('Enter Your Email', 'Please enter your email address above, then tap "Forgot password?" again.');
                      return;
                    }
                    const result = await resetPassword(trimmedEmail);
                    if (result.success) {
                      Alert.alert('Check Your Inbox', `We've sent a password reset link to ${trimmedEmail}. Check your spam folder if you don't see it.`);
                    } else {
                      Alert.alert('Reset Failed', result.error);
                    }
                  }}
                >
                  <Text style={[styles.forgotText, { color: COLORS.primary }]}>Forgot password?</Text>
                </TouchableOpacity>

                {/* Sign In Button */}
                <Animated.View style={{ transform: [{ scale: btnScale }] }}>
                  <TouchableOpacity
                    style={[styles.signInBtn, { backgroundColor: COLORS.primary, opacity: loading ? 0.7 : 1 }]}
                    onPress={handleLogin}
                    onPressIn={onBtnPressIn}
                    onPressOut={onBtnPressOut}
                    disabled={loading}
                    activeOpacity={1}
                  >
                    {loading ? (
                      <View style={styles.btnContent}>
                        <InlineSpinner color="#FFF" size={18} />
                        <Text style={styles.signInBtnText}>Signing in...</Text>
                      </View>
                    ) : (
                      <Text style={styles.signInBtnText}>Sign In</Text>
                    )}
                  </TouchableOpacity>
                </Animated.View>
              </View>
            )}
          </Animated.View>

          {/* Footer */}
          <Animated.View style={[styles.footer, { opacity: footerOpacity }]}>
            <View style={styles.registerRow}>
              <Text style={[styles.registerPrompt, { color: colors.textSecondary }]}>New here? </Text>
              <TouchableOpacity onPress={() => navigation.navigate(ROUTES.REGISTER)} disabled={loading}>
                <Text style={[styles.registerLink, { color: COLORS.primary }]}>Create an account</Text>
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
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 40,
    paddingBottom: 24,
    justifyContent: 'space-between',
  },

  // Hero
  heroSection: { alignItems: 'center', marginBottom: 44 },
  logoContainer: {
    width: 68,
    height: 68,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  appName: { fontSize: 26, fontWeight: '700', letterSpacing: -0.3 },
  tagline: { fontSize: 14, marginTop: 5, fontWeight: '400' },

  // Sign in heading
  signInHeading: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 24,
  },

  // Error
  errorBanner: {
    backgroundColor: COLORS.danger,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
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
  authBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
  googleIcon: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4285F4',
  },

  // Divider
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth },
  dividerText: { marginHorizontal: 16, fontSize: 13, fontWeight: '500' },

  // Email form fields
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
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '400',
    padding: 0,
  },
  fieldError: { color: COLORS.danger, fontSize: 12, marginTop: 6, fontWeight: '500' },

  forgotBtn: { alignSelf: 'flex-end', marginBottom: 20, marginTop: -2 },
  forgotText: { fontSize: 14, fontWeight: '600' },

  // Sign In
  signInBtn: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signInBtnText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  btnContent: { flexDirection: 'row', alignItems: 'center', gap: 10 },

  // Footer
  footer: { marginTop: 32 },
  registerRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 16 },
  registerPrompt: { fontSize: 15, fontWeight: '400' },
  registerLink: { fontSize: 15, fontWeight: '600' },
  legalText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default LoginScreen;
