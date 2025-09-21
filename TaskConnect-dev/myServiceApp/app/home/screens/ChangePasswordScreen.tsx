// app/(tabs)/home/screens/ChangePasswordScreen.tsx

import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { auth } from '@/firebase-config';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { useTheme } from '@/app/context/ThemeContext';
import { useThemedStyles, createThemedStyles } from '@/app/hooks/useThemedStyles';
import StatusBarSpace from '@/app/components/StatusBarSpace';

const ChangePasswordScreen = () => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createChangePasswordStyles);
  
  // State variables
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentPasswordError, setCurrentPasswordError] = useState('');
  const [newPasswordError, setNewPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Password requirements
  const passwordRequirements = [
    { id: 'length', label: 'At least 8 characters', met: newPassword.length >= 8 },
    { id: 'uppercase', label: 'At least one uppercase letter', met: /[A-Z]/.test(newPassword) },
    { id: 'lowercase', label: 'At least one lowercase letter', met: /[a-z]/.test(newPassword) },
    { id: 'number', label: 'At least one number', met: /[0-9]/.test(newPassword) },
    { id: 'special', label: 'At least one special character', met: /[^A-Za-z0-9]/.test(newPassword) },
  ];
  
  // Go back to security screen
  const handleGoBack = () => {
    router.back();
  };
  
  // Validate inputs
  const validateInputs = () => {
    let isValid = true;
    
    // Validate current password
    if (!currentPassword) {
      setCurrentPasswordError('Current password is required');
      isValid = false;
    } else {
      setCurrentPasswordError('');
    }
    
    // Validate new password
    if (!newPassword) {
      setNewPasswordError('New password is required');
      isValid = false;
    } else if (newPassword.length < 8) {
      setNewPasswordError('Password must be at least 8 characters');
      isValid = false;
    } else if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || 
               !/[0-9]/.test(newPassword) || !/[^A-Za-z0-9]/.test(newPassword)) {
      setNewPasswordError('Password does not meet all requirements');
      isValid = false;
    } else {
      setNewPasswordError('');
    }
    
    // Validate confirm password
    if (!confirmPassword) {
      setConfirmPasswordError('Please confirm your new password');
      isValid = false;
    } else if (confirmPassword !== newPassword) {
      setConfirmPasswordError('Passwords do not match');
      isValid = false;
    } else {
      setConfirmPasswordError('');
    }
    
    return isValid;
  };
  
  // Handle password change
  const handleChangePassword = async () => {
    // Validate all inputs
    if (!validateInputs()) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      const user = auth.currentUser;
      
      if (!user || !user.email) {
        throw new Error('User not logged in or email not available');
      }
      
      // Create credential with current password
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      
      // Reauthenticate user
      await reauthenticateWithCredential(user, credential);
      
      // Update password
      await updatePassword(user, newPassword);
      
      // Show success message
      Alert.alert(
        'Success',
        'Your password has been updated successfully.',
        [{ text: 'OK', onPress: handleGoBack }]
      );
      
    } catch (error: any) {
      console.log('Change password error:', error);
      
      // Handle specific errors
      if (error.code === 'auth/wrong-password') {
        setCurrentPasswordError('Current password is incorrect');
      } else if (error.code === 'auth/too-many-requests') {
        Alert.alert('Error', 'Too many attempts. Please try again later.');
      } else if (error.code === 'auth/requires-recent-login') {
        Alert.alert(
          'Session Expired',
          'For security reasons, please log out and log back in to change your password.'
        );
      } else {
        Alert.alert('Error', 'Failed to change password. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <View style={styles.container}>
      
      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionDescription}>
          Create a strong, unique password to protect your account. 
          Your new password should be different from previously used passwords.
        </Text>
        
        {/* Current Password */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Current Password</Text>
          <View style={[
            styles.inputContainer,
            currentPasswordError ? styles.inputError : null
          ]}>
            <Ionicons 
              name="lock-closed-outline" 
              size={22} 
              color={theme.colors.textSecondary} 
              style={styles.inputIcon} 
            />
            <TextInput
              style={styles.input}
              placeholder="Enter current password"
              placeholderTextColor={theme.colors.textLight}
              secureTextEntry={!showCurrentPassword}
              value={currentPassword}
              onChangeText={(text) => {
                setCurrentPassword(text);
                if (currentPasswordError) setCurrentPasswordError('');
              }}
              autoCapitalize="none"
              editable={!isLoading}
            />
            <TouchableOpacity
              onPress={() => setShowCurrentPassword(!showCurrentPassword)}
              style={styles.visibilityIcon}
            >
              <Ionicons
                name={showCurrentPassword ? 'eye-off-outline' : 'eye-outline'}
                size={22}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>
          </View>
          {currentPasswordError ? (
            <Text style={styles.errorText}>{currentPasswordError}</Text>
          ) : null}
        </View>
        
        {/* New Password */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>New Password</Text>
          <View style={[
            styles.inputContainer,
            newPasswordError ? styles.inputError : null
          ]}>
            <Ionicons 
              name="key-outline" 
              size={22} 
              color={theme.colors.textSecondary} 
              style={styles.inputIcon} 
            />
            <TextInput
              style={styles.input}
              placeholder="Enter new password"
              placeholderTextColor={theme.colors.textLight}
              secureTextEntry={!showNewPassword}
              value={newPassword}
              onChangeText={(text) => {
                setNewPassword(text);
                if (newPasswordError) setNewPasswordError('');
              }}
              autoCapitalize="none"
              editable={!isLoading}
            />
            <TouchableOpacity
              onPress={() => setShowNewPassword(!showNewPassword)}
              style={styles.visibilityIcon}
            >
              <Ionicons
                name={showNewPassword ? 'eye-off-outline' : 'eye-outline'}
                size={22}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>
          </View>
          {newPasswordError ? (
            <Text style={styles.errorText}>{newPasswordError}</Text>
          ) : null}
          
          {/* Password requirements */}
          <View style={styles.requirementsContainer}>
            <Text style={styles.requirementsTitle}>Password must contain:</Text>
            {passwordRequirements.map((req) => (
              <View key={req.id} style={styles.requirementRow}>
                <Ionicons
                  name={req.met ? 'checkmark-circle' : 'ellipse-outline'}
                  size={16}
                  color={req.met ? theme.colors.success : theme.colors.textLight}
                  style={styles.requirementIcon}
                />
                <Text
                  style={[
                    styles.requirementText,
                    req.met ? styles.requirementMet : null
                  ]}
                >
                  {req.label}
                </Text>
              </View>
            ))}
          </View>
        </View>
        
        {/* Confirm Password */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Confirm New Password</Text>
          <View style={[
            styles.inputContainer,
            confirmPasswordError ? styles.inputError : null
          ]}>
            <Ionicons 
              name="checkmark-circle-outline" 
              size={22} 
              color={theme.colors.textSecondary} 
              style={styles.inputIcon} 
            />
            <TextInput
              style={styles.input}
              placeholder="Confirm new password"
              placeholderTextColor={theme.colors.textLight}
              secureTextEntry={!showConfirmPassword}
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                if (confirmPasswordError) setConfirmPasswordError('');
              }}
              autoCapitalize="none"
              editable={!isLoading}
            />
            <TouchableOpacity
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              style={styles.visibilityIcon}
            >
              <Ionicons
                name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                size={22}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>
          </View>
          {confirmPasswordError ? (
            <Text style={styles.errorText}>{confirmPasswordError}</Text>
          ) : null}
        </View>
        
        {/* Security Tip */}
        <View style={styles.securityTipContainer}>
          <Ionicons 
            name="information-circle-outline" 
            size={22} 
            color={theme.colors.primary} 
            style={styles.tipIcon} 
          />
          <Text style={styles.tipText}>
            Once you change your password, you'll need to sign in again on all your devices.
          </Text>
        </View>
      </ScrollView>
      
      {/* Footer with button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.updateButton}
          onPress={handleChangePassword}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.updateButtonText}>Update Password</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const createChangePasswordStyles = createThemedStyles(theme => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  headerPlaceholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  sectionDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 24,
    lineHeight: 20,
  },
  inputSection: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    paddingHorizontal: 12,
  },
  inputError: {
    borderColor: theme.colors.error || '#FF6B6B',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 50,
    color: theme.colors.text,
    fontSize: 16,
  },
  visibilityIcon: {
    padding: 8,
  },
  errorText: {
    color: theme.colors.error || '#FF6B6B',
    fontSize: 12,
    marginTop: 6,
  },
  requirementsContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: theme.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
    borderRadius: 8,
  },
  requirementsTitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  requirementIcon: {
    marginRight: 8,
  },
  requirementText: {
    fontSize: 12,
    color: theme.colors.textLight,
  },
  requirementMet: {
    color: theme.colors.success || '#4CAF50',
  },
  securityTipContainer: {
    flexDirection: 'row',
    backgroundColor: `${theme.colors.primary}10`,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    alignItems: 'flex-start',
  },
  tipIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
  },
  updateButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  updateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
}));

export default ChangePasswordScreen;