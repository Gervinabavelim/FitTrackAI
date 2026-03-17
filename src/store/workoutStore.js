import { create } from 'zustand';
import {
  getWorkouts,
  getRecentWorkouts,
  addWorkout,
  deleteWorkout,
  getWorkoutsByDateRange,
} from '../services/workoutService';
import { calculateStreak } from '../utils/calculations';
import { captureException } from '../config/sentry';

const useWorkoutStore = create((set, get) => ({
  workouts: [],
  recentWorkouts: [],
  aiWorkoutPlan: null,
  loading: false,
  error: null,
  streak: 0,
  totalCalories: 0,
  weeklyWorkoutCount: 0,

  // Fetch all workouts for current user
  fetchWorkouts: async (userId) => {
    set({ loading: true, error: null });
    try {
      const workouts = await getWorkouts(userId);
      const streak = calculateStreak(workouts);
      const totalCalories = workouts.reduce((sum, w) => sum + (w.calories || 0), 0);
      set({ workouts, streak, totalCalories, loading: false });
    } catch (error) {
      captureException(error);
      // Sentry captures this error
      set({ error: error.message, loading: false });
    }
  },

  // Fetch recent workouts (last 10)
  fetchRecentWorkouts: async (userId) => {
    set({ loading: true, error: null });
    try {
      const recentWorkouts = await getRecentWorkouts(userId, 10);
      set({ recentWorkouts, loading: false });
    } catch (error) {
      captureException(error);
      // Sentry captures this error
      set({ error: error.message, loading: false });
    }
  },

  // Fetch workouts for last N days
  fetchWorkoutsForRange: async (userId, startDate, endDate) => {
    set({ loading: true, error: null });
    try {
      const workouts = await getWorkoutsByDateRange(userId, startDate, endDate);
      return workouts;
    } catch (error) {
      captureException(error);
      // Sentry captures this error
      set({ error: error.message, loading: false });
      return [];
    } finally {
      set({ loading: false });
    }
  },

  // Log a new workout
  logWorkout: async (userId, workoutData) => {
    set({ loading: true, error: null });
    try {
      const newWorkout = await addWorkout(userId, workoutData);

      // Optimistically update local state
      const updatedWorkouts = [newWorkout, ...get().workouts];
      const streak = calculateStreak(updatedWorkouts);
      const totalCalories = updatedWorkouts.reduce((sum, w) => sum + (w.calories || 0), 0);

      set({
        workouts: updatedWorkouts,
        recentWorkouts: updatedWorkouts.slice(0, 10),
        streak,
        totalCalories,
        loading: false,
      });
      return { success: true, workout: newWorkout };
    } catch (error) {
      captureException(error);
      // Sentry captures this error
      set({ error: error.message, loading: false });
      return { success: false, error: error.message };
    }
  },

  // Remove a workout
  removeWorkout: async (userId, workoutId) => {
    set({ loading: true, error: null });
    try {
      await deleteWorkout(userId, workoutId);
      const updatedWorkouts = get().workouts.filter((w) => w.id !== workoutId);
      const streak = calculateStreak(updatedWorkouts);
      const totalCalories = updatedWorkouts.reduce((sum, w) => sum + (w.calories || 0), 0);

      set({
        workouts: updatedWorkouts,
        recentWorkouts: updatedWorkouts.slice(0, 10),
        streak,
        totalCalories,
        loading: false,
      });
      return { success: true };
    } catch (error) {
      captureException(error);
      // Sentry captures this error
      set({ error: error.message, loading: false });
      return { success: false, error: error.message };
    }
  },

  // Compute weekly workout count from current workouts
  computeWeeklyStats: () => {
    const { workouts } = get();
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const weeklyWorkouts = workouts.filter((w) => {
      const workoutDate = new Date(w.date);
      return workoutDate >= oneWeekAgo;
    });

    set({ weeklyWorkoutCount: weeklyWorkouts.length });
  },

  // Save AI-generated workout plan
  setAiWorkoutPlan: (plan) => set({ aiWorkoutPlan: plan }),

  clearError: () => set({ error: null }),

  reset: () =>
    set({
      workouts: [],
      recentWorkouts: [],
      aiWorkoutPlan: null,
      loading: false,
      error: null,
      streak: 0,
      totalCalories: 0,
      weeklyWorkoutCount: 0,
    }),
}));

export default useWorkoutStore;
