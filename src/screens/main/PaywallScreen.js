import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import useSubscriptionStore from '../../store/subscriptionStore';
import useTheme from '../../hooks/useTheme';
import useHaptics from '../../hooks/useHaptics';
import { useToast } from '../../contexts/ToastContext';
import { COLORS } from '../../utils/constants';
import { PRO_FEATURE_DETAILS } from '../../utils/proFeatures';
import { trackEvent } from '../../services/analyticsService';

const PaywallScreen = ({ navigation, route }) => {
  const { packages, fetchPackages, purchase, restore, loading, isPro } = useSubscriptionStore();
  const { isDark, colors } = useTheme();
  const haptics = useHaptics();
  const { showToast } = useToast();

  const [selectedPkg, setSelectedPkg] = useState(null);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const featureSource = route?.params?.feature;

  useEffect(() => {
    fetchPackages();
    trackEvent('paywall_viewed', { source: featureSource || 'unknown' });
  }, []);

  // Auto-select first package
  useEffect(() => {
    if (packages.length > 0 && !selectedPkg) {
      // Prefer annual if available, otherwise first package
      const annual = packages.find((p) => p.packageType === 'ANNUAL');
      setSelectedPkg(annual || packages[0]);
    }
  }, [packages]);

  // If already pro (e.g. restored), go back
  useEffect(() => {
    if (isPro) {
      showToast('Welcome to Pro! All features unlocked.', 'success');
      navigation.goBack();
    }
  }, [isPro]);

  const handlePurchase = async () => {
    if (!selectedPkg) return;
    haptics.medium();
    setPurchasing(true);
    const result = await purchase(selectedPkg);
    setPurchasing(false);

    if (result.success) {
      trackEvent('subscription_purchased', { package: selectedPkg.identifier });
    } else if (result.error !== 'cancelled') {
      showToast(result.error || 'Purchase failed. Please try again.', 'error');
    }
  };

  const handleRestore = async () => {
    haptics.selection();
    setRestoring(true);
    const result = await restore();
    setRestoring(false);

    if (result.success && result.isPro) {
      trackEvent('subscription_restored');
    } else if (result.success && !result.isPro) {
      showToast('No active subscription found.', 'warning');
    } else {
      showToast(result.error || 'Restore failed. Please try again.', 'error');
    }
  };

  const getPackageLabel = (pkg) => {
    switch (pkg.packageType) {
      case 'MONTHLY':
        return 'Monthly';
      case 'ANNUAL':
        return 'Annual';
      case 'LIFETIME':
        return 'Lifetime';
      default:
        return pkg.identifier;
    }
  };

  const getPackageSavings = (pkg) => {
    if (pkg.packageType === 'ANNUAL') return 'Save 50%';
    if (pkg.packageType === 'LIFETIME') return 'Best Value';
    return null;
  };

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: isDark ? COLORS.dark.background : COLORS.light.background },
      ]}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Close button */}
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.closeBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="close" size={24} color={colors.textSecondary} />
        </TouchableOpacity>

        {/* Hero */}
        <View style={styles.hero}>
          <View style={[styles.proBadgeLarge, { backgroundColor: `${COLORS.warning}20` }]}>
            <Ionicons name="diamond" size={32} color={COLORS.warning} />
          </View>
          <Text style={[styles.heroTitle, { color: colors.text }]}>
            Upgrade to Pro
          </Text>
          <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
            Unlock the full power of FitTrack AI
          </Text>
        </View>

        {/* Feature list */}
        <View style={styles.featureList}>
          {PRO_FEATURE_DETAILS.map((feature) => (
            <View
              key={feature.id}
              style={[
                styles.featureRow,
                {
                  backgroundColor: isDark ? COLORS.dark.card : COLORS.light.card,
                  borderColor: isDark ? COLORS.dark.border : COLORS.light.border,
                },
              ]}
            >
              <View style={[styles.featureIcon, { backgroundColor: `${COLORS.primary}15` }]}>
                <Ionicons name={feature.icon} size={20} color={COLORS.primary} />
              </View>
              <View style={styles.featureText}>
                <Text style={[styles.featureTitle, { color: colors.text }]}>
                  {feature.title}
                </Text>
                <Text style={[styles.featureDesc, { color: colors.textSecondary }]}>
                  {feature.description}
                </Text>
              </View>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
            </View>
          ))}
        </View>

        {/* Packages */}
        {loading && packages.length === 0 ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginVertical: 24 }} />
        ) : (
          <View style={styles.packagesSection}>
            <Text style={[styles.packagesTitle, { color: colors.text }]}>
              CHOOSE YOUR PLAN
            </Text>
            {packages.map((pkg) => {
              const isSelected = selectedPkg?.identifier === pkg.identifier;
              const savings = getPackageSavings(pkg);
              return (
                <TouchableOpacity
                  key={pkg.identifier}
                  onPress={() => { haptics.selection(); setSelectedPkg(pkg); }}
                  activeOpacity={0.8}
                  style={[
                    styles.packageCard,
                    {
                      backgroundColor: isDark ? COLORS.dark.card : COLORS.light.card,
                      borderColor: isSelected ? COLORS.primary : (isDark ? COLORS.dark.border : COLORS.light.border),
                      borderWidth: isSelected ? 2 : 1,
                    },
                  ]}
                >
                  <View style={styles.packageInfo}>
                    <View style={styles.packageLabelRow}>
                      <Text style={[styles.packageLabel, { color: colors.text }]}>
                        {getPackageLabel(pkg)}
                      </Text>
                      {savings && (
                        <View style={[styles.savingsBadge, { backgroundColor: `${COLORS.success}18` }]}>
                          <Text style={[styles.savingsText, { color: COLORS.success }]}>
                            {savings}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.packagePrice, { color: colors.textSecondary }]}>
                      {pkg.product?.priceString || '---'}
                      {pkg.packageType === 'MONTHLY' && '/month'}
                      {pkg.packageType === 'ANNUAL' && '/year'}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.radio,
                      {
                        borderColor: isSelected ? COLORS.primary : colors.textMuted,
                        backgroundColor: isSelected ? COLORS.primary : 'transparent',
                      },
                    ]}
                  >
                    {isSelected && <Ionicons name="checkmark" size={14} color="#FFF" />}
                  </View>
                </TouchableOpacity>
              );
            })}

            {/* Fallback when RevenueCat isn't configured yet */}
            {packages.length === 0 && !loading && (
              <View
                style={[
                  styles.placeholderCard,
                  {
                    backgroundColor: isDark ? COLORS.dark.card : COLORS.light.card,
                    borderColor: isDark ? COLORS.dark.border : COLORS.light.border,
                  },
                ]}
              >
                <Ionicons name="information-circle-outline" size={20} color={colors.textMuted} />
                <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>
                  Subscription plans will be available soon. Stay tuned!
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Purchase button */}
        <TouchableOpacity
          style={[
            styles.purchaseBtn,
            { opacity: (purchasing || !selectedPkg) ? 0.7 : 1 },
          ]}
          onPress={handlePurchase}
          disabled={purchasing || !selectedPkg}
          activeOpacity={0.85}
        >
          {purchasing ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.purchaseBtnText}>
              {selectedPkg ? `Subscribe Now` : 'Select a Plan'}
            </Text>
          )}
        </TouchableOpacity>

        {/* Restore */}
        <TouchableOpacity
          onPress={handleRestore}
          disabled={restoring}
          style={styles.restoreBtn}
          activeOpacity={0.7}
        >
          {restoring ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <Text style={[styles.restoreText, { color: COLORS.primary }]}>
              Restore Purchases
            </Text>
          )}
        </TouchableOpacity>

        {/* Legal */}
        <Text style={[styles.legalText, { color: colors.textMuted }]}>
          Payment will be charged to your Apple ID account at confirmation of purchase.
          Subscriptions automatically renew unless canceled at least 24 hours before the end
          of the current period. You can manage and cancel your subscriptions in your App Store
          account settings.
        </Text>

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  closeBtn: {
    alignSelf: 'flex-end',
    padding: 16,
  },
  hero: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  proBadgeLarge: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  featureList: {
    paddingHorizontal: 20,
    marginBottom: 28,
    gap: 10,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    gap: 12,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: { flex: 1 },
  featureTitle: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  featureDesc: { fontSize: 12, lineHeight: 18 },
  packagesSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  packagesTitle: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.0,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  packageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 10,
    marginBottom: 10,
  },
  packageInfo: { flex: 1 },
  packageLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  packageLabel: { fontSize: 16, fontWeight: '700' },
  savingsBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  savingsText: { fontSize: 11, fontWeight: '700' },
  packagePrice: { fontSize: 14 },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
  },
  placeholderText: { flex: 1, fontSize: 13, lineHeight: 20 },
  purchaseBtn: {
    marginHorizontal: 20,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  purchaseBtnText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '800',
  },
  restoreBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 16,
  },
  restoreText: {
    fontSize: 14,
    fontWeight: '600',
  },
  legalText: {
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'center',
    paddingHorizontal: 32,
    marginBottom: 16,
  },
});

export default PaywallScreen;
