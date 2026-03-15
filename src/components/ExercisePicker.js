import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Modal,
  StyleSheet,
  SafeAreaView,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useTheme from '../hooks/useTheme';
import { COLORS, EXERCISE_CATEGORIES, ALL_EXERCISES } from '../utils/constants';
import { sanitizeText } from '../utils/sanitize';

/**
 * Modal component with searchable list of common exercises
 *
 * Props:
 * - visible: bool
 * - onSelect: Function(exerciseName: string) — called when exercise is picked
 * - onClose: Function
 * - selectedExercise: string — currently selected (highlights it)
 */
const ExercisePicker = ({ visible, onSelect, onClose, selectedExercise }) => {
  const { isDark, colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = [
    { key: 'all', label: 'All', color: COLORS.primary },
    ...Object.entries(EXERCISE_CATEGORIES).map(([key, cat]) => ({
      key,
      label: cat.label.split(' ')[0], // Short label
      color: cat.color,
    })),
  ];

  // Filter exercises by category and search query
  const filteredExercises = useMemo(() => {
    let exercises = ALL_EXERCISES;

    if (selectedCategory !== 'all') {
      const cat = EXERCISE_CATEGORIES[selectedCategory];
      exercises = cat
        ? cat.exercises.map((name) => ({ name, category: cat.label, color: cat.color }))
        : [];
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      exercises = exercises.filter((ex) => ex.name.toLowerCase().includes(q));
    }

    return exercises;
  }, [searchQuery, selectedCategory]);

  const handleSelect = useCallback(
    (exerciseName) => {
      onSelect(exerciseName);
      setSearchQuery('');
      setSelectedCategory('all');
      onClose();
    },
    [onSelect, onClose]
  );

  const handleClose = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    onClose();
  };

  const renderExerciseItem = ({ item }) => {
    const isSelected = item.name === selectedExercise;
    return (
      <TouchableOpacity
        onPress={() => handleSelect(item.name)}
        style={[
          styles.exerciseItem,
          {
            backgroundColor: isSelected
              ? `${item.color}20`
              : isDark
              ? COLORS.dark.card
              : COLORS.light.card,
            borderColor: isSelected
              ? item.color
              : isDark
              ? COLORS.dark.border
              : COLORS.light.border,
          },
        ]}
        activeOpacity={0.7}
      >
        <View style={[styles.exerciseDot, { backgroundColor: item.color }]} />
        <View style={styles.exerciseInfo}>
          <Text
            style={[
              styles.exerciseItemName,
              { color: isSelected ? item.color : colors.text },
            ]}
          >
            {item.name}
          </Text>
          <Text style={[styles.exerciseCategoryLabel, { color: colors.textMuted }]}>
            {item.category}
          </Text>
        </View>
        {isSelected && (
          <Ionicons name="checkmark-circle" size={20} color={item.color} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView
        style={[
          styles.container,
          { backgroundColor: isDark ? COLORS.dark.background : COLORS.light.background },
        ]}
      >
        {/* Header */}
        <View
          style={[
            styles.header,
            {
              borderBottomColor: isDark ? COLORS.dark.border : COLORS.light.border,
            },
          ]}
        >
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Choose Exercise
          </Text>
          <TouchableOpacity onPress={handleClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons
              name="close-circle"
              size={28}
              color={colors.textMuted}
            />
          </TouchableOpacity>
        </View>

        {/* Search bar */}
        <View
          style={[
            styles.searchContainer,
            {
              backgroundColor: isDark ? COLORS.dark.inputBg : COLORS.light.inputBg,
              borderColor: isDark ? COLORS.dark.border : COLORS.light.border,
            },
          ]}
        >
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search exercises..."
            placeholderTextColor={colors.textMuted}
            style={[styles.searchInput, { color: colors.text }]}
            autoCorrect={false}
            clearButtonMode="while-editing"
            maxLength={100}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle-outline" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Category filter tabs */}
        <View style={styles.categoryScrollOuter}>
          <FlatList
            data={categories}
            keyExtractor={(item) => item.key}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryList}
            renderItem={({ item }) => {
              const isActive = selectedCategory === item.key;
              return (
                <TouchableOpacity
                  onPress={() => setSelectedCategory(item.key)}
                  style={[
                    styles.categoryTab,
                    {
                      backgroundColor: isActive ? item.color : `${item.color}15`,
                      borderColor: isActive ? item.color : 'transparent',
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.categoryTabText,
                      { color: isActive ? '#FFF' : item.color },
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>

        {/* Results count */}
        <Text style={[styles.resultsCount, { color: colors.textMuted }]}>
          {filteredExercises.length} exercise{filteredExercises.length !== 1 ? 's' : ''}
        </Text>

        {/* Exercises list */}
        <FlatList
          data={filteredExercises}
          keyExtractor={(item, index) => `${item.name}-${index}`}
          renderItem={renderExerciseItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={48} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                No exercises found
              </Text>
              <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
                Try a different search term
              </Text>
            </View>
          }
          keyboardShouldPersistTaps="handled"
        />

        {/* Custom exercise option */}
        {searchQuery.trim().length > 0 && (
          <Pressable
            onPress={() => handleSelect(sanitizeText(searchQuery, { maxLength: 100 }))}
            style={[
              styles.customExerciseBtn,
              {
                backgroundColor: `${COLORS.primary}15`,
                borderColor: COLORS.primary,
                marginHorizontal: 16,
                marginBottom: 16,
              },
            ]}
          >
            <Ionicons name="add-circle-outline" size={20} color={COLORS.primary} />
            <Text style={[styles.customExerciseBtnText, { color: COLORS.primary }]}>
              Use "{searchQuery.trim()}" as custom exercise
            </Text>
          </Pressable>
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  categoryScrollOuter: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  categoryList: {
    gap: 8,
    paddingRight: 8,
  },
  categoryTab: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 6,
    borderWidth: 1.5,
  },
  categoryTabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  resultsCount: {
    fontSize: 12,
    fontWeight: '500',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 8,
    borderWidth: 1.5,
    gap: 12,
  },
  exerciseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseItemName: {
    fontSize: 15,
    fontWeight: '600',
  },
  exerciseCategoryLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 8,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 13,
  },
  customExerciseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 8,
    borderWidth: 1.5,
    gap: 8,
  },
  customExerciseBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ExercisePicker;
