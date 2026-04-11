import { create } from 'zustand';
import {
  initRevenueCat,
  checkProStatus,
  getOfferings,
  purchasePackage,
  restorePurchases,
} from '../config/revenueCat';
import { captureException } from '../config/sentry';
import { auth } from '../config/firebase';

// Emails that always get Pro access (developer/admin accounts)
const ADMIN_EMAILS = [
  'abavelimgervin@gmail.com',
];

function isAdminUser() {
  const email = auth.currentUser?.email?.toLowerCase();
  return email && ADMIN_EMAILS.includes(email);
}

const useSubscriptionStore = create((set, get) => ({
  isPro: false,
  packages: [],
  loading: false,
  initialized: false,

  /**
   * Initialize RevenueCat and check subscription status.
   * Call once after the user is authenticated.
   */
  initialize: async (userId) => {
    if (get().initialized) return;
    set({ loading: true });
    try {
      // Admin/developer accounts always get Pro
      if (isAdminUser()) {
        set({ isPro: true, initialized: true, loading: false });
        return;
      }
      await initRevenueCat(userId);
      const isPro = await checkProStatus();
      set({ isPro, initialized: true });
    } catch (error) {
      captureException(error);
    } finally {
      set({ loading: false });
    }
  },

  /**
   * Load available subscription packages from RevenueCat
   */
  fetchPackages: async () => {
    set({ loading: true });
    try {
      const packages = await getOfferings();
      set({ packages });
    } catch (error) {
      captureException(error);
    } finally {
      set({ loading: false });
    }
  },

  /**
   * Purchase a subscription package
   */
  purchase: async (pkg) => {
    set({ loading: true });
    try {
      const result = await purchasePackage(pkg);
      if (result.success && result.isPro) {
        set({ isPro: true });
      }
      return result;
    } catch (error) {
      captureException(error);
      return { success: false, isPro: false, error: error.message };
    } finally {
      set({ loading: false });
    }
  },

  /**
   * Restore previous purchases
   */
  restore: async () => {
    set({ loading: true });
    try {
      const result = await restorePurchases();
      if (result.success && result.isPro) {
        set({ isPro: true });
      }
      return result;
    } catch (error) {
      captureException(error);
      return { success: false, isPro: false, error: error.message };
    } finally {
      set({ loading: false });
    }
  },

  /**
   * Refresh pro status (e.g. after app foreground)
   */
  refreshStatus: async () => {
    try {
      const isPro = await checkProStatus();
      set({ isPro });
    } catch (error) {
      captureException(error);
    }
  },

  /**
   * DEV ONLY: Toggle pro status for testing free vs pro experience.
   * Remove this before going to production.
   */
  toggleProDev: () => set((state) => ({ isPro: !state.isPro })),

  /**
   * Reset store on logout
   */
  reset: () => set({ isPro: false, packages: [], loading: false, initialized: false }),
}));

export default useSubscriptionStore;
