// app/(tabs)/home/components/ProfileModal.tsx

import React from 'react';
import { Modal, View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { handleLogout } from '../utils/logout';
import { useTheme } from '@/app/context/ThemeContext';
import { useThemedStyles, createThemedStyles } from '@/app/hooks/useThemedStyles';

interface ProfileModalProps {
  visible: boolean;
  onClose: () => void;
  userName: string;
}

const ProfileModal = ({ visible, onClose, userName }: ProfileModalProps) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <Modal
      transparent={true}
      animationType="fade"
      visible={visible}
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPressOut={onClose}
      >
        <View style={styles.profileModalContent}>
          <Text style={styles.profileModalTitle}>Hello {userName} 👋</Text>
          <TouchableOpacity style={styles.profileOption}>
            <Ionicons name="person-outline" size={20} color={theme.colors.primary} />
            <Text style={styles.profileOptionText}>View Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.profileOption}>
            <Ionicons name="settings-outline" size={20} color={theme.colors.primary} />
            <Text style={styles.profileOptionText}>Settings</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.profileOption}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={20} color={theme.colors.secondary} />
            <Text style={[styles.profileOptionText, { color: theme.colors.secondary }]}>Logout</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const createStyles = createThemedStyles(theme => ({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  profileModalContent: {
    position: 'absolute',
    top: 80,
    right: 20,
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 16,
    width: 200,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: theme.dark ? 0.3 : 0.1,
    shadowRadius: 8,
    elevation: 6,
  },
  profileModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 12,
  },
  profileOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  profileOptionText: {
    marginLeft: 10,
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: '500',
  },
}));

export default ProfileModal;