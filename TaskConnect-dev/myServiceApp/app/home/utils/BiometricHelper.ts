// app/utils/BiometricHelper.ts

import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Platform } from 'react-native';
import AppLockHelper from './AppLockHelper';

// Storage key for biometric preference
const BIOMETRIC_ENABLED_KEY = 'biometric_auth_enabled';
const BIOMETRIC_EMAIL_KEY = 'biometric_auth_email';
const BIOMETRIC_PASSWORD_KEY = 'biometric_auth_password';

class BiometricHelper {
  /**
   * Check if the device supports biometric authentication
   */
  static async isBiometricAvailable() {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      if (!compatible) return false;

      const enrolled = await LocalAuthentication.isEnrolledAsync();
      return enrolled;
    } catch (error) {
      console.log('Error checking biometric availability:', error);
      return false;
    }
  }

  /**
   * Get the types of biometric authentication available on the device
   */
  static async getBiometricTypes() {
    try {
      return await LocalAuthentication.supportedAuthenticationTypesAsync();
    } catch (error) {
      console.log('Error getting biometric types:', error);
      return [];
    }
  }

  /**
   * Get a user-friendly name for the biometric type
   */
  static getBiometricName() {
    if (Platform.OS === 'ios') {
      return 'Face ID / Touch ID';
    } else {
      return 'Fingerprint';
    }
  }

  /**
   * Check if biometric authentication is enabled for the user
   */
  static async isBiometricEnabled() {
    try {
      const value = await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY);
      return value === 'true';
    } catch (error) {
      console.log('Error checking biometric enabled status:', error);
      return false;
    }
  }

  /**
   * Check if the user has any biometric credentials stored
   */
  static async hasStoredCredentials() {
    try {
      const email = await AsyncStorage.getItem(BIOMETRIC_EMAIL_KEY);
      const password = await AsyncStorage.getItem(BIOMETRIC_PASSWORD_KEY);
      return !!(email && password);
    } catch (error) {
      console.log('Error checking stored credentials:', error);
      return false;
    }
  }
  
  /**
   * Get the currently stored email (if any)
   */
  static async getStoredEmail() {
    try {
      return await AsyncStorage.getItem(BIOMETRIC_EMAIL_KEY);
    } catch (error) {
      console.log('Error getting stored email:', error);
      return null;
    }
  }

  /**
   * Store credentials securely for a user
   */
  static async storeCredentials(email: string, password: string) {
    try {
      // First check if biometrics are available
      const available = await this.isBiometricAvailable();
      if (!available) {
        Alert.alert(
          'Biometric Authentication Unavailable',
          'Your device doesn\'t support or doesn\'t have configured biometric authentication.'
        );
        return false;
      }

      // Enable biometric auth flag
      await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, 'true');
      
      // Store the credentials
      await AsyncStorage.setItem(BIOMETRIC_EMAIL_KEY, email);
      await AsyncStorage.setItem(BIOMETRIC_PASSWORD_KEY, password);
      
      return true;
    } catch (error) {
      console.log('Error storing credentials:', error);
      return false;
    }
  }

  /**
   * Disable biometric authentication for the user
   */
  static async disableBiometric() {
    try {
      // Check if app lock is enabled before disabling biometrics
      const isAppLockEnabled = await AppLockHelper.isAppLockEnabled();
      if (isAppLockEnabled) {
        // Need to disable app lock first
        const success = await AppLockHelper.disableAppLock();
        if (!success) {
          return false;
        }
      }
      
      await AsyncStorage.removeItem(BIOMETRIC_ENABLED_KEY);
      await AsyncStorage.removeItem(BIOMETRIC_EMAIL_KEY);
      await AsyncStorage.removeItem(BIOMETRIC_PASSWORD_KEY);
      return true;
    } catch (error) {
      console.log('Error disabling biometric:', error);
      return false;
    }
  }
  
  /**
   * Clear any biometric credentials without disabling biometrics
   * Useful when a user logs out
   */
  static async clearCredentials() {
    try {
      await AsyncStorage.removeItem(BIOMETRIC_EMAIL_KEY);
      await AsyncStorage.removeItem(BIOMETRIC_PASSWORD_KEY);
      return true;
    } catch (error) {
      console.log('Error clearing credentials:', error);
      return false;
    }
  }

  /**
   * Authenticate using biometrics and then use saved credentials for Firebase auth
   */
  static async authenticateAndGetCredentials() {
    try {
      // Check if biometrics are enabled
      const enabled = await this.isBiometricEnabled();
      if (!enabled) {
        return { success: false, errorType: 'not_enabled' };
      }

      // Check if the device supports biometrics
      const available = await this.isBiometricAvailable();
      if (!available) {
        return { success: false, errorType: 'not_available' };
      }

      // Get stored credentials
      const email = await AsyncStorage.getItem(BIOMETRIC_EMAIL_KEY);
      const password = await AsyncStorage.getItem(BIOMETRIC_PASSWORD_KEY);
      
      if (!email || !password) {
        return { success: false, errorType: 'no_credentials' };
      }

      // Prompt user for biometric authentication
      const biometricAuth = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Log in with biometrics',
        fallbackLabel: 'Use password instead',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });

      if (biometricAuth.success) {
        // Biometric authentication succeeded, return stored credentials
        return {
          success: true,
          email,
          password
        };
      } else {
        // User cancelled or authentication failed
        return { 
          success: false, 
          errorType: biometricAuth.error === 'user_cancel' ? 'user_cancelled' : 'auth_failed' 
        };
      }
    } catch (error) {
      console.log('Error during biometric authentication:', error);
      return { success: false, errorType: 'error' };
    }
  }
  
  /**
   * Get stored credentials after biometric authentication
   * Simplified version returning object with email and password directly
   */
  static async getCredentials(): Promise<{ email: string, password: string } | null> {
    try {
      const result = await this.authenticateAndGetCredentials();
      
      if (result.success) {
        return {
          email: result.email ?? '',
          password: result.password ?? ''
        };
      }
      
      return null;
    } catch (error) {
      console.log('Error getting credentials:', error);
      return null;
    }
  }
  
  /**
   * Authenticate with biometric for general purposes
   * @param promptMessage Custom message to show during authentication prompt
   */
  static async authenticate(promptMessage: string = 'Authenticate to continue'): Promise<boolean> {
    try {
      // First check if biometric is available and enabled
      const isAvailable = await BiometricHelper.isBiometricAvailable();
      const isEnabled = await BiometricHelper.isBiometricEnabled();
      
      if (!isAvailable || !isEnabled) {
        return false;
      }
      
      // Authenticate with biometric
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage,
        fallbackLabel: 'Use password',
        disableDeviceFallback: false,
      });
      
      return result.success;
    } catch (error) {
      console.log('Error authenticating with biometric:', error);
      return false;
    }
  }
}

export default BiometricHelper;