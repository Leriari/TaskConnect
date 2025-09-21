// app/(tabs)/home/screens/AppLockScreen.tsx

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  ActivityIndicator,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '@/app/context/ThemeContext';
import { useThemedStyles, createThemedStyles } from '@/app/hooks/useThemedStyles';
import BiometricHelper from '../utils/BiometricHelper';
import AppLockHelper from '../utils/AppLockHelper';
import securityEvents, { SECURITY_EVENTS } from '../utils/SecurityEvents';

const AppLockScreen = () => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createAppLockStyles);
  
  // State variables
  const [isAppLockEnabled, setIsAppLockEnabled] = useState(false);
  const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState('Biometric');
  const [isLoading, setIsLoading] = useState(true);
  const [lockDelay, setLockDelay] = useState('immediately');
  
  useEffect(() => {
    checkAppLockStatus();
  }, []);

  // Check if biometric authentication is available and app lock status
  const checkAppLockStatus = async () => {
    try {
      // Check if app lock is enabled (we'll use AsyncStorage via a helper)
      const appLockStatus = await getAppLockStatus();
      setIsAppLockEnabled(appLockStatus);
      
      // Check if device supports biometric authentication
      const isAvailable = await BiometricHelper.isBiometricAvailable();
      setIsBiometricAvailable(isAvailable);
      
      if (isAvailable) {
        // Get the biometric type (Face ID, Touch ID, or Fingerprint)
        const biometricName = BiometricHelper.getBiometricName();
        setBiometricType(biometricName);
      }
      
      // Get lock delay preference
      const delay = await getLockDelayPreference();
      setLockDelay(delay);
    } catch (error) {
      
    } finally {
      setIsLoading(false);
    }
  };
  
  // Helper to get app lock status
  const getAppLockStatus = async () => {
    try {
      // Use the AppLockHelper to check if app lock is enabled
      return await AppLockHelper.isAppLockEnabled();
    } catch (error) {
      
      return false;
    }
  };

  // Helper to get lock delay preference
  const getLockDelayPreference = async () => {
    try {
      // Use the AppLockHelper to get the lock delay preference
      return await AppLockHelper.getLockDelayPreference();
    } catch (error) {
     
      return 'immediately';
    }
  };

  // Toggle app lock
  const toggleAppLock = async (value: boolean) => {
    if (value && !await BiometricHelper.isBiometricEnabled()) {
      // If trying to enable app lock but biometrics not enabled
      Alert.alert(
        'Biometric Setup Required',
        'You need to set up biometric authentication before enabling App Lock.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Go to Security Settings', 
            onPress: () => router.replace('/home/screens/SecurityScreen')
          }
        ]
      );
      return;
    }
    
    try {
      setIsLoading(true);
      
      if (value) {
        // Verify with biometric before enabling
        const authenticated = await BiometricHelper.authenticate(
          'Authenticate to enable App Lock'
        );
        
        if (!authenticated) {
          setIsLoading(false);
          return;
        }
        
        // Save the preference (would use AsyncStorage in real implementation)
        // await AsyncStorage.setItem('app_lock_enabled', 'true');
        setIsAppLockEnabled(true);
        Alert.alert(
          'App Lock Enabled',
          `Your app will now require ${biometricType} authentication when opened.`
        );
      } else {
        // Verify with biometric before disabling
        const authenticated = await BiometricHelper.authenticate(
          'Authenticate to disable App Lock'
        );
        
        if (!authenticated) {
          setIsLoading(false);
          return;
        }
        
        // Remove the preference
        // await AsyncStorage.removeItem('app_lock_enabled');
        setIsAppLockEnabled(false);
        Alert.alert('App Lock Disabled', 'App Lock has been turned off.');
      }
    } catch (error) {
     
      Alert.alert('Error', 'Failed to update App Lock settings. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle lock delay selection
  const handleLockDelaySelection = async (delay: string) => {
    try {
      // Save the delay preference using AppLockHelper
      const success = await AppLockHelper.setLockDelay(delay as any);
      
      if (success) {
        setLockDelay(delay);
        Alert.alert('Lock Delay Updated', `App will now lock ${delay === 'immediately' ? 'immediately when closed' : 'after ' + delay.replace('_', ' ') + ' when in background'}.`);
      } else {
        Alert.alert('Error', 'Failed to update lock delay. Please try again.');
      }
    } catch (error) {
     
      Alert.alert('Error', 'Failed to update lock delay. Please try again.');
    }
  };
  
  // App lock delay options
  const lockDelayOptions = [
    { label: 'Immediately', value: 'immediately' },
    { label: 'After 30 seconds', value: '30_seconds' },
    { label: 'After 1 minute', value: '1_minute' },
    { label: 'After 5 minutes', value: '5_minutes' },
  ];
  
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionDescription}>
          App Lock adds an extra layer of security by requiring authentication when opening the app after it has been closed or in the background.
        </Text>
        
        {/* Main toggle */}
        <View style={styles.toggleContainer}>
          <View style={styles.toggleTextContainer}>
            <Text style={styles.toggleTitle}>Enable App Lock</Text>
            <Text style={styles.toggleDescription}>
              Require {biometricType} authentication when opening the app
            </Text>
          </View>
          <Switch
            value={isAppLockEnabled}
            onValueChange={toggleAppLock}
            disabled={!isBiometricAvailable}
            thumbColor={isAppLockEnabled ? theme.colors.primary : '#f4f3f4'}
            trackColor={{ 
              false: '#767577', 
              true: `${theme.colors.primary}80`
            }}
            ios_backgroundColor="#3e3e3e"
          />
        </View>
        
        {/* Lock delay options (only shown if app lock is enabled) */}
        {isAppLockEnabled && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Lock Delay</Text>
            <Text style={styles.sectionDescription}>
              Choose how quickly App Lock should activate when the app goes to the background
            </Text>
            
            {lockDelayOptions.map((option, index) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.optionItem,
                  lockDelay === option.value && styles.selectedOption
                ]}
                onPress={() => handleLockDelaySelection(option.value)}
              >
                <Text style={[
                  styles.optionText,
                  lockDelay === option.value && styles.selectedOptionText
                ]}>
                  {option.label}
                </Text>
                {lockDelay === option.value && (
                  <Ionicons name="checkmark" size={22} color={theme.colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
        
        {/* Security Tips */}
        <View style={styles.securityTipsContainer}>
          <Text style={styles.securityTipsTitle}>App Lock Tips</Text>
          <View style={styles.securityTip}>
            <Ionicons name="information-circle-outline" size={20} color={theme.colors.info} style={styles.tipIcon} />
            <Text style={styles.tipText}>App Lock works with your device's biometric authentication system.</Text>
          </View>
          <View style={styles.securityTip}>
            <Ionicons name="information-circle-outline" size={20} color={theme.colors.info} style={styles.tipIcon} />
            <Text style={styles.tipText}>When enabled, you'll need to authenticate each time you open the app after it's been closed or in the background.</Text>
          </View>
          <View style={styles.securityTip}>
            <Ionicons name="alert-circle-outline" size={20} color={theme.colors.warning} style={styles.tipIcon} />
            <Text style={styles.tipText}>Make sure you've set up {biometricType} on your device settings before enabling App Lock.</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const createAppLockStyles = createThemedStyles(theme => ({
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
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
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
  toggleTextContainer: {
    flex: 1,
    marginRight: 16,
  },
  toggleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  toggleDescription: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  sectionContainer: {
    backgroundColor: theme.colors.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
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
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
  },
  selectedOption: {
    backgroundColor: `${theme.colors.primary}10`,
  },
  optionText: {
    fontSize: 15,
    color: theme.colors.text,
  },
  selectedOptionText: {
    fontWeight: '500',
    color: theme.colors.primary,
  },
  securityTipsContainer: {
    marginTop: 8,
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
}));

export default AppLockScreen;