// app/(tabs)/home/components/CategoryScroll.tsx

import React, { useState, useEffect } from 'react';
import { ScrollView, TouchableOpacity, View, Text, ActivityIndicator, StyleSheet as RNStyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/firebase-config';
import { useTheme } from '@/app/context/ThemeContext';
import { useThemedStyles, createThemedStyles } from '@/app/hooks/useThemedStyles';

// Define Category type locally
type Category = {
  name: string;
  icon: string;
};

interface CategoryScrollProps {
  selectedCategory: string;
  onCategorySelect: (category: string) => void;
}

const CategoryScroll: React.FC<CategoryScrollProps> = ({ selectedCategory, onCategorySelect }) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(collection(db, 'serviceCategories'));
        const cats = snap.docs.map(d => ({
          name: d.id,
          icon: d.data().icon as string,
        }));
        setCategories(cats);
      } catch (e) {
        console.error(e);
        setError('Unable to load categories.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <View style={localStyles.loadingContainer}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }
  if (error) {
    return (
      <View style={localStyles.loadingContainer}>
        <Text style={{ color: theme.colors.error }}>{error}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.horizontalScroll}
      contentContainerStyle={styles.categoryContainer}
    >
      {categories.map((cat, idx) => (
        <TouchableOpacity
          key={cat.name + '-' + idx}
          onPress={() => onCategorySelect(cat.name)}
          style={[
            styles.categoryItem,
            selectedCategory === cat.name && styles.selectedCategoryItem,
          ]}
        >
          <View
            style={[
              styles.categoryIconContainer,
              selectedCategory === cat.name && styles.selectedCategoryIconContainer,
            ]}
          >
            <Ionicons
              name={cat.icon as any}
              size={22}
              color={selectedCategory === cat.name ? '#fff' : '#666'}
            />
          </View>
          <Text
            style={[
              styles.categoryText,
              selectedCategory === cat.name && styles.selectedCategoryText,
            ]}
          >
            {cat.name}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

const createStyles = createThemedStyles(theme => ({
  horizontalScroll: {
    marginBottom: 20,
  },
  categoryContainer: {
    paddingHorizontal: 10,
  },
  categoryItem: {
    alignItems: 'center',
    marginRight: 16,
    width: 70,
  },
  selectedCategoryItem: {
    transform: [{ scale: 1.1 }],
  },
  categoryIconContainer: {
    height: 56,
    width: 56,
    borderRadius: 16,
    backgroundColor: theme.dark ? 'rgba(60,60,60,0.5)' : '#EEE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  selectedCategoryIconContainer: {
    backgroundColor: theme.colors.primary,
  },
  categoryText: {
    fontSize: 12,
    color: theme.colors.textLight,
    textAlign: 'center',
  },
  selectedCategoryText: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
}));

const localStyles = RNStyleSheet.create({
  loadingContainer: {
    minHeight: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default CategoryScroll;
