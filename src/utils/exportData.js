import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { format } from 'date-fns';

/**
 * Export workouts as CSV file and open share dialog
 * @param {Array} workouts - Array of workout objects
 * @returns {Promise<boolean>} Whether export was successful
 */
export async function exportWorkoutsCSV(workouts) {
  if (!workouts || workouts.length === 0) {
    throw new Error('No workouts to export.');
  }

  const headers = ['Date', 'Exercise', 'Sets', 'Reps', 'Weight (kg)', 'Duration (min)', 'Calories', 'Body Weight (kg)', 'Notes'];
  const rows = workouts.map((w) => {
    const date = w.date ? format(new Date(w.date), 'yyyy-MM-dd') : '';
    return [
      date,
      `"${(w.exerciseName || '').replace(/"/g, '""')}"`,
      w.sets || '',
      w.reps || '',
      w.weight || '',
      w.duration || '',
      w.calories || '',
      w.bodyWeight || '',
      `"${(w.notes || '').replace(/"/g, '""')}"`,
    ].join(',');
  });

  const csv = [headers.join(','), ...rows].join('\n');
  const fileName = `fittrack_workouts_${format(new Date(), 'yyyy-MM-dd')}.csv`;
  const filePath = `${FileSystem.documentDirectory}${fileName}`;

  await FileSystem.writeAsStringAsync(filePath, csv, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(filePath, {
      mimeType: 'text/csv',
      dialogTitle: 'Export Workout History',
      UTI: 'public.comma-separated-values-text',
    });
    return true;
  }

  throw new Error('Sharing is not available on this device.');
}
