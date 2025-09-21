// app/(tabs)/home/components/LocationModal.tsx

import React from 'react';
import { Modal, View, Text, TouchableOpacity, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { City } from '../types';
import { useTheme } from '@/app/context/ThemeContext';
import { useThemedStyles, createThemedStyles } from '@/app/hooks/useThemedStyles';

interface LocationModalProps {
  visible: boolean;
  onClose: () => void;
  currentLocation: City;
  cities: City[];
  onLocationChange: (location: City) => void;
}

const LocationModal = ({ visible, onClose, currentLocation, cities, onLocationChange }: LocationModalProps) => {
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
        <View style={styles.locationModalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Choose Your Location</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <FlatList
            data={cities}
            style={styles.cityList}
            keyExtractor={(item) => item.name}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.cityItem,
                  currentLocation.name === item.name && styles.selectedCityItem
                ]}
                onPress={() => onLocationChange(item)}
              >
                <View style={styles.cityItemLeft}>
                  <Ionicons name="location" size={20} color={theme.colors.primary} />
                  <Text style={styles.cityName}>{item.name}</Text>
                  <Text style={styles.countryName}>{item.country}</Text>
                </View>
                {currentLocation.name === item.name && (
                  <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
                )}
              </TouchableOpacity>
            )}
          />
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
  locationModalContent: {
    backgroundColor: theme.colors.card,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    paddingTop: 20,
    paddingBottom: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
  },
  cityList: {
    maxHeight: 300,
  },
  cityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.dark ? 'rgba(255, 255, 255, 0.1)' : '#F0F0F0',
  },
  selectedCityItem: {
    backgroundColor: theme.dark ? 'rgba(92, 189, 106, 0.15)' : theme.colors.primaryLight,
  },
  cityItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cityName: {
    fontSize: 16,
    color: theme.colors.text,
    marginLeft: 10,
  },
  countryName: {
    fontSize: 12,
    color: theme.colors.textLight,
    marginLeft: 10,
  },
}));

export default LocationModal;