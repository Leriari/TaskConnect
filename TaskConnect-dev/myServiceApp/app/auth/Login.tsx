// app/(tabs)/auth/Login.tsx

import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  TextInput, 
  ActivityIndicator,
  KeyboardAvoidingView, 
  Platform,
  StatusBar,
  SafeAreaView,
  Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import useGoogleSignIn from './googleSignIn';
import { router } from 'expo-router';
import { signInWithEmailAndPassword } from 'firebase/auth'; 
import { auth } from '../../firebase-config';
import BiometricHelper from '../home/utils/BiometricHelper';
import { FirebaseError } from 'firebase/app';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles, createThemedStyles } from '../hooks/useThemedStyles';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const LoginScreen = () => {
  // Extract necessary functions from the hook
  const { 
    signIn, 
    waitingForManualReturn, 
    authCode, 
    setAuthCode, 
    handleCodeSubmit,
    error: googleSignInError, 
  } = useGoogleSignIn();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCodeSubmitting, setIsCodeSubmitting] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState('Biometric');
  
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  
  // Check for biometric authentication availability on component mount
  useEffect(() => {
    checkBiometricAvailability();
  }, []);
  
  // Function to check biometric availability
  const checkBiometricAvailability = async () => {
    try {
      const isEnabled = await BiometricHelper.isBiometricEnabled();
      const isAvailable = await BiometricHelper.isBiometricAvailable();
      const hasCredentials = await BiometricHelper.hasStoredCredentials();
      
      // Only show biometric option if all three conditions are met
      setIsBiometricAvailable(isEnabled && isAvailable && hasCredentials);
      
      // Get the biometric type name
      const biometricName = BiometricHelper.getBiometricName();
      setBiometricType(biometricName);
      
      // If biometric is available and enabled, show the biometric prompt immediately
      if (isEnabled && isAvailable && hasCredentials) {
        // Get the stored email to show in the UI
        const storedEmail = await BiometricHelper.getStoredEmail();
        if (storedEmail) {
          setEmail(storedEmail); // Pre-fill the email field
        }
        
        // Small delay before showing biometric prompt
        setTimeout(() => {
          handleBiometricLogin();
        }, 500);
      }
    } catch (error) {
      console.log('Error checking biometric status:', error);
    }
  };
  
  // Handle biometric login
  const handleBiometricLogin = async () => {
    try {
      setIsLoading(true);
      
      // Use the new method to get stored credentials after biometric authentication
      const result = await BiometricHelper.authenticateAndGetCredentials();
      
      if (result.success && result.email && result.password) {
        try {
          // Sign in to Firebase using the stored credentials
          await signInWithEmailAndPassword(auth, result.email, result.password);
          
          // Navigate to home screen on success
          router.push('/home');
        } catch (error) {

          setIsLoading(false);
          
          // Handle authentication errors
          if ((error as FirebaseError).code === 'auth/invalid-credential' || 
              (error as FirebaseError).code === 'auth/user-not-found' || 
              (error as FirebaseError).code === 'auth/wrong-password') {
            Alert.alert(
              'Authentication Failed',
              'Your saved login credentials are no longer valid. Please sign in with your email and password, then re-enable biometric login.',
              [{ text: 'OK' }]
            );
          } else {
            Alert.alert(
              'Login Error',
              'Failed to sign in. Please try again or use your email and password.',
              [{ text: 'OK' }]
            );
          }
        }
      } else {
        setIsLoading(false);
        
        // Handle specific error types
        if (result.errorType === 'no_credentials') {
          Alert.alert(
            'No Biometric Data',
            'No user account is linked to your biometrics. Please log in with your email and password first, then enable biometric login in Security settings.',
            [{ text: 'OK' }]
          );
        } else if (result.errorType === 'user_cancelled') {
          // User cancelled, no need to show alert
        } else if (result.errorType === 'auth_failed') {
          Alert.alert(
            'Authentication Failed',
            'Biometric authentication failed. Please try again or use your password.',
            [{ text: 'OK' }]
          );
        }
      }
    } catch (error) {

      setIsLoading(false);
      Alert.alert('Authentication Error', 'Failed to authenticate using biometrics');
    }
  };

  const validateForm = () => {
    let isValid = true;
    
    // Reset previous errors
    setEmailError('');
    setPasswordError('');
    
    // Validate email
    if (!email.trim()) {
      setEmailError('Email is required');
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError('Email format is invalid');
      isValid = false;
    }
    
    // Validate password
    if (!password) {
      setPasswordError('Password is required');
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      isValid = false;
    }
    
    return isValid;
  };

  const handleEmailSignIn = async () => {
    if (!validateForm()) return;
    
    setIsLoading(true);
    setLoginError('');
    
    try {
      // Sign in with firebase using email and password
      await signInWithEmailAndPassword(auth, email, password);
      
      // Store email and password for future biometric login
      // This happens quietly in the background - user can enable biometric in Security screen
      if (await BiometricHelper.isBiometricAvailable()) {
        // We're not enabling biometrics here, just storing the credentials
        // User will need to explicitly enable biometrics in Security screen
        await BiometricHelper.storeCredentials(email, password);
      }
      
      router.push('/home');
    } catch (error) {
      // Handle specific Firebase auth errors
      let errorMessage = 'Failed to sign in. Please try again.';
      
      if ((error as FirebaseError).code === 'auth/user-not-found' || 
          (error as FirebaseError).code === 'auth/wrong-password') {
        errorMessage = 'Incorrect email or password';
      } else if ((error as FirebaseError).code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed login attempts. Please try again later';
      }
      
      setLoginError(errorMessage);
      Alert.alert('Sign-In Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoginError('');
    try {
      await signIn();
    } catch (err) {
      console.error('Error during Google sign-in:', err);
    }
  };
  
  const handleSignUp = () => {
    router.push('/auth/signup');
  };

  const handleForgotPassword = () => {
    router.push('/auth/forgot-password');
  };

  const handleCodeSubmitWithLoading = async () => {
    if (!authCode.trim()) {
      Alert.alert('Error', 'Please enter the authentication code');
      return;
    }

    setIsCodeSubmitting(true);
    try {
      await handleCodeSubmit();
    } catch (error) {
     
      Alert.alert('Error', 'Failed to submit authentication code');
    } finally {
      setIsCodeSubmitting(false);
    }
  };

  // Custom implementation of CodeInputComponent without any spinner
  const renderCodeInput = () => {
    return (
      <View style={styles.codeInputWrapper}>
        <View style={styles.codeInputHeaderContainer}>
          <View style={styles.logoContainer}>
            <LinearGradient
              colors={['#5CBD6A', '#3C9D4E']}
              start={[0, 0]}
              end={[1, 1]}
              style={styles.logoGradient}
            >
              <Text style={styles.logoText}>TC</Text>
            </LinearGradient>
          </View>
          <Text style={styles.headerText}>Google Sign-In</Text>
          <Text style={styles.subHeaderText}>Enter the authentication code from the browser</Text>
        </View>
        
        <View style={styles.codeInputContainer}>
          <Text style={styles.codeInputTitle}>Enter Authentication Code</Text>
          <Text style={styles.codeInputInstructions}>
            After signing in with Google, you'll receive a code in the browser. 
            Please copy and paste that code below.
          </Text>
          
          <TextInput
            style={styles.codeInput}
            value={authCode}
            onChangeText={setAuthCode}
            placeholder="Enter code from browser"
            placeholderTextColor={theme.dark ? theme.colors.textLight : '#000'}
            autoCapitalize="none"
            autoComplete="off"
            autoCorrect={false}
          />
          
          <TouchableOpacity
            style={styles.submitButtonContainer}
            onPress={handleCodeSubmitWithLoading}
            disabled={isCodeSubmitting}
          >
            <LinearGradient
              colors={['#5CBD6A', '#3C9D4E']}
              start={[0, 0]}
              end={[1, 0]}
              style={styles.submitButtonGradient}
            >
              {isCodeSubmitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>Complete Sign-In</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
          
          {googleSignInError ? (
            <Text style={styles.errorText}>{googleSignInError}</Text>
          ) : null}
        </View>
        
        <TouchableOpacity 
          style={styles.cancelButton}
          onPress={() => router.push('/')}
        >
          <Text style={styles.cancelButtonText}>Cancel Sign-In</Text>
        </TouchableOpacity>
      </View>
    );
  };
  
  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
    >
      <StatusBar barStyle="light-content" />
      
      <LinearGradient
        colors={['rgba(0,0,0,0.8)', 'rgba(0,0,0,0.6)']}
        style={styles.gradient}
      />
      
      <SafeAreaView style={styles.safeArea}>
        {waitingForManualReturn ? (
          renderCodeInput()
        ) : (
          <>
            <View style={styles.headerContainer}>
              <View style={styles.logoContainer}>
                <LinearGradient
                  colors={['#5CBD6A', '#3C9D4E']}
                  start={[0, 0]}
                  end={[1, 1]}
                  style={styles.logoGradient}
                >
                  <Text style={styles.logoText}>TC</Text>
                </LinearGradient>
              </View>
              <Text style={styles.headerText}>Welcome</Text>
              <Text style={styles.subHeaderText}>Sign in to continue</Text>
            </View>

            <View style={styles.formContainer}>
              {/* Email Input */}
              <View style={[
                styles.inputContainer, 
                emailError ? styles.inputError : null
              ]}>
                <Ionicons name="mail-outline" size={22} color={theme.dark ? theme.colors.textLight : '#000'} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Email Address"
                  placeholderTextColor={theme.dark ? theme.colors.textLight : '#000'}
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (emailError) setEmailError('');
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!isLoading}
                />
              </View>
              {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}

              {/* Password Input */}
              <View style={[
                styles.inputContainer,
                passwordError ? styles.inputError : null
              ]}>
                <Ionicons name="lock-closed-outline" size={22} color={theme.dark ? theme.colors.textLight : '#000'} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor={theme.dark ? theme.colors.textLight : '#000'}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (passwordError) setPasswordError('');
                  }}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  editable={!isLoading}
                />
                <TouchableOpacity 
                  style={styles.passwordToggle}
                  onPress={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  <Ionicons 
                    name={showPassword ? "eye-off-outline" : "eye-outline"} 
                    size={22} 
                    color={theme.dark ? theme.colors.textLight : '#000'} 
                  />
                </TouchableOpacity>
              </View>
              {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}

              <TouchableOpacity 
                style={styles.forgotPasswordButton}
                onPress={handleForgotPassword}
                disabled={isLoading}
              >
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>

              {/* General login error message */}
              {loginError ? <Text style={[styles.errorText, styles.generalError]}>{loginError}</Text> : null}

              {/* Sign In Button */}
              <TouchableOpacity 
                activeOpacity={0.8}
                onPress={handleEmailSignIn}
                disabled={isLoading}
              >
                <LinearGradient
                  colors={['#5CBD6A', '#3C9D4E']}
                  start={[0, 0]}
                  end={[1, 0]}
                  style={styles.signInButton}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.signInButtonText}>Sign In</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Biometric Login Button (visible only if biometric is available) */}
              {isBiometricAvailable && (
                <TouchableOpacity 
                  style={styles.biometricButton}
                  onPress={handleBiometricLogin}
                  disabled={isLoading}
                >
                  <View style={styles.biometricButtonContent}>
                    <Ionicons 
                      name={Platform.OS === 'ios' ? "finger-print-outline" : "finger-print"} 
                      size={22} 
                      color="#fff" 
                      style={styles.biometricIcon} 
                    />
                    <Text style={styles.biometricButtonText}>
                      Sign in with {biometricType}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}

              {/* Social Login Divider */}
              <View style={styles.dividerContainer}>
                <View style={styles.divider} />
                <Text style={styles.dividerText}>OR CONTINUE WITH</Text>
                <View style={styles.divider} />
              </View>

              {/* Social Login Buttons */}
              <View style={styles.socialButtonsContainer}>
                {/* Google Login */}
                <TouchableOpacity 
                  style={styles.socialButton}
                  onPress={handleGoogleSignIn}
                >
                  <FontAwesome name="google" size={20} color="#DB4437" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Sign Up Link */}
            <View style={styles.signUpContainer}>
              <Text style={styles.signUpText}>Don't have an account? </Text>
              <TouchableOpacity onPress={handleSignUp}>
                <Text style={styles.signUpLink}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
        <View style={{ height: insets.bottom }} />
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
};

