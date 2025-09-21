// app/AppWrapper.tsx

import React, { useState, useEffect, ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  Platform,
  AppState,
  AppStateStatus
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/app/context/ThemeContext';
import AppLockHelper from './home/utils/AppLockHelper';
import BiometricHelper from './home/utils/BiometricHelper';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import AppNavigator from './auth/AppNavigator';
import { registerForPushNotificationsAsync, savePushTokenToFirestore } from './utils/notifications';

interface AppWrapperProps {
  children: ReactNode;
}

const AppContent = () => {
  const { user } = useAuth();

  useEffect(() => {
    const setupNotifications = async () => {
      if (user) {
        try {
          const token = await registerForPushNotificationsAsync();
          if (token) {
            await savePushTokenToFirestore(token);
          }
        } catch (error) {
          console.error("Error during notification setup:", error);
        }
      }
    };

    setupNotifications();
  }, [user]);

  return <AppNavigator />;
};

const AppWrapper = () => {
  const { theme } = useTheme();

  // State variables
  const [isInitializing, setIsInitializing] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [biometricType, setBiometricType] = useState('Biometric');
  const [authFailed, setAuthFailed] = useState(false);

  useEffect(() => {
    initializeAppLock();

    // Set up app state change listener for when app returns from background
    const appStateListener = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      // Clean up listeners when component unmounts
      appStateListener.remove();
      AppLockHelper.cleanup();
    };
  }, []);

  // Handle app state changes (background to foreground)
  const handleAppStateChange = async (nextAppState: AppStateStatus) => {
    if (nextAppState === 'active') {
      // App has come to the foreground
      const isAppLockEnabled = await AppLockHelper.isAppLockEnabled();

      if (isAppLockEnabled) {
        // Check if we need to authenticate based on lock delay
        const lastActiveStr = await AsyncStorage.getItem('app_lock_last_active');
        if (lastActiveStr) {
          const lastActive = parseInt(lastActiveStr, 10);
          const now = new Date().getTime();
          const timePassed = now - lastActive;

          // Get the current lock delay setting
          const delay = await AppLockHelper.getLockDelay();

          // If time passed is greater than delay, require authentication
          if (timePassed >= delay) {
            setIsLocked(true);
          }
        }
      }
    } else if (nextAppState === 'background') {
      // App has gone to the background
      const now = new Date().getTime();
      await AsyncStorage.setItem('app_lock_last_active', now.toString());
    }
  };

  // Initialize app lock and set up listeners
  const initializeAppLock = async () => {
    try {
      // Get biometric type for UI
      const biometricName = BiometricHelper.getBiometricName();
      setBiometricType(biometricName);

      // Initialize app lock
      AppLockHelper.initialize();

      // Set up authentication handler
      AppLockHelper.setAuthenticationHandler((authenticated) => {
        if (!authenticated) {
          // If not authenticated, show lock screen
          setIsLocked(true);
        }
      });

      // Check if app lock is enabled
      const isAppLockEnabled = await AppLockHelper.isAppLockEnabled();

      if (isAppLockEnabled) {
        // Authenticate on startup if app lock is enabled
        const result = await AppLockHelper.authenticate();
        setIsLocked(!result);
        setAuthFailed(!result);
      }
    } catch (error) {
      console.log('Error initializing app lock:', error);
    } finally {
      setIsInitializing(false);
    }
  };

  // Handle authenticate button press
  const handleAuthenticate = async () => {
    try {
      const result = await AppLockHelper.authenticate();

      if (result) {
        setIsLocked(false);
        setAuthFailed(false);
      } else {
        setAuthFailed(true);
      }
    } catch (error) {
      console.log('Authentication error:', error);
      setAuthFailed(true);
    }
  };

  if (isInitializing) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  // If app is locked, show the lock screen
  if (isLocked) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Modal
          visible={true}
          transparent={true}
          animationType="fade"
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.lockContainer, { backgroundColor: theme.colors.card }]}>
              <View style={styles.lockIconContainer}>
                <Ionicons
                  name="lock-closed"
                  size={48}
                  color={theme.colors.primary}
                />
              </View>

              <Text style={[styles.lockTitle, { color: theme.colors.text }]}>
                App Locked
              </Text>

              <Text style={[styles.lockDescription, { color: theme.colors.textSecondary }]}>
                Please authenticate with {biometricType.toLowerCase()} to access the app
              </Text>

              {authFailed && (
                <Text style={[styles.errorText, { color: theme.colors.error }]}>
                  Authentication failed. Please try again.
                </Text>
              )}

              <TouchableOpacity
                style={[styles.authButton, { backgroundColor: theme.colors.primary }]}
                onPress={handleAuthenticate}
              >
                <Ionicons
                  name="finger-print"
                  size={24}
                  color="#FFFFFF"
                  style={styles.buttonIcon}
                />
                <Text style={styles.authButtonText}>
                  Authenticate with {biometricType}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // If not locked, render children
  return (
    <AuthProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </AuthProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockContainer: {
    width: '85%',
    paddingVertical: 32,
    paddingHorizontal: 20,
    borderRadius: 16,
    alignItems: 'center',
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
  lockIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0,0,0,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  lockTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  lockDescription: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  errorText: {
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  authButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  buttonIcon: {
    marginRight: 8,
  },
  authButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AppWrapper;