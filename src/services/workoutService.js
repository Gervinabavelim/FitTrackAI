import firebase from 'firebase/compat/app';
import { db } from '../config/firebase';
import { sanitizeWorkoutData } from '../utils/sanitize';

// ─── Helper ───────────────────────────────────────────────────────────────────
function docToWorkout(docSnap) {
  const data = docSnap.data();
  const Timestamp = firebase.firestore.Timestamp;
  return {
    id: docSnap.id,
    ...data,
    date:
      data.date instanceof Timestamp
        ? data.date.toDate().toISOString()
        : data.date,
    createdAt:
      data.createdAt instanceof Timestamp
        ? data.createdAt.toDate().toISOString()
        : data.createdAt,
  };
}

// ─── Add Workout ──────────────────────────────────────────────────────────────
export async function addWorkout(userId, workoutData) {
  try {
    const sanitized = sanitizeWorkoutData(workoutData);
    const workoutsRef = db.collection('users').doc(userId).collection('workouts');
    const payload = {
      ...sanitized,
      userId,
      date: sanitized.date || new Date().toISOString(),
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await workoutsRef.add(payload);

    return {
      id: docRef.id,
      ...sanitized,
      userId,
      date: sanitized.date || new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('addWorkout error:', error);
    throw new Error(`Failed to save workout: ${error.message}`);
  }
}

// ─── Get All Workouts ─────────────────────────────────────────────────────────
export async function getWorkouts(userId) {
  try {
    const workoutsRef = db.collection('users').doc(userId).collection('workouts');
    const snapshot = await workoutsRef.orderBy('date', 'desc').get();
    return snapshot.docs.map(docToWorkout);
  } catch (error) {
    console.error('getWorkouts error:', error);
    throw new Error(`Failed to fetch workouts: ${error.message}`);
  }
}

// ─── Get Recent Workouts ──────────────────────────────────────────────────────
export async function getRecentWorkouts(userId, count = 10) {
  try {
    const workoutsRef = db.collection('users').doc(userId).collection('workouts');
    const snapshot = await workoutsRef.orderBy('date', 'desc').limit(count).get();
    return snapshot.docs.map(docToWorkout);
  } catch (error) {
    console.error('getRecentWorkouts error:', error);
    throw new Error(`Failed to fetch recent workouts: ${error.message}`);
  }
}

// ─── Get Workouts by Date Range ───────────────────────────────────────────────
export async function getWorkoutsByDateRange(userId, startDate, endDate) {
  try {
    const workoutsRef = db.collection('users').doc(userId).collection('workouts');
    const snapshot = await workoutsRef
      .where('date', '>=', startDate)
      .where('date', '<=', endDate)
      .orderBy('date', 'desc')
      .get();
    return snapshot.docs.map(docToWorkout);
  } catch (error) {
    console.error('getWorkoutsByDateRange error:', error);
    throw new Error(`Failed to fetch workouts by date range: ${error.message}`);
  }
}

// ─── Get Single Workout ───────────────────────────────────────────────────────
export async function getWorkout(userId, workoutId) {
  try {
    const docSnap = await db
      .collection('users').doc(userId)
      .collection('workouts').doc(workoutId)
      .get();
    if (!docSnap.exists) return null;
    return docToWorkout(docSnap);
  } catch (error) {
    console.error('getWorkout error:', error);
    throw new Error(`Failed to fetch workout: ${error.message}`);
  }
}

// ─── Delete Workout ───────────────────────────────────────────────────────────
export async function deleteWorkout(userId, workoutId) {
  try {
    await db
      .collection('users').doc(userId)
      .collection('workouts').doc(workoutId)
      .delete();
  } catch (error) {
    console.error('deleteWorkout error:', error);
    throw new Error(`Failed to delete workout: ${error.message}`);
  }
}

// ─── Save AI Workout Plan ──────────────────────────────────────────────────────
export async function saveAIWorkoutPlan(userId, plan) {
  try {
    const plansRef = db.collection('users').doc(userId).collection('plans');
    const payload = {
      ...plan,
      userId,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    };
    const docRef = await plansRef.add(payload);
    return { id: docRef.id, ...plan, createdAt: new Date().toISOString() };
  } catch (error) {
    console.error('saveAIWorkoutPlan error:', error);
    throw new Error(`Failed to save workout plan: ${error.message}`);
  }
}

// ─── Get Saved Plans ───────────────────────────────────────────────────────────
export async function getSavedPlans(userId) {
  try {
    const plansRef = db.collection('users').doc(userId).collection('plans');
    const snapshot = await plansRef.orderBy('createdAt', 'desc').limit(5).get();
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error('getSavedPlans error:', error);
    throw new Error(`Failed to fetch plans: ${error.message}`);
  }
}
