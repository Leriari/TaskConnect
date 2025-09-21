// app/(tabs)/home/components/CategoryListModal.tsx

import React from 'react';
import { Modal, View, Text, TouchableOpacity, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Service } from '../types';
import { useTheme } from '@/app/context/ThemeContext';
import { useThemedStyles, createThemedStyles } from '@/app/hooks/useThemedStyles';

interface CategoryListModalProps {
  visible: boolean;
  onClose: () => void;
  selectedCategory: string;
  services: Service[];
}

const CategoryListModal = ({ visible, onClose, selectedCategory, services }: CategoryListModalProps) => {
  const router = useRouter();
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
        <View style={styles.categoryListModalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {selectedCategory === 'All' ? 'All Services' : selectedCategory + ' Services'}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <FlatList
            data={services}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <View style={styles.serviceListItem}>
                <View style={styles.serviceListItemTop}>
                  <View style={styles.serviceListImageContainer}>
                    <Ionicons name="person" size={30} color={theme.colors.primary} />
                  </View>
                  <View style={styles.serviceListInfo}>
                    <Text style={styles.serviceListName}>{item.name}</Text>
                    <View style={styles.serviceListMeta}>
                      <View style={styles.miniRatingContainer}>
                        <Ionicons name="star" size={14} color="#FFD700" />
                        <Text style={styles.miniRatingText}>{item.rating}</Text>
                      </View>
                      <Text style={styles.serviceListCategory}>{item.category}</Text>
                      <Text style={styles.serviceListPrice}>{item.price}</Text>
                    </View>
                    <View style={styles.serviceListLocation}>
                      <Ionicons name="location-outline" size={12} color={theme.colors.textLight} />
                      <Text style={styles.serviceListLocationText}>{item.location}</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.miniBookBtn}
                    onPress={() => router.push({
                      pathname: "/booking",
                      params: { tasker: JSON.stringify(item) }
                    })}
                  >
                    <Text style={styles.miniBookBtnText}>Book</Text>
                  </TouchableOpacity>
                </View>
              </View>
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
  categoryListModalContent: {
    backgroundColor: theme.colors.card,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    paddingTop: 20,
    paddingBottom: 20,
    maxHeight: '80%',
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
  serviceListItem: {
    backgroundColor: theme.colors.card,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  serviceListItemTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  serviceListImageContainer: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: theme.dark ? 'rgba(92, 189, 106, 0.2)' : '#F0F4FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  serviceListInfo: {
    flex: 1,
  },
  serviceListName: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  serviceListMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  miniRatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  miniRatingText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 3,
    color: theme.colors.text,
  },
  serviceListCategory: {
    fontSize: 12,
    color: theme.colors.primary,
    backgroundColor: theme.dark ? 'rgba(92, 189, 106, 0.15)' : theme.colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 10,
  },
  serviceListPrice: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  serviceListLocation: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  serviceListLocationText: {
    fontSize: 12,
    color: theme.colors.textLight,
    marginLeft: 4,
  },
  miniBookBtn: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 6,
    paddingHorizontal: 15,
    borderRadius: 10,
  },
  miniBookBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
}));

export default CategoryListModal;