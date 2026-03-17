import { create } from 'zustand';
import { auth, db } from '../config/firebase';
import { sanitizeProfileData, sanitizeEmail } from '../utils/sanitize';
import { captureException } from '../config/sentry';

const useAuthStore = create((set, get) => ({
  user: null,
  profile: null,
  loading: true,
  authError: null,

  // Initialize auth listener
  initAuth: () => {
    // Timeout fallback: if Firebase doesn't respond within 5 seconds, stop loading
    const timeout = setTimeout(() => {
      const { loading } = get();
      if (loading) {
        set({ user: null, profile: null, loading: false });
      }
    }, 5000);

    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      clearTimeout(timeout);
      if (firebaseUser) {
        try {
          const profilePromise = db.collection('users').doc(firebaseUser.uid).get();
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Firestore timeout')), 5000)
          );
          const profileDoc = await Promise.race([profilePromise, timeoutPromise]);
          const profileData = profileDoc.exists ? profileDoc.data() : null;
          set({ user: firebaseUser, profile: profileData, loading: false, authError: null });
        } catch (error) {
          captureException(error);
          set({ user: firebaseUser, profile: null, loading: false });
        }
      } else {
        set({ user: null, profile: null, loading: false });
      }
    });
    return unsubscribe;
  },

  // Login with email and password
  login: async (email, password) => {
    set({ authError: null, loading: true });
    try {
      const credential = await auth.signInWithEmailAndPassword(sanitizeEmail(email), password);
      const profileDoc = await db.collection('users').doc(credential.user.uid).get();
      const profileData = profileDoc.exists ? profileDoc.data() : null;
      set({ user: credential.user, profile: profileData, loading: false });
      return { success: true, hasProfile: !!profileData };
    } catch (error) {
      const message = mapFirebaseAuthError(error.code);
      set({ authError: message, loading: false });
      return { success: false, error: message };
    }
  },

  // Register new user
  register: async (email, password) => {
    set({ authError: null, loading: true });
    try {
      const credential = await auth.createUserWithEmailAndPassword(sanitizeEmail(email), password);
      set({ user: credential.user, profile: null, loading: false });
      return { success: true };
    } catch (error) {
      const message = mapFirebaseAuthError(error.code);
      set({ authError: message, loading: false });
      return { success: false, error: message };
    }
  },

  // Save user profile to Firestore
  saveProfile: async (profileData) => {
    const { user } = get();
    if (!user) return { success: false, error: 'Not authenticated' };
    set({ loading: true });
    try {
      const profile = {
        ...sanitizeProfileData(profileData),
        uid: user.uid,
        email: user.email,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await db.collection('users').doc(user.uid).set(profile);
      set({ profile, loading: false });
      return { success: true };
    } catch (error) {
      captureException(error);
      captureException(error);
      set({ loading: false });
      return { success: false, error: error.message };
    }
  },

  // Update user profile
  updateProfile: async (updates) => {
    const { user, profile } = get();
    if (!user) return { success: false, error: 'Not authenticated' };
    set({ loading: true });
    try {
      const updatedProfile = {
        ...profile,
        ...sanitizeProfileData(updates),
        updatedAt: new Date().toISOString(),
      };
      await db.collection('users').doc(user.uid).update(updatedProfile);
      set({ profile: updatedProfile, loading: false });
      return { success: true };
    } catch (error) {
      captureException(error);
      captureException(error);
      set({ loading: false });
      return { success: false, error: error.message };
    }
  },

  // Reset password
  resetPassword: async (email) => {
    try {
      await auth.sendPasswordResetEmail(sanitizeEmail(email));
      return { success: true };
    } catch (error) {
      const message = mapFirebaseAuthError(error.code);
      return { success: false, error: message };
    }
  },

  // Logout
  logout: async () => {
    set({ loading: true });
    try {
      await auth.signOut();
      set({ user: null, profile: null, loading: false });
    } catch (error) {
      captureException(error);
      set({ loading: false });
    }
  },

  clearError: () => set({ authError: null }),
}));

// Map Firebase error codes to user-friendly messages
function mapFirebaseAuthError(code) {
  switch (code) {
    case 'auth/user-not-found':
      return 'No account found with this email address.';
    case 'auth/wrong-password':
      return 'Incorrect password. Please try again.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please try again later.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection.';
    case 'auth/invalid-credential':
      return 'Invalid email or password. Please check and try again.';
    default:
      return 'An error occurred. Please try again.';
  }
}

export default useAuthStore;
