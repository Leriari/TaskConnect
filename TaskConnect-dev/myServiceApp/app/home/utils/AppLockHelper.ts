// app/utils/AppLockHelper.ts

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, AppStateStatus } from 'react-native';
import BiometricHelper from './BiometricHelper';

// Storage keys
const APP_LOCK_ENABLED_KEY = 'app_lock_enabled';
const APP_LOCK_DELAY_KEY = 'app_lock_delay';
const LAST_ACTIVE_TIMESTAMP_KEY = 'app_lock_last_active';

// Available delay options in milliseconds
const DELAY_OPTIONS = {
  immediately: 0,
  '30_seconds': 30 * 1000,
  '1_minute': 60 * 1000,
  '5_minutes': 5 * 60 * 1000,
};

class AppLockHelper {
  private static appStateListener: any = null;
  private static isAuthenticated = false;
  private static authHandler: ((authenticated: boolean) => void) | null = null;

  /**
   * Initialize the app lock system - should be called from the main App component
   */
  static initialize() {
    this.setupAppStateListener();
  }

  /**
   * Clean up resources - should be called when the app is unmounted
   */
  static cleanup() {
    if (this.appStateListener) {
      this.appStateListener?.remove();
      this.appStateListener = null;
    }
  }

  /**
   * Set up a listener for app state changes
   */
  private static setupAppStateListener() {
    // Remove existing listener if any
    if (this.appStateListener) {
      this.appStateListener?.remove();
    }

    // Set up the app state listener
    this.appStateListener = async (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        // App came to foreground
        await this.handleAppActivation();
      } else if (nextAppState === 'background' || nextAppState === 'inactive') {
        // App went to background
        await this.handleAppBackground();
      }
    };

