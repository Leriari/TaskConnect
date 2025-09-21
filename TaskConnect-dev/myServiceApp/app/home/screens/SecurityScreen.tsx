// app/(tabs)/home/screens/SecurityScreen.tsx

import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  Switch,
  Alert,
  ActivityIndicator,
  Platform,
  Modal,
  TextInput,
  AppState
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { auth } from '@/firebase-config';
import { EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@/app/context/ThemeContext';
import { useThemedStyles, createThemedStyles } from '@/app/hooks/useThemedStyles';
import StatusBarSpace from '@/app/components/StatusBarSpace';
import BiometricHelper from '../utils/BiometricHelper';
import AppLockHelper from '../utils/AppLockHelper';

const SecurityScreen = () => {
  const { theme, isDarkMode } = useTheme();
  const styles = useThemedStyles(createSecurityStyles);
  
  // State variables
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);
  const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);
  const [isAppLockEnabled, setIsAppLockEnabled] = useState(false);
  const [biometricType, setBiometricType] = useState('Biometric');
  const [isLoading, setIsLoading] = useState(true);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showLockDelayDialog, setShowLockDelayDialog] = useState(false);
  const [verificationPassword, setVerificationPassword] = useState('');
  const [verificationEmail, setVerificationEmail] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [lockDelay, setLockDelay] = useState('immediately');
  
  // Add focus effect and event listeners
  useEffect(() => {
    checkSecurityStatus();
    
    // Use AppState for screen focus
    const appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        // When app comes to foreground, refresh security status
        checkSecurityStatus();
      }
    });
    
    // Clean up listeners on component unmount
    return () => {
      appStateSubscription.remove();
    };
  }, []);

  // Check if biometric authentication is available and its current status
  const checkSecurityStatus = async () => {
    try {
      console.log('SecurityScreen: Checking security status...');
      
      // Check if device supports biometric authentication
      const isAvailable = await BiometricHelper.isBiometricAvailable();
      setIsBiometricAvailable(isAvailable);
      
      if (isAvailable) {
        // Get the biometric type (Face ID, Touch ID, or Fingerprint)
        const biometricName = BiometricHelper.getBiometricName();
        setBiometricType(biometricName);
        
        // Check if user has enabled biometric authentication
        const isEnabled = await BiometricHelper.isBiometricEnabled();
        console.log('SecurityScreen: Biometric enabled:', isEnabled);
        setIsBiometricEnabled(isEnabled);
        
        // Check if app lock is enabled - first try direct async storage access
        const appLockValue = await AsyncStorage.getItem('app_lock_enabled');
        console.log('SecurityScreen: Direct AsyncStorage app_lock_enabled value:', appLockValue);
        
        // Also check using the helper
        const appLockEnabled = await AppLockHelper.isAppLockEnabled();
        console.log('SecurityScreen: App lock enabled via helper:', appLockEnabled);
        
        // Use direct value if available, otherwise use helper value
        const isAppLockActive = appLockValue === 'true' || appLockEnabled;
        console.log('SecurityScreen: Final app lock enabled state:', isAppLockActive);
        
        setIsAppLockEnabled(isAppLockActive);
        
        // Get lock delay preference
        const delayPref = await AsyncStorage.getItem('app_lock_delay') || 'immediately';
        console.log('SecurityScreen: Lock delay preference:', delayPref);
        setLockDelay(delayPref);
      }
    } catch (error) {
      console.log('Error checking security status:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Show lock delay options dialog
  const showLockDelayOptions = () => {
    setShowLockDelayDialog(true);
  };
  
  // Handle lock delay selection
  const handleLockDelaySelection = async (delay: string) => {
    try {
      // Save the delay preference
      await AsyncStorage.setItem('app_lock_delay', delay);
      console.log('SecurityScreen: Lock delay set to:', delay);
      
      // Also save using helper if the method exists
      if (typeof AppLockHelper.setLockDelay === 'function') {
        const success = await AppLockHelper.setLockDelay(delay as any);
        console.log('SecurityScreen: AppLockHelper.setLockDelay() result:', success);
      }
      
      setLockDelay(delay);
      setShowLockDelayDialog(false);
      
      // Show confirmation
      const delayText = delay === 'immediately' 
        ? 'immediately when closed' 
        : `after ${delay.replace('_', ' ')} when in background`;
      
      Alert.alert('Lock Delay Updated', `App will now lock ${delayText}.`);
    } catch (error) {
      console.error('Error setting lock delay:', error);
      Alert.alert('Error', 'Failed to update lock delay. Please try again.');
    }
  };
  
  // Helper method to disable biometric authentication
  const disableBiometric = async () => {
    try {
      const success = await BiometricHelper.disableBiometric();
      if (success) {
        setIsBiometricEnabled(false);
        Alert.alert(
          'Biometric Login Disabled', 
          'Biometric authentication has been disabled.'
        );
      } else {
        Alert.alert(
          'Error', 
          'Failed to disable biometric authentication. Please try again.'
        );
      }
    } catch (error) {
      console.log('Error disabling biometric auth:', error);
      Alert.alert('Error', 'Failed to disable biometric authentication');
    }
  };
  
  // Function to toggle biometric authentication
  async function toggleBiometric(value: boolean) {
    if (!isBiometricAvailable) {
      Alert.alert(
        'Not Available',
        `${biometricType} is not available on this device or not configured.`
      );
      return;
    }

    if (value) {
      // Enable biometric authentication
      const user = auth.currentUser;
      if (!user || !user.email) {
        Alert.alert('Error', 'User information not available');
        return;
      }

      // For existing users, prompt for their password to verify identity
      promptForPasswordVerification(user.email);
    } else {
      // If app lock is enabled, disable it first
      if (isAppLockEnabled) {
        Alert.alert(
          'App Lock Enabled',
          'You need to disable App Lock before disabling biometric authentication.',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Disable App Lock', 
              onPress: async () => {
                // Verify with biometric before disabling
                const authenticated = await BiometricHelper.authenticate(
                  'Authenticate to disable App Lock'
                );
                
                if (authenticated) {
                  await AppLockHelper.disableAppLock();
                  setIsAppLockEnabled(false);
                  
                  // Now proceed with disabling biometric
                  disableBiometric();
                }
              }
            }
          ]
        );
        return;
      }
      
      // If app lock is not enabled, directly disable biometric
      disableBiometric();
    }
  }
  
  // Function to toggle app lock
  async function toggleAppLock(value: boolean) {
    if (!isBiometricEnabled) {
      Alert.alert(
        'Biometric Required',
        'You need to enable biometric authentication before using App Lock.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Enable Biometric', 
            onPress: () => toggleBiometric(true)
          }
        ]
      );
      return;
    }
    
    if (value) {
      try {
        // Try to directly save to AsyncStorage first
        await AsyncStorage.setItem('app_lock_enabled', 'true');
        console.log('SecurityScreen: Direct save - app_lock_enabled set to true');
        
        // Also use helper
        const success = await AppLockHelper.enableAppLock();
        console.log('SecurityScreen: AppLockHelper.enableAppLock() result:', success);
        
        // Verify the save
        const savedValue = await AsyncStorage.getItem('app_lock_enabled');
        console.log('SecurityScreen: Verification - app_lock_enabled value:', savedValue);
        
        if (savedValue === 'true' || success) {
          setIsAppLockEnabled(true);
          Alert.alert(
            'App Lock Enabled', 
            `Your app will now require ${biometricType} authentication when opened.`
          );
          
          // Show lock delay options dialog
          showLockDelayOptions();
        } else {
          Alert.alert('Error', 'Failed to enable App Lock. Please try again.');
        }
      } catch (error) {
        console.error('Error enabling app lock:', error);
        Alert.alert('Error', 'Failed to enable App Lock. Please try again.');
      }
    } else {
      // Verify with biometric before disabling
      const authenticated = await BiometricHelper.authenticate(
        'Authenticate to disable App Lock'
      );
      
      if (authenticated) {
        try {
          // Directly remove from AsyncStorage
          await AsyncStorage.setItem('app_lock_enabled', 'false');
          console.log('SecurityScreen: Direct save - app_lock_enabled set to false');
          
          // Also use helper
          const success = await AppLockHelper.disableAppLock();
          console.log('SecurityScreen: AppLockHelper.disableAppLock() result:', success);
          
          setIsAppLockEnabled(false);
          Alert.alert('App Lock Disabled', 'App Lock has been turned off.');
        } catch (error) {
          console.error('Error disabling app lock:', error);
          Alert.alert('Error', 'Failed to disable App Lock. Please try again.');
        }
      }
    }
  }
  
  // Prompt for password verification before enabling biometrics
  const promptForPasswordVerification = (email: string) => {
    setVerificationEmail(email);
    setVerificationPassword('');
    setPasswordError('');
    setShowPasswordDialog(true);
  };
  
  // Handle password verification and store credentials for biometric login
  const handlePasswordVerification = async () => {
    if (!verificationPassword) {
      setPasswordError('Password is required');
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Create credential with the user's email and password
      const credential = EmailAuthProvider.credential(verificationEmail, verificationPassword);
      
      // Reauthenticate the user with Firebase
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not logged in');
      }
      
      // This verifies that the password is correct
      await reauthenticateWithCredential(user, credential);
      
      // Close the dialog
      setShowPasswordDialog(false);
      
      // If reauthentication is successful, store the ACTUAL password for biometric login
      // This way, we can use it later to authenticate with Firebase
      const success = await BiometricHelper.storeCredentials(
        verificationEmail, 
        verificationPassword  // Store the actual password
      );
      
      if (success) {
        setIsBiometricEnabled(true);
        Alert.alert(
          'Biometric Login Enabled', 
          `You can now use ${biometricType} to log in next time.`
        );
      } else {
        throw new Error('Failed to enable biometric authentication');
      }
    } catch (error) {
      console.log('Verification error:', error);
      if ((error as { code?: string }).code === 'auth/wrong-password') {
        setPasswordError('Incorrect password. Please try again.');
      } else {
        setPasswordError('Failed to verify identity. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleAction = (action: string) => {
    switch (action) {
      case 'changePassword':
        router.push('/home/screens/ChangePasswordScreen');
        break;
      case 'enableTwoFactor':
        router.push('/home/screens/TwoFactorAuthScreen');
        break;
      case 'appLock':
        if (isAppLockEnabled) {
          // If already enabled, show lock delay options
          showLockDelayOptions();
        } else {
          // Otherwise toggle it on
          toggleAppLock(true);
        }
        break;
      case 'privacySettings':
        // For testing - navigate to AsyncStorageTest screen
        router.push('/home/screens/AsyncStorageTest');
        break;
      case 'loginHistory':
        router.push('/home/screens/LoginHistoryScreen');
        break;
      default:
        break;
    }
  };
  
  // Security settings options
  const securityOptions = [
    { 
      icon: 'key-outline' as const, 
      title: 'Change Password', 
      description: 'Update your account password',
      action: 'changePassword' 
    },
    { 
      icon: 'finger-print-outline' as const, 
      title: `${biometricType} Authentication`, 
      description: `Use ${biometricType.toLowerCase()} to log in securely`,
      toggle: true,
      state: isBiometricEnabled,
      action: toggleBiometric,
      disabled: !isBiometricAvailable
    },
    { 
      icon: 'shield-outline' as const, // Changed from shield-checkmark-outline to a valid icon
      title: 'Two-Factor Authentication', 
      description: 'Add an extra layer of security',
      action: 'enableTwoFactor' 
    },
    { 
      icon: 'lock-closed-outline' as const, 
      title: 'App Lock', 
      description: 'Require authentication when opening the app',
      subtitle: isAppLockEnabled ? `Lock delay: ${lockDelay.replace('_', ' ')}` : undefined,
      toggle: true,
      state: isAppLockEnabled,
      action: toggleAppLock,
      disabled: !isBiometricEnabled
    },
    { 
      icon: 'eye-off-outline' as const, 
      title: 'Privacy Settings', 
      description: 'Manage your data and privacy options',
      action: 'privacySettings' 
    },
    { 
      icon: 'list-outline' as const, 
      title: 'Login History', 
      description: 'View your recent login activities',
      action: 'loginHistory' 
    },
  ];
  
  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionDescription}>
          Manage your account security settings and protect your personal information
        </Text>
        
        {securityOptions.map((option, index) => (
          <TouchableOpacity 
            key={index}
            style={[
              styles.securityOption,
              option.disabled ? styles.disabledOption : null
            ]}
            onPress={() => typeof option.action === 'string' ? handleAction(option.action) : null}
            disabled={option.toggle || option.disabled}
          >
            <View style={styles.optionIconContainer}>
              <Ionicons 
                name={option.icon} 
                size={24} 
                color={theme.colors.primary} 
              />
            </View>
            
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>{option.title}</Text>
              <Text style={styles.optionDescription}>{option.description}</Text>
              {option.subtitle && (
                <Text style={styles.optionSubtitle}>{option.subtitle}</Text>
              )}
            </View>
            
            {option.toggle ? (
              <Switch
                value={option.state}
                onValueChange={(value) => {
                  if (typeof option.action === 'function') {
                    option.action(value);
                  }
                }}
                disabled={option.disabled}
                thumbColor={option.state ? theme.colors.primary : '#f4f3f4'}
                trackColor={{ 
                  false: '#767577', 
                  true: `${theme.colors.primary}80`
                }}
                ios_backgroundColor="#3e3e3e"
              />
            ) : (
              <Ionicons 
                name="chevron-forward" 
                size={20} 
                color={theme.colors.textLight} 
              />
            )}
          </TouchableOpacity>
        ))}
        
        <View style={styles.securityTipsContainer}>
          <Text style={styles.securityTipsTitle}>Security Tips</Text>
          <View style={styles.securityTip}>
            <Ionicons name="alert-circle-outline" size={20} color={theme.colors.warning} style={styles.tipIcon} />
            <Text style={styles.tipText}>Use a strong, unique password that includes numbers, symbols, and both uppercase and lowercase letters.</Text>
          </View>
          <View style={styles.securityTip}>
            <Ionicons name="alert-circle-outline" size={20} color={theme.colors.warning} style={styles.tipIcon} />
            <Text style={styles.tipText}>Enable two-factor authentication for an additional layer of security.</Text>
          </View>
          <View style={styles.securityTip}>
            <Ionicons name="alert-circle-outline" size={20} color={theme.colors.warning} style={styles.tipIcon} />
            <Text style={styles.tipText}>Regularly check your login history for any suspicious activity.</Text>
          </View>
        </View>
      </ScrollView>

      {/* Password Verification Modal */}
      <Modal
        visible={showPasswordDialog}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPasswordDialog(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Verify Your Identity</Text>
              <Text style={styles.modalSubtitle}>
                Please enter your password to enable {biometricType} authentication
              </Text>
            </View>
            
            <View style={styles.modalBody}>
              <View style={[
                styles.inputContainer,
                passwordError ? styles.inputError : null
              ]}>
                <Ionicons 
                  name="lock-closed-outline" 
                  size={22} 
                  color={theme.colors.textSecondary} 
                  style={styles.inputIcon} 
                />
                <TextInput
                  style={styles.input}
                  placeholder="Your password"
                  placeholderTextColor={theme.colors.textLight}
                  secureTextEntry={true}
                  value={verificationPassword}
                  onChangeText={(text) => {
                    setVerificationPassword(text);
                    if (passwordError) setPasswordError('');
                  }}
                  autoCapitalize="none"
                />
              </View>
              
              {passwordError ? (
                <Text style={styles.errorText}>{passwordError}</Text>
              ) : null}
            </View>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowPasswordDialog(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.verifyButton}
                onPress={handlePasswordVerification}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.verifyButtonText}>Verify</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Lock Delay Options Modal */}
      <Modal
        visible={showLockDelayDialog}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLockDelayDialog(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Lock Delay Options</Text>
              <Text style={styles.modalSubtitle}>
                Choose how quickly App Lock should activate when the app goes to the background
              </Text>
            </View>
            
            <View style={styles.modalBody}>
              <TouchableOpacity
                style={[
                  styles.delayOption,
                  lockDelay === 'immediately' && styles.selectedDelayOption
                ]}
                onPress={() => handleLockDelaySelection('immediately')}
              >
                <Text style={[
                  styles.delayOptionText,
                  lockDelay === 'immediately' && styles.selectedDelayOptionText
                ]}>
                  Immediately
                </Text>
                {lockDelay === 'immediately' && (
                  <Ionicons name="checkmark" size={22} color={theme.colors.primary} />
                )}
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.delayOption,
                  lockDelay === '30_seconds' && styles.selectedDelayOption
                ]}
                onPress={() => handleLockDelaySelection('30_seconds')}
              >
                <Text style={[
                  styles.delayOptionText,
                  lockDelay === '30_seconds' && styles.selectedDelayOptionText
                ]}>
                  After 30 seconds
                </Text>
                {lockDelay === '30_seconds' && (
                  <Ionicons name="checkmark" size={22} color={theme.colors.primary} />
                )}
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.delayOption,
                  lockDelay === '1_minute' && styles.selectedDelayOption
                ]}
                onPress={() => handleLockDelaySelection('1_minute')}
              >
                <Text style={[
                  styles.delayOptionText,
                  lockDelay === '1_minute' && styles.selectedDelayOptionText
                ]}>
                  After 1 minute
                </Text>
                {lockDelay === '1_minute' && (
                  <Ionicons name="checkmark" size={22} color={theme.colors.primary} />
                )}
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.delayOption,
                  lockDelay === '5_minutes' && styles.selectedDelayOption
                ]}
                onPress={() => handleLockDelaySelection('5_minutes')}
              >
                <Text style={[
                  styles.delayOptionText,
                  lockDelay === '5_minutes' && styles.selectedDelayOptionText
                ]}>
                  After 5 minutes
                </Text>
                {lockDelay === '5_minutes' && (
                  <Ionicons name="checkmark" size={22} color={theme.colors.primary} />
                )}
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowLockDelayDialog(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const createSecurityStyles = createThemedStyles(theme => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  sectionDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 24,
    lineHeight: 20,
  },
  securityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
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
  disabledOption: {
    opacity: 0.6,
  },
  optionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${theme.colors.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  optionSubtitle: {
    fontSize: 12,
    color: theme.colors.primary,
    marginTop: 4,
    fontWeight: '500',
  },
  securityTipsContainer: {
    marginTop: 24,
    marginBottom: 32,
    backgroundColor: theme.colors.card,
    padding: 16,
    borderRadius: 12,
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
  securityTipsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 16,
  },
  securityTip: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  tipIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '85%',
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  modalHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  modalBody: {
    padding: 20,
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
  errorText: {
    color: theme.colors.error || '#FF6B6B',
    fontSize: 12,
    marginTop: 8,
  },
  modalFooter: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    padding: 15,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  cancelButtonText: {
    color: theme.colors.textSecondary,
    fontSize: 16,
    fontWeight: '500',
  },
  verifyButton: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  verifyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // Lock delay modal styles
  delayOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
  },
  selectedDelayOption: {
    backgroundColor: `${theme.colors.primary}10`,
  },
  delayOptionText: {
    fontSize: 16,
    color: theme.colors.text,
  },
  selectedDelayOptionText: {
    fontWeight: '500',
    color: theme.colors.primary,
  },
}));

export default SecurityScreen;