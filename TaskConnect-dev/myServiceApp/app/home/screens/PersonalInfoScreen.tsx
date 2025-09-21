// app/(tabs)/home/screens/PersonalInfoScreen.tsx

import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { auth } from '@/firebase-config';
import { 
  getUserProfile, 
  updateUserProfile, 
  UserProfile 
} from '@/app/services/userDatabaseService';
import { useTheme } from '@/app/context/ThemeContext';
import { useThemedStyles, createThemedStyles } from '@/app/hooks/useThemedStyles';

const PersonalInfoScreen = () => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [userData, setUserData] = useState<Partial<UserProfile>>({
    firstName: '',
    lastName: '',
    displayName: '',
    email: '',
    phoneNumber: ''
  });
  
  const [editMode, setEditMode] = useState(false);
  
  useEffect(() => {
    loadUserData();
  }, []);
  
  const loadUserData = async () => {
    setIsLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert('Error', 'You must be logged in to view this page.');
        router.back();
        return;
      }
      
      const userProfile = await getUserProfile();
      let firstName = '';
      let lastName = '';
      if (userProfile && userProfile.displayName) {
        const nameParts = userProfile.displayName.split(' ');
        firstName = nameParts[0] || '';
        lastName = nameParts.slice(1).join(' ') || '';
      }
      
      setUserData({
        firstName,
        lastName,
        displayName: userProfile?.displayName || user.displayName || '',
        email: userProfile?.email || user.email || '',
        phoneNumber: userProfile?.phoneNumber || user.phoneNumber || ''
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to load user data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const saveUserData = async () => {
    setIsSaving(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert('Error', 'You must be logged in to update your profile.');
        return;
      }
      
      // Combine first and last name for displayName
      const displayName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
      await updateUserProfile({
        displayName,
        firstName: userData.firstName,
        lastName: userData.lastName,
        phoneNumber: userData.phoneNumber,
      });
      
      Alert.alert('Success', 'Profile updated successfully');
      setEditMode(false);
    } catch (error) {
      console.error('Error updating user data:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleChangeEmail = () => {
    Alert.alert(
      'Change Email',
      'Changing your email requires verification. Would you like to proceed?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Proceed', 
          onPress: () => Alert.alert('Feature', 'Email change functionality will be implemented soon.')
        }
      ]
    );
  };
  
  // Navigate to Change Password screen
  const navigateToChangePassword = () => {
    router.push('/home/screens/ChangePasswordScreen');
  };
  
  // Navigate to Two-Factor Authentication screen
  const navigateToTwoFactorAuth = () => {
    router.push('/home/screens/TwoFactorAuthScreen');
  };
  
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }
  
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => {
              if (editMode) {
                Alert.alert(
                  'Discard Changes',
                  'Are you sure you want to discard your changes?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Discard', onPress: () => {
                      setEditMode(false);
                      loadUserData();
                    }}
                  ]
                );
              } else {
                router.back();
              }
            }}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Personal Information</Text>
          <TouchableOpacity 
            style={styles.editButton}
            onPress={() => {
              if (editMode) {
                saveUserData();
              } else {
                setEditMode(true);
              }
            }}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.editButtonText}>{editMode ? 'Save' : 'Edit'}</Text>
            )}
          </TouchableOpacity>
        </View>
        
        <View style={styles.infoContainer}>
          <Text style={styles.sectionTitle}>Account Information</Text>
          
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>First Name</Text>
            {editMode ? (
              <TextInput
                style={styles.infoInput}
                value={userData.firstName}
                onChangeText={(text) => setUserData({ ...userData, firstName: text })}
                placeholder="Enter your first name"
              />
            ) : (
              <Text style={styles.infoValue}>{userData.firstName}</Text>
            )}
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Last Name</Text>
            {editMode ? (
              <TextInput
                style={styles.infoInput}
                value={userData.lastName}
                onChangeText={(text) => setUserData({ ...userData, lastName: text })}
                placeholder="Enter your last name"
              />
            ) : (
              <Text style={styles.infoValue}>{userData.lastName}</Text>
            )}
          </View>
          
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Email</Text>
            <View style={styles.emailContainer}>
              <Text style={styles.infoValue}>{userData.email}</Text>
              {editMode && (
                <TouchableOpacity onPress={handleChangeEmail}>
                  <Text style={styles.changeEmailText}>Change</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
          
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Phone Number</Text>
            {editMode ? (
              <TextInput
                style={styles.infoInput}
                value={userData.phoneNumber}
                onChangeText={(text) => setUserData({...userData, phoneNumber: text})}
                placeholder="Enter your phone number"
                placeholderTextColor={theme.colors.textLight}
                keyboardType="phone-pad"
              />
            ) : (
              <Text style={styles.infoValue}>{userData.phoneNumber || 'Not set'}</Text>
            )}
          </View>
        </View>
        
        <View style={styles.securitySection}>
          <Text style={styles.sectionTitle}>Security</Text>
          
          <TouchableOpacity 
            style={styles.securityItem}
            onPress={navigateToChangePassword}
          >
            <View style={styles.securityItemLeft}>
              <Ionicons name="lock-closed-outline" size={24} color={theme.colors.textSecondary} style={styles.securityIcon} />
              <Text style={styles.securityText}>Change Password</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textLight} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.securityItem}
            onPress={navigateToTwoFactorAuth}
          >
            <View style={styles.securityItemLeft}>
              <Ionicons name="shield-checkmark-outline" size={24} color={theme.colors.textSecondary} style={styles.securityIcon} />
              <Text style={styles.securityText}>Two-Factor Authentication</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textLight} />
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity 
          style={styles.deleteAccountButton}
          onPress={() => Alert.alert(
            'Delete Account',
            'Are you sure you want to delete your account? This action cannot be undone.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete', style: 'destructive', onPress: () => Alert.alert('Feature', 'Account deletion will be implemented soon.') }
            ]
          )}
        >
          <Text style={styles.deleteAccountText}>Delete Account</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const createStyles = createThemedStyles(theme => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  contentContainer: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingVertical: 30,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  editButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: theme.colors.primary,
    minWidth: 70,
    alignItems: 'center',
  },
  editButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  infoContainer: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: theme.dark ? 0.3 : 0.05,
        shadowRadius: 3.84,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 15,
  },
  infoItem: {
    marginBottom: 16,
  },
  infoLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 5,
  },
  infoValue: {
    fontSize: 16,
    color: theme.colors.text,
  },
  infoInput: {
    fontSize: 16,
    color: theme.colors.text,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingVertical: 8,
  },
  emailContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  changeEmailText: {
    color: theme.colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  securitySection: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: theme.dark ? 0.3 : 0.05,
        shadowRadius: 3.84,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  securityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  securityItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  securityIcon: {
    marginRight: 15,
  },
  securityText: {
    fontSize: 16,
    color: theme.colors.text,
  },
  deleteAccountButton: {
    alignItems: 'center',
    paddingVertical: 15,
    marginTop: 10,
    marginBottom: 30,
  },
  deleteAccountText: {
    color: theme.colors.secondary,
    fontSize: 16,
    fontWeight: '600',
  },
}));

export default PersonalInfoScreen;