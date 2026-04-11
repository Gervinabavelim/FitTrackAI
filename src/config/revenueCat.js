import { Platform, TurboModuleRegistry, NativeModules } from 'react-native';
import { captureException } from './sentry';

// RevenueCat API keys — replace with your actual keys from RevenueCat dashboard
const API_KEYS = {
  ios: 'test_txapXfnnRWSegMkNTDIGvOBuNXH',
  android: 'goog_YOUR_REVENUECAT_ANDROID_API_KEY',
};

// Entitlement identifier configured in RevenueCat dashboard
export const PRO_ENTITLEMENT_ID = 'pro';

/**
 * Check if the RevenueCat native module is available in this build.
 * It won't be if the dev client was built before react-native-purchases was installed.
 */
const hasNativeModule = !!(
  NativeModules.RNPurchases ||
  (TurboModuleRegistry && TurboModuleRegistry.get && TurboModuleRegistry.get('RNPurchases'))
);

/**
 * Safely get the Purchases module.
 * Returns null when the native module isn't linked in the current build.
 */
function getPurchases() {
  if (!hasNativeModule) {
    if (__DEV__) console.log('[RevenueCat] Native module not in this build — use DEV toggle to test Pro');
    return null;
  }
  try {
    return require('react-native-purchases').default;
  } catch (error) {
    if (__DEV__) {
      console.log('[RevenueCat] Failed to load:', error.message);
    }
    return null;
  }
}

/**
 * Initialize RevenueCat SDK — call once on app startup after auth
 * @param {string} userId - Firebase user UID for cross-platform identity
 */
export async function initRevenueCat(userId) {
  try {
    const Purchases = getPurchases();
    if (!Purchases) return;

    const apiKey = Platform.OS === 'ios' ? API_KEYS.ios : API_KEYS.android;

    if (!apiKey || apiKey.includes('YOUR_')) {
      console.log('[RevenueCat] Skipping init — no API key configured');
      return;
    }

    Purchases.configure({
      apiKey,
      appUserID: userId,
    });
  } catch (error) {
    if (__DEV__) {
      console.log('[RevenueCat] Init failed (expected in Expo Go):', error.message);
    } else {
      captureException(error);
    }
  }
}

/**
 * Check if the user currently has an active Pro subscription
 * @returns {Promise<boolean>}
 */
export async function checkProStatus() {
  try {
    const Purchases = getPurchases();
    if (!Purchases) return false;
    if (Purchases.isConfigured && !Purchases.isConfigured()) return false;
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo.entitlements.active[PRO_ENTITLEMENT_ID] !== undefined;
  } catch (error) {
    if (!__DEV__) captureException(error);
    return false;
  }
}

/**
 * Fetch available subscription packages
 * @returns {Promise<Array>} Array of package objects
 */
export async function getOfferings() {
  try {
    const Purchases = getPurchases();
    if (!Purchases) return [];
    if (Purchases.isConfigured && !Purchases.isConfigured()) return [];
    const offerings = await Purchases.getOfferings();
    if (offerings.current && offerings.current.availablePackages.length > 0) {
      return offerings.current.availablePackages;
    }
    return [];
  } catch (error) {
    if (!__DEV__) captureException(error);
    return [];
  }
}

/**
 * Purchase a subscription package
 * @param {object} pkg - RevenueCat package object
 * @returns {Promise<{success: boolean, isPro: boolean, error?: string}>}
 */
export async function purchasePackage(pkg) {
  try {
    const Purchases = getPurchases();
    if (!Purchases) return { success: false, isPro: false, error: 'Purchases not available' };
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    const isPro = customerInfo.entitlements.active[PRO_ENTITLEMENT_ID] !== undefined;
    return { success: true, isPro };
  } catch (error) {
    if (error.userCancelled) {
      return { success: false, isPro: false, error: 'cancelled' };
    }
    captureException(error);
    return { success: false, isPro: false, error: error.message };
  }
}

/**
 * Restore previous purchases (e.g. after reinstall or new device)
 * @returns {Promise<{success: boolean, isPro: boolean, error?: string}>}
 */
export async function restorePurchases() {
  try {
    const Purchases = getPurchases();
    if (!Purchases) return { success: false, isPro: false, error: 'Purchases not available' };
    const customerInfo = await Purchases.restorePurchases();
    const isPro = customerInfo.entitlements.active[PRO_ENTITLEMENT_ID] !== undefined;
    return { success: true, isPro };
  } catch (error) {
    captureException(error);
    return { success: false, isPro: false, error: error.message };
  }
}
