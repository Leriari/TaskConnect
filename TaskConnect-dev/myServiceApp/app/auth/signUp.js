import React, { useState } from 'react';
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
  Alert,
  ScrollView,
  Modal
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { createUserWithEmailAndPassword, updateProfile, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../firebase-config';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../hooks/useThemedStyles';

const SignUpScreen = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [countryCode, setCountryCode] = useState('+1'); // Default to US
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Error states
  const [firstNameError, setFirstNameError] = useState('');
  const [lastNameError, setLastNameError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [signupError, setSignupError] = useState('');

  const validateForm = () => {
    let isValid = true;

    // Reset previous errors
    setFirstNameError('');
    setLastNameError('');
    setPhoneError('');
    setEmailError('');
    setPasswordError('');
    setConfirmPasswordError('');
    setSignupError('');

    // Validate name
    if (!name.trim()) {
      setNameError('Name is required');
      isValid = false;
    }

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

    // Validate password confirmation
    if (password !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match');
      isValid = false;
    }

    return isValid;
  };

  const handleSignUp = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    setSignupError('');

    try {
      // Create user with email and password
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);

      // Update user profile with name
      await updateProfile(userCredential.user, {
        displayName: name
      });



      // Set up a listener to ensure auth state is properly updated before navigation
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        if (user) {

          router.replace('/home');
          unsubscribe(); // Remove the listener once we've navigated
        }
      });

      // Fallback if the auth state doesn't update within 2 seconds
      setTimeout(() => {
        const currentUser = auth.currentUser;
        if (currentUser) {

          unsubscribe(); // Remove the listener
          router.replace('/home');
        } else {

          unsubscribe(); // Remove the listener
          Alert.alert(
            'Account Created',
            'Your account has been created successfully. Please sign in now.',
            [
              { text: 'OK', onPress: () => router.replace('/auth/Login') }
            ]
          );
        }
      }, 2000);
    } catch (error) {
      let errorMessage = 'Failed to create account. Please try again.';

      if (error && error.code === 'auth/email-already-in-use') {
        errorMessage = 'This email is already in use';
      } else if (error && error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address';
      } else if (error && error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak';
      }

      setSignupError(errorMessage);
      Alert.alert('Sign-Up Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoToLogin = () => {
    router.push('/auth/Login');
  };

  const { theme, isDarkMode } = useTheme();
  const styles = useThemedStyles((theme) => ({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    safeArea: {
      flex: 1,
      paddingTop: Platform.OS === 'android' ? 30 : 10,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      flexGrow: 1,
      paddingBottom: 30,
    },
    gradient: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      // Use a transparent overlay for both modes
    },
    headerContainer: {
      alignItems: 'center',
      marginTop: Platform.OS === 'ios' ? 60 : 60,
      marginBottom: 40,
    },
    logoContainer: {
      marginBottom: 20,
      shadowColor: theme.colors.shadow,
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
      color: theme.colors.text,
    },
    headerText: {
      fontSize: 28,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginBottom: 8,
    },
    subHeaderText: {
      fontSize: 16,
      color: theme.colors.textSecondary,
    },
    formContainer: {
      paddingHorizontal: 30,
    },
    inputLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 8,
      marginLeft: 5,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
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
      color: theme.colors.text,
      fontSize: 16,
    },
    passwordToggle: {
      padding: 8,
    },
    buttonContainer: {
      marginTop: 15,
      marginBottom: 25,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: theme.colors.shadowOpacity,
      shadowRadius: 5,
      elevation: 5,
    },
    signUpButton: {
      height: 55,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    signUpButtonText: {
      color: '#fff',
      fontSize: 18,
      fontWeight: 'bold',
    },
    signInContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: 20,
    },
    signInText: {
      color: theme.colors.textSecondary,
      fontSize: 15,
    },
    signInLink: {
      color: theme.colors.primary,
      fontSize: 15,
      fontWeight: 'bold',
    },
  }));

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
    >
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

      <LinearGradient
        colors={isDarkMode ? ['rgba(0,0,0,0.8)', 'rgba(0,0,0,0.6)'] : ['rgba(255,255,255,0.8)', 'rgba(255,255,255,0.6)']}
        style={styles.gradient}
      />

      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerContainer}>
            <View style={styles.logoContainer}>
              <LinearGradient
                colors={[theme.colors.primary, theme.colors.primaryDark]}
                start={[0, 0]}
                end={[1, 0]}
                style={styles.logoGradient}
              >
                <Text style={styles.logoText}>TC</Text>
              </LinearGradient>
            </View>
            <Text style={styles.headerText}>Create Account</Text>
            <Text style={styles.subHeaderText}>Sign up to get started</Text>
          </View>

          <View style={styles.formContainer}>
            {/* Name Input */}
            <Text style={styles.inputLabel}>Full Name</Text>
            <View style={[
              styles.inputContainer,
              nameError ? styles.inputError : null
            ]}>
              <Ionicons name="person-outline" size={22} color={theme.colors.textLight} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter your full name"
                placeholderTextColor={theme.colors.textLight}
                value={name}
                onChangeText={(text) => {
                  setLastName(text);
                  if (lastNameError) setLastNameError('');
                }}
                autoCapitalize="words"
                editable={!isLoading}
              />
            </View>
            {lastNameError ? <Text style={styles.errorText}>{lastNameError}</Text> : null}

            {/* Country Code and Phone Number */}
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={[styles.inputContainer, phoneError ? styles.inputError : null, { flex: 1.8, marginRight: 8 }]}> 
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 10 }}
                  onPress={() => setShowCountryDropdown(true)}
                >
                  <Text style={{ color: '#fff', fontSize: 16 }}>{countryOptions.find(c => c.code === countryCode)?.label || countryCode}</Text>
                  <Ionicons name="chevron-down" size={18} color="#fff" style={{ marginLeft: 4 }} />
                </TouchableOpacity>
                {/* Country dropdown modal */}
                <Modal
                  visible={showCountryDropdown}
                  transparent
                  animationType="fade"
                  onRequestClose={() => setShowCountryDropdown(false)}
                >
                  <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' }}>
                    <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 16, width: 250 }}>
                      {countryOptions.map(option => (
                        <TouchableOpacity
                          key={option.code}
                          style={{ paddingVertical: 10 }}
                          onPress={() => {
                            setCountryCode(option.code);
                            setShowCountryDropdown(false);
                          }}
                        >
                          <Text style={{ fontSize: 16 }}>{option.label} ({option.code})</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </Modal>
              </View>
              <View style={[styles.inputContainer, phoneError ? styles.inputError : null, { flex: 3 }]}> 
                <TextInput
                  style={styles.input}
                  placeholder="Phone Number"
                  placeholderTextColor={theme.dark ? theme.colors.textLight : '#000'}
                  value={phone}
                  onChangeText={(text) => {
                    setPhone(text);
                    if (phoneError) setPhoneError('');
                  }}
                  keyboardType="phone-pad"
                  editable={!isLoading}
                />
              </View>
            </View>
            {phoneError ? <Text style={styles.errorText}>{phoneError}</Text> : null}

            {/* Email Input */}
            <Text style={styles.inputLabel}>Email Address</Text>
            <View style={[
              styles.inputContainer,
              emailError ? styles.inputError : null
            ]}>
              <Ionicons name="mail-outline" size={22} color={theme.colors.textLight} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter your email address"
                placeholderTextColor={theme.colors.textLight}
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
            <Text style={styles.inputLabel}>Password</Text>
            <View style={[
              styles.inputContainer,
              passwordError ? styles.inputError : null
            ]}>
              <Ionicons name="lock-closed-outline" size={22} color={theme.colors.textLight} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                placeholderTextColor={theme.colors.textLight}
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
                  color={theme.colors.textLight}
                />
              </TouchableOpacity>
            </View>
            {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}

            {/* Confirm Password Input */}
            <Text style={styles.inputLabel}>Confirm Password</Text>
            <View style={[
              styles.inputContainer,
              confirmPasswordError ? styles.inputError : null
            ]}>
              <Ionicons name="lock-closed-outline" size={22} color={theme.colors.textLight} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Confirm your password"
                placeholderTextColor={theme.colors.textLight}
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  if (confirmPasswordError) setConfirmPasswordError('');
                }}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                editable={!isLoading}
              />
              <TouchableOpacity
                style={styles.passwordToggle}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={isLoading}
              >
                <Ionicons
                  name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                  size={22}
                  color={theme.colors.textLight}
                />
              </TouchableOpacity>
            </View>
            {confirmPasswordError ? <Text style={styles.errorText}>{confirmPasswordError}</Text> : null}

            {/* General signup error message */}
            {signupError ? <Text style={[styles.errorText, styles.generalError]}>{signupError}</Text> : null}

            {/* Sign Up Button */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleSignUp}
              disabled={isLoading}
              style={styles.buttonContainer}
            >
              <LinearGradient
                colors={[theme.colors.primary, theme.colors.primaryDark]}
                start={[0, 0]}
                end={[1, 0]}
                style={styles.signUpButton}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.signUpButtonText}>Create Account</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Login Link */}
          <View style={styles.signInContainer}>
            <Text style={styles.signInText}>Already have an account? </Text>
            <TouchableOpacity onPress={handleGoToLogin}>
              <Text style={styles.signInLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* OTP Method Selection Modal */}
      <Modal
        visible={showOtpMethodModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowOtpMethodModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 24, width: '80%', alignItems: 'center' }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 12, color: '#222' }}>Choose Verification Method</Text>
            <Text style={{ fontSize: 16, color: '#444', marginBottom: 24, textAlign: 'center' }}>
              Where should we send your verification code?
            </Text>
            <TouchableOpacity
              style={{ backgroundColor: '#3C9D4E', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 24, marginBottom: 16, width: '100%' }}
              onPress={handlePhoneVerification}
            >
              <Text style={{ color: '#fff', fontSize: 16, textAlign: 'center' }}>Send to Phone ({countryCode} {phone})</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ marginTop: 8 }}
              onPress={() => setShowOtpMethodModal(false)}
            >
              <Text style={{ color: '#888', fontSize: 15 }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Phone OTP Modal */}
      <Modal
        visible={showPhoneOtpModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPhoneOtpModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 24, width: '80%', alignItems: 'center' }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 12, color: '#222' }}>Enter OTP</Text>
            <Text style={{ fontSize: 16, color: '#444', marginBottom: 24, textAlign: 'center' }}>
              We sent a code to {countryCode} {phone}. Enter it below to verify your phone number.
            </Text>
            <TextInput
              style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, fontSize: 18, width: '80%', marginBottom: 12, textAlign: 'center' }}
              placeholder="Enter OTP"
              keyboardType="number-pad"
              value={otp}
              onChangeText={setOtp}
              editable={!isVerifying}
              maxLength={6}
            />
            {otpError ? <Text style={{ color: 'red', marginBottom: 8 }}>{otpError}</Text> : null}
            <TouchableOpacity
              style={{ backgroundColor: '#3C9D4E', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 24, marginBottom: 8, width: '100%' }}
              onPress={handleVerifyOtp}
              disabled={isVerifying}
            >
              <Text style={{ color: '#fff', fontSize: 16, textAlign: 'center' }}>{isVerifying ? 'Verifying...' : 'Verify'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ marginTop: 8 }}
              onPress={() => setShowPhoneOtpModal(false)}
            >
              <Text style={{ color: '#888', fontSize: 15 }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <FirebaseRecaptchaVerifierModal
        ref={recaptchaVerifier}
        firebaseConfig={firebaseConfig}
      />
    </KeyboardAvoidingView>
  );
};

export default SignUpScreen;