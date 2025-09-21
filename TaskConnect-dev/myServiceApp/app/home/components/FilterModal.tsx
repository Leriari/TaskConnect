// app/(tabs)/home/components/FilterModal.tsx

import React from 'react';
import { Modal, View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FilterOptions } from '../types';
import { useTheme } from '@/app/context/ThemeContext';
import { useThemedStyles, createThemedStyles } from '@/app/hooks/useThemedStyles';

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  filterOptions: FilterOptions;
  setFilterOptions: (options: FilterOptions) => void;
  onApply: () => void;
}

const FilterModal = ({ visible, onClose, filterOptions, setFilterOptions, onApply }: FilterModalProps) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.filterModalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter Services</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Minimum Rating</Text>
            <View style={styles.sliderContainer}>
              <Text style={styles.sliderValue}>{filterOptions.minRating.toFixed(1)}</Text>
              <View style={styles.sliderTrack}>
                {[3.0, 3.5, 4.0, 4.5, 5.0].map((value) => (
                  <TouchableOpacity
                    key={value}
                    style={[
                      styles.sliderMarker,
                      filterOptions.minRating >= value && styles.sliderMarkerActive
                    ]}
                    onPress={() => setFilterOptions({ ...filterOptions, minRating: value })}
                  />
                ))}
              </View>
              <View style={styles.sliderLabels}>
                <Text style={styles.sliderLabelText}>3.0</Text>
                <Text style={styles.sliderLabelText}>5.0</Text>
              </View>
            </View>
          </View>

          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Maximum Price (Ksh)</Text>
            <View style={styles.sliderContainer}>
              <Text style={styles.sliderValue}>Ksh{filterOptions.maxPrice}</Text>
              <View style={styles.sliderTrack}>
                {[500, 2000, 3500, 5000, 7000].map((value) => (
                  <TouchableOpacity
                    key={value}
                    style={[
                      styles.sliderMarker,
                      filterOptions.maxPrice >= value && styles.sliderMarkerActive
                    ]}
                    onPress={() => setFilterOptions({ ...filterOptions, maxPrice: value })}
                  />
                ))}
              </View>
              <View style={styles.sliderLabels}>
                <Text style={styles.sliderLabelText}>Ksh 500</Text>
                <Text style={styles.sliderLabelText}>Ksh 7000</Text>
              </View>
            </View>
          </View>

          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Maximum Distance (km)</Text>
            <View style={styles.sliderContainer}>
              <Text style={styles.sliderValue}>{filterOptions.maxDistance} km</Text>
              <View style={styles.sliderTrack}>
                {[2, 4, 6, 8, 10].map((value) => (
                  <TouchableOpacity
                    key={value}
                    style={[
                      styles.sliderMarker,
                      filterOptions.maxDistance >= value && styles.sliderMarkerActive
                    ]}
                    onPress={() => setFilterOptions({ ...filterOptions, maxDistance: value })}
                  />
                ))}
              </View>
              <View style={styles.sliderLabels}>
                <Text style={styles.sliderLabelText}>2 km</Text>
                <Text style={styles.sliderLabelText}>10 km</Text>
              </View>
            </View>
          </View>

          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Sort By</Text>
            <View style={styles.sortOptions}>
              {['rating', 'price', 'distance'].map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.sortOption,
                    filterOptions.sortBy === option && styles.sortOptionActive
                  ]}
                  onPress={() => setFilterOptions({ ...filterOptions, sortBy: option as 'rating' | 'price' | 'distance' })}
                >
                  <Text
                    style={[
                      styles.sortOptionText,
                      filterOptions.sortBy === option && styles.sortOptionTextActive
                    ]}
                  >
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.filterActions}>
            <TouchableOpacity
              style={styles.resetButton}
              onPress={() => setFilterOptions({
                minRating: 4.0,
                maxPrice: 7000,
                maxDistance: 10,
                sortBy: 'rating'
              })}
            >
              <Text style={styles.resetButtonText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.applyButton}
              onPress={onApply}
            >
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const createStyles = createThemedStyles(theme => ({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  filterModalContent: {
    backgroundColor: theme.colors.card,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
  },
  filterSection: {
    marginBottom: 20,
  },
  filterLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 10,
  },
  sliderContainer: {
    marginHorizontal: 10,
  },
  sliderValue: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.primary,
    textAlign: 'center',
    marginBottom: 10,
  },
  sliderTrack: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 4,
    backgroundColor: theme.dark ? '#444' : '#E0E0E0',
    borderRadius: 2,
    marginBottom: 10,
  },
  sliderMarker: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: theme.colors.card,
    borderWidth: 2,
    borderColor: theme.dark ? '#444' : '#E0E0E0',
    marginLeft: -8,
  },
  sliderMarkerActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sliderLabelText: {
    fontSize: 12,
    color: theme.colors.textLight,
  },
  sortOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sortOption: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  sortOptionActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  sortOptionText: {
    color: theme.colors.text,
    fontWeight: '500',
  },
  sortOptionTextActive: {
    color: '#fff',
  },
  filterActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  resetButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    marginRight: 10,
  },
  resetButtonText: {
    color: theme.colors.text,
    fontWeight: '600',
  },
  applyButton: {
    flex: 2,
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
  },
  applyButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
}));

export default FilterModal;