const createStyles = createThemedStyles(theme => ({
  container: {
    flex: 1,
    backgroundColor: theme.dark ? theme.colors.background : '#fff',
  },
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? 30 : 10,
    backgroundColor: theme.dark ? theme.colors.background : '#fff',
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  codeInputWrapper: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 30,
    backgroundColor: theme.colors.background,
  },
  codeInputHeaderContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  cancelButton: {
    marginTop: 20,
    alignSelf: 'center',
  },
  cancelButtonText: {
    color: theme.colors.textLight,
    fontSize: 16,
    textDecorationLine: 'underline',
  },
  headerContainer: {
    alignItems: 'center',
    marginTop: Platform.OS === 'ios' ? 80 : 90,
    marginBottom: 40,
  },
  logoContainer: {
    marginBottom: 20,
    shadowColor: theme.colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: theme.colors.shadowOpacity,
    shadowRadius: 5,
    elevation: 6,
  },
  logoGradient: {
    width: 60,
    height: 60,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 8,
  },
  subHeaderText: {
    fontSize: 16,
    color: theme.colors.textLight,
  },
  formContainer: {
    paddingHorizontal: 30,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.dark ? theme.colors.border : '#000',
    paddingHorizontal: 15,
  },
  inputError: {
    borderColor: theme.colors.error,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 12,
    marginBottom: 12,
    marginLeft: 5,
  },
  generalError: {
    textAlign: 'center',
    marginBottom: 15,
    fontSize: 14,
  },
  inputIcon: {
    marginRight: 10,
    color: theme.colors.textLight,
  },
  input: {
    flex: 1,
    height: 55,
    color: theme.dark ? theme.colors.text : '#000',
    fontSize: 16,
  },
  passwordToggle: {
    padding: 8,
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  forgotPasswordText: {
    color: theme.colors.primary,
    fontSize: 14,
  },
  signInButton: {
    height: 55,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 25,
    shadowColor: theme.colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: theme.colors.shadowOpacity,
    shadowRadius: 5,
    elevation: 5,
  },
  signInButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  biometricButton: {
    marginBottom: 25,
    borderWidth: 1,
    borderColor: theme.colors.primaryLight,
    borderRadius: 12,
    padding: 12,
    backgroundColor: theme.colors.primaryLight,
  },
  biometricButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  biometricIcon: {
    marginRight: 8,
    color: '#fff',
  },
  biometricButtonText: {
    color: theme.dark ? theme.colors.primary : '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.border,
  },
  dividerText: {
    color: theme.colors.textLight,
    fontSize: 12,
    fontWeight: '600',
    marginHorizontal: 10,
  },
  socialButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  socialButton: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: theme.colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  socialButtonDisabled: {
    opacity: 0.6,
  },
  signUpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 'auto',
    marginBottom: 30,
  },
  signUpText: {
    color: theme.colors.textLight,
    fontSize: 15,
  },
  signUpLink: {
    color: theme.colors.primary,
    fontSize: 15,
    fontWeight: 'bold',
  },
  // Styles for the code input component
  codeInputContainer: {
    marginVertical: 20,
    padding: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  codeInputTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
    color: '#fff',
  },
  codeInputInstructions: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 20,
  },
  codeInput: {
    height: 60,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    letterSpacing: 1.5,
  },
  submitButtonContainer: {
    marginTop: 5,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  submitButtonGradient: {
    height: 55,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
}));

export default LoginScreen;