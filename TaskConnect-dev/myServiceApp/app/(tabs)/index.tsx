import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ImageBackground,
  Dimensions,
  StatusBar,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  BackHandler
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { onAuthStateChanged } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../../firebase-config';
import BiometricHelper from '../home/utils/BiometricHelper';
import AppLockHelper from '../home/utils/AppLockHelper';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [biometricType, setBiometricType] = useState('Biometric');
  const [isUserLoggedIn, setIsUserLoggedIn] = useState(false);
  const [isLockActive, setIsLockActive] = useState(false);
  const [authAttempts, setAuthAttempts] = useState(0);

  useEffect(() => {
    // Get biometric type for better UX
    const getBiometricType = async () => {
      const type = BiometricHelper.getBiometricName();
      setBiometricType(type);
    };
    
    getBiometricType();

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // User is signed in
        setIsUserLoggedIn(true);
        await checkAppLock();
      } else {
        // No user is signed in, stay on welcome screen
        setIsUserLoggedIn(false);
        setIsLoading(false);
      }
    });

    // Handle hardware back button when lock is active
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isLockActive) {
        // Prevent back navigation when lock is active
        retryAuthentication();
        return true;
      }
      return false;
    });

    // Cleanup subscriptions on unmount
    return () => {
      unsubscribe();
      backHandler.remove();
    };
  }, [isLockActive]);

  const checkAppLock = async () => {
    try {
      // Check if app lock is enabled
      const appLockValue = await AsyncStorage.getItem('app_lock_enabled');
      const isAppLockEnabled = appLockValue === 'true';

      console.log('WelcomeScreen: App lock enabled:', isAppLockEnabled);
      
      if (isAppLockEnabled) {
        // App lock is enabled
        setIsLockActive(true);
        
        // Check if biometric is available
        const isBiometricAvailable = await BiometricHelper.isBiometricAvailable();
        
        if (!isBiometricAvailable) {
          // Biometric not available but app lock is enabled - this is an edge case
          Alert.alert(
            'Authentication Required',
            'Biometric authentication is required but not available on this device. Please disable App Lock in Security settings.',
            [{ text: 'OK' }]
          );
          setIsLoading(false);
          return;
        }
        
        // Start authentication process
        authenticateWithBiometrics();
      } else {
        // App lock not enabled, directly navigate to home
        router.replace('/home');
      }
    } catch (error) {
      console.error('Error checking app lock status:', error);
      // In case of error, we still want to keep the app locked if user is logged in
      setIsLoading(false);
    }
  };

  const authenticateWithBiometrics = async () => {
    try {
      setIsAuthenticating(true);
      
      // Authenticate with biometrics
      const authenticated = await BiometricHelper.authenticate(
        'Verify your identity to access Task Connect'
      );
      
      if (authenticated) {
        // Authentication successful, navigate to home
        setIsLockActive(false);
        router.replace('/home');
      } else {
        // Authentication failed, maintain lock and show retry
        setIsAuthenticating(false);
        setAuthAttempts(prev => prev + 1);
        
        // Optional: You could add max attempt logic here
        if (authAttempts >= 3) {
          Alert.alert(
            'Authentication Failed',
            'Too many unsuccessful attempts. Please try again later.',
            [{ text: 'OK' }]
          );
        }
      }
    } catch (error) {
      console.error('Biometric authentication error:', error);
      setIsAuthenticating(false);
    }
  };

  const retryAuthentication = () => {
    authenticateWithBiometrics();
  };

  // When user is logged in and lock is active, show only the auth screen
  if (isUserLoggedIn && isLockActive) {
    return (
      <View style={styles.lockContainer}>
        <View style={styles.authContainer}>
          <View style={styles.biometricIconContainer}>
            <Ionicons 
              name={biometricType.toLowerCase().includes('face') ? 'scan-outline' : 'finger-print-outline'} 
              size={48} 
              color="#5CBD6A" 
            />
          </View>
          <Text style={styles.authText}>
            {isAuthenticating 
              ? `Authenticating with ${biometricType}...` 
              : `Authentication required to access the app`}
          </Text>
          
          {isAuthenticating ? (
            <ActivityIndicator size="small" color="#5CBD6A" style={styles.authSpinner} />
          ) : (
            <TouchableOpacity
              style={styles.retryButton}
              onPress={retryAuthentication}
            >
              <LinearGradient
                colors={['#5CBD6A', '#3C9D4E']}
                start={[0, 0]}
                end={[1, 0]}
                style={styles.gradientButton}
              >
                <Text style={styles.retryText}>Try Again</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  // Show loading indicator while checking auth state
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5CBD6A" />
      </View>
    );
  }

  // Regular welcome screen for non-logged in users
  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      
      {/* Full screen background image */}
      <ImageBackground
        source={require('@/assets/images/background.jpg')}
        style={styles.backgroundImage}
        resizeMode="cover"
      />
      
      {/* Dark overlay for better text contrast */}
      <View style={styles.overlay} />
      
      <SafeAreaView style={styles.content}>
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <LinearGradient
              colors={['#3C9D4E', '#5CBD6A']}
              start={[0, 0]}
              end={[1, 1]}
              style={styles.logoGradient}
            >
              <Text style={styles.logoText}>TC</Text>
            </LinearGradient>
          </View>
          <Text style={styles.appName}>Task Connect</Text>
        </View>
        
        {/* Main Content */}
        <View style={styles.mainContent}>
          <Text style={styles.tagline}>Organize Your Day</Text>
          <Text style={styles.subtitle}>
            Simple, powerful task management to boost your productivity
          </Text>
          
          {/* Feature Highlights */}
          <View style={styles.features}>
            <View style={styles.featureItem}>
              <View style={styles.featureIconContainer}>
                <Ionicons name="flash-outline" size={22} color="#5CBD6A" />
              </View>
              <Text style={styles.featureText}>Fast & Intuitive</Text>
            </View>
            
            <View style={styles.featureItem}>
              <View style={styles.featureIconContainer}>
                <Ionicons name="sync-outline" size={22} color="#5CBD6A" />
              </View>
              <Text style={styles.featureText}>Cloud Sync</Text>
            </View>
            
            <View style={styles.featureItem}>
              <View style={styles.featureIconContainer}>
                <Ionicons name="notifications-outline" size={22} color="#5CBD6A" />
              </View>
              <Text style={styles.featureText}>Smart Reminders</Text>
            </View>
          </View>
        </View>
        
        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.getStartedButton}
            onPress={() => router.push('/auth/signUp')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#5CBD6A', '#3C9D4E']}
              start={[0, 0]}
              end={[1, 0]}
              style={styles.gradientButton}
            >
              <Text style={styles.getStartedText}>Get Started</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => router.push('/auth/Login')}
            activeOpacity={0.8}
          >
            <Text style={styles.loginText}>I already have an account</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  lockContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  authContainer: {
    alignItems: 'center',
    padding: 24,
    width: '80%',
  },
  biometricIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(92, 189, 106, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  authText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '500',
    marginBottom: 32,
    textAlign: 'center',
    lineHeight: 24,
  },
  authSpinner: {
    marginTop: 8,
  },
  retryButton: {
    width: '100%',
    height: 50,
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 16,
  },
  retryText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#000', // Fallback color
  },
  backgroundImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    top: 0,
    left: 0,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.65)', // Dark overlay for better readability
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: StatusBar.currentHeight || 20,
  },
  
  // Header styling
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  logoContainer: {
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  logoGradient: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 0.5,
  },
  
  // Main content styling
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-start',
    marginBottom: 40,
  },
  tagline: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 3,
  },
  subtitle: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 40,
    lineHeight: 26,
    maxWidth: '90%',
  },
  
  // Features styling
  features: {
    width: '100%',
    marginBottom: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  featureIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  featureText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },
  
  // Action buttons styling
  actions: {
    width: '100%',
    marginBottom: 30,
  },
  getStartedButton: {
    width: '100%',
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 6,
  },
  gradientButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  getStartedText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginRight: 8,
  },
  loginButton: {
    width: '100%',
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },
});