    this.appStateListener = AppState.addEventListener('change', this.appStateListener);
  }

  /**
   * Handle app going to background
   */
  private static async handleAppBackground() {
    // Update last active timestamp
    const now = new Date().getTime();
    await AsyncStorage.setItem(LAST_ACTIVE_TIMESTAMP_KEY, now.toString());
    
    // Reset authentication state
    this.isAuthenticated = false;
  }

  /**
   * Handle app coming to foreground
   */
  private static async handleAppActivation() {
    try {
      // Check if app lock is enabled
      const isEnabled = await this.isAppLockEnabled();
      if (!isEnabled) {
        this.setAuthenticatedState(true);
        return;
      }

      // Get delay setting
      const delay = await this.getLockDelay();
      
      // Check when the app was last active
      const lastActiveStr = await AsyncStorage.getItem(LAST_ACTIVE_TIMESTAMP_KEY);
      if (!lastActiveStr) {
        // No last active timestamp, assume first launch
        this.setAuthenticatedState(true);
        return;
      }

      const lastActive = parseInt(lastActiveStr, 10);
      const now = new Date().getTime();
      const timePassed = now - lastActive;

      // If the time passed is less than the delay, don't require authentication
      if (timePassed < delay) {
        this.setAuthenticatedState(true);
        return;
      }

      // Time passed is greater than the delay, require authentication
      this.isAuthenticated = false;
      
      if (this.authHandler) {
        this.authHandler(false);
      }
    } catch (error) {
      console.log('Error in handleAppActivation:', error);
      // In case of error, allow access to be safe
      this.setAuthenticatedState(true);
    }
  }

  /**
   * Set the authentication state and notify handler if available
   */
  private static setAuthenticatedState(authenticated: boolean) {
    this.isAuthenticated = authenticated;
    if (this.authHandler) {
      this.authHandler(authenticated);
    }
  }

  /**
   * Register a handler function to be called when authentication is required
   */
  static setAuthenticationHandler(handler: (authenticated: boolean) => void) {
    this.authHandler = handler;
  }

  /**
   * Check if app lock is enabled
   */
  static async isAppLockEnabled(): Promise<boolean> {
    try {
      // Try the direct key first
      let value = await AsyncStorage.getItem('app_lock_enabled');
      console.log('AppLockHelper: isAppLockEnabled() checking direct key, value:', value);
      
      // If not found, try the class constant key
      if (value === null && APP_LOCK_ENABLED_KEY !== 'app_lock_enabled') {
        value = await AsyncStorage.getItem(APP_LOCK_ENABLED_KEY);
        console.log('AppLockHelper: isAppLockEnabled() checking constant key, value:', value);
      }
      
      const isEnabled = value === 'true';
      console.log('AppLockHelper: isAppLockEnabled() final result:', isEnabled);
      return isEnabled;
    } catch (error) {
      console.log('Error checking if app lock is enabled:', error);
      return false;
    }
  }

  /**
   * Enable app lock
   */
  static async enableAppLock(): Promise<boolean> {
    try {
      console.log('AppLockHelper: enableAppLock() called');
      
      // First make sure biometric is available and enabled
      const biometricAvailable = await BiometricHelper.isBiometricAvailable();
      const biometricEnabled = await BiometricHelper.isBiometricEnabled();
      
      console.log('AppLockHelper: biometricAvailable:', biometricAvailable, 'biometricEnabled:', biometricEnabled);
      
      if (!biometricAvailable || !biometricEnabled) {
        console.log('AppLockHelper: Cannot enable app lock, biometric not available or not enabled');
        return false;
      }
      
      // Directly set in AsyncStorage - ensure this works
      await AsyncStorage.setItem('app_lock_enabled', 'true');
      
      // Also set in the class constant key for consistency
      if (APP_LOCK_ENABLED_KEY !== 'app_lock_enabled') {
        await AsyncStorage.setItem(APP_LOCK_ENABLED_KEY, 'true');
      }
      
      console.log('AppLockHelper: App lock enabled successfully');
      
      // Verify that the value was saved
      const savedValue = await AsyncStorage.getItem('app_lock_enabled');
      console.log('AppLockHelper: Verification - value in AsyncStorage after save:', savedValue);
      
      return true;
    } catch (error) {
      console.log('Error enabling app lock:', error);
      return false;
    }
  }

  /**
   * Disable app lock
   */
  static async disableAppLock(): Promise<boolean> {
    try {
      console.log('AppLockHelper: disableAppLock() called');
      
      // Directly set in AsyncStorage - ensure this works
      await AsyncStorage.setItem('app_lock_enabled', 'false');
      
      // Also set in the class constant key for consistency
      if (APP_LOCK_ENABLED_KEY !== 'app_lock_enabled') {
        await AsyncStorage.setItem(APP_LOCK_ENABLED_KEY, 'false');
      }
      
      console.log('AppLockHelper: App lock disabled successfully');
      return true;
    } catch (error) {
      console.log('Error disabling app lock:', error);
      return false;
    }
  }

  /**
   * Get the current lock delay setting
   * @returns Delay in milliseconds
   */
  static async getLockDelay(): Promise<number> {
    try {
      const delayKey = await AsyncStorage.getItem(APP_LOCK_DELAY_KEY) || 'immediately';
      return DELAY_OPTIONS[delayKey as keyof typeof DELAY_OPTIONS];
    } catch (error) {
      console.log('Error getting lock delay:', error);
      return 0; // Default to immediately
    }
  }

  /**
   * Set the lock delay
   * @param delayKey One of the delay option keys
   */
  static async setLockDelay(delayKey: keyof typeof DELAY_OPTIONS): Promise<boolean> {
    try {
      await AsyncStorage.setItem(APP_LOCK_DELAY_KEY, delayKey);
      return true;
    } catch (error) {
      console.log('Error setting lock delay:', error);
      return false;
    }
  }

  /**
   * Get the delay preference key
   */
  static async getLockDelayPreference(): Promise<string> {
    try {
      return await AsyncStorage.getItem(APP_LOCK_DELAY_KEY) || 'immediately';
    } catch (error) {
      console.log('Error getting lock delay preference:', error);
      return 'immediately';
    }
  }

  /**
   * Check if user is authenticated (has passed app lock)
   */
  static isUserAuthenticated(): boolean {
    return this.isAuthenticated;
  }

  /**
   * Authenticate with biometric for app lock
   * @returns True if authentication was successful
   */
  static async authenticate(): Promise<boolean> {
    try {
      const result = await BiometricHelper.authenticate('Verify your identity to access the app');
      
      if (result) {
        this.setAuthenticatedState(true);
        return true;
      }
      
      return false;
    } catch (error) {
      console.log('Error authenticating for app lock:', error);
      return false;
    }
  }
}

export default AppLockHelper;