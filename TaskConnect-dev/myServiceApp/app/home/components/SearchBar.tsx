// app/(tabs)/home/components/SearchBar.tsx

import React from 'react';
import { View, TextInput, TouchableOpacity, Text, ScrollView, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/app/context/ThemeContext';
import { useThemedStyles, createThemedStyles } from '@/app/hooks/useThemedStyles';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onFilterPress: () => void;
  results?: Array<{ id: string; title: string; subtitle?: string; onPress: () => void; profileImage?: string | null }>;
  onDismiss?: () => void;
  loading?: boolean;
}

const SearchBar = ({ value, onChangeText, onFilterPress, results = [], onDismiss, loading = false }: SearchBarProps) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);

  // Helper to handle both base64 and URL images (copied from ServiceCard)
  const getImageSource = (img: string | null | undefined) => {
    if (!img) return undefined;
    if (img.startsWith('data:image')) {
      return { uri: img };
    }
    // Heuristic: if it's a long string and not a URL, treat as base64
    if (!img.startsWith('http') && img.length > 100) {
      return { uri: `data:image/jpeg;base64,${img}` };
    }
    return { uri: img };
  };

  return (
    <>
      {results.length > 0 && (
        <TouchableOpacity
          style={styles.dropdownOverlay}
          activeOpacity={1}
          onPress={onDismiss}
        />
      )}
      <View style={styles.searchBarContainer}>
        <Ionicons name="search" size={22} color={theme.colors.textLight} style={styles.searchIcon} />
        <TextInput
          style={styles.searchBar}
          placeholder="What do you need done?"
          placeholderTextColor={theme.colors.textLight}
          value={value}
          onChangeText={onChangeText}
        />
        {loading ? (
          <ActivityIndicator size="small" color={theme.colors.primary} style={styles.loadingIndicator} />
        ) : (
          <TouchableOpacity
            style={styles.filterButton}
            onPress={onFilterPress}
          >
            <Ionicons name="options-outline" size={22} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
      {results.length > 0 && (
        <View style={styles.dropdownContainer}>
          <ScrollView style={{ maxHeight: 300 }}>
            {results.map(result => (
              <TouchableOpacity
                key={result.id}
                style={styles.dropdownItem}
                onPress={result.onPress}
              >
                <View style={styles.dropdownItemContent}>
                  {result.profileImage ? (
                    <Image
                      source={getImageSource(result.profileImage)}
                      style={styles.dropdownProfileImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <Ionicons name="person" size={36} color={theme.colors.primary} style={styles.dropdownProfileImage} />
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.dropdownTitle}>{result.title}</Text>
                    {result.subtitle && <Text style={styles.dropdownSubtitle}>{result.subtitle}</Text>}
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </>
  );
};

const createStyles = createThemedStyles(theme => ({
  searchBarContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.card,
    borderRadius: 15,
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 20,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: theme.dark ? 0.3 : 0.05,
    shadowRadius: 5,
    elevation: 3,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchBar: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text,
  },
  filterButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    padding: 8,
  },
  dropdownOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 99,
  },
  dropdownContainer: {
    position: 'absolute',
    left: 20,
    right: 20,
    top: 200,
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: theme.dark ? 0.3 : 0.08,
    shadowRadius: 6,
    elevation: 4,
    zIndex: 100,
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight || '#eee',
  },
  dropdownItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dropdownProfileImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
    backgroundColor: '#eee',
  },
  dropdownTitle: {
    fontSize: 15,
    color: theme.colors.text,
    fontWeight: '600',
  },
  dropdownSubtitle: {
    fontSize: 13,
    color: theme.colors.textLight,
    marginTop: 2,
  },
  loadingIndicator: {
    marginLeft: 10,
  },
}));

export default SearchBar;