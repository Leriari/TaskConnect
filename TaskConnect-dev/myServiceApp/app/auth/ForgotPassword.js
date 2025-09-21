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
  Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { sendPasswordResetEmail } from 'firebase/auth'; 
import { auth } from '../../firebase-config';

const ForgotPasswordScreen = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [resetSent, setResetSent] = useState(false);
  
  const validateEmail = () => {
    if (!email.trim()) {
      setEmailError('Email is required');
      return false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError('Email format is invalid');
      return false;
    }
    
    setEmailError('');
    return true;
  };

  const handleResetPassword = async () => {
    if (!validateEmail()) return;
    
    setIsLoading(true);
    
    try {
      await sendPasswordResetEmail(auth, email);
      setResetSent(true);
    } catch (error) {
      // Handle specific Firebase auth errors
      let errorMessage = 'Failed to send reset email. Please try again.';
      
      if (error && error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email address';
      } else if (error && error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address';
      } else if (error && error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many requests. Please try again later';
      }
      
      Alert.alert('Reset Password Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoToLogin = () => {
    router.push('../auth/index');
  };

  const handleTryAgain = () => {
    setResetSent(false);
    setEmail('');
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
        <View style={styles.headerContainer}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={handleGoToLogin}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          
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
          
          <Text style={styles.headerText}>
            {resetSent ? 'Check Your Email' : 'Reset Password'}
          </Text>
          
          <Text style={styles.subHeaderText}>
            {resetSent 
              ? `We've sent instructions to ${email}`
              : 'Enter your email to get reset instructions'
            }
          </Text>
        </View>

        <View style={styles.formContainer}>
          {!resetSent ? (
            <>
              {/* Email Input */}
              <View style={[
                styles.inputContainer, 
                emailError ? styles.inputError : null
              ]}>
                <Ionicons name="mail-outline" size={22} color="rgba(255,255,255,0.7)" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Email Address"
                  placeholderTextColor="rgba(255,255,255,0.5)"
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

              {/* Reset Button */}
              <TouchableOpacity 
                activeOpacity={0.8}
                onPress={handleResetPassword}
                disabled={isLoading}
                style={styles.buttonContainer}
              >
                <LinearGradient
                  colors={['#5CBD6A', '#3C9D4E']}
                  start={[0, 0]}
                  end={[1, 0]}
                  style={styles.resetButton}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.resetButtonText}>Send Reset Link</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.successMessageContainer}>
                <Ionicons name="mail" size={60} color="#5CBD6A" style={styles.emailIcon} />
                <Text style={styles.successMessage}>
                  We've sent an email to:
                </Text>
                <Text style={styles.emailHighlight}>{email}</Text>
                <Text style={styles.instructionsText}>
                  Check your inbox and follow the instructions to reset your password.
                </Text>
              </View>
              
              {/* Back to Login Button */}
              <TouchableOpacity 
                activeOpacity={0.8}
                onPress={handleGoToLogin}
                style={styles.buttonContainer}
              >
                <LinearGradient
                  colors={['#5CBD6A', '#3C9D4E']}
                  start={[0, 0]}
                  end={[1, 0]}
                  style={styles.resetButton}
                >
                  <Text style={styles.resetButtonText}>Back to Login</Text>
                </LinearGradient>
              </TouchableOpacity>
              
              {/* Try Another Email */}
              <TouchableOpacity 
                style={styles.tryAgainButton}
                onPress={handleTryAgain}
              >
                <Text style={styles.tryAgainText}>Try Another Email</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111',
  },
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? 30 : 10,
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  headerContainer: {
    alignItems: 'center',
    marginTop: Platform.OS === 'ios' ? 40 : 40,
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  backButton: {
    position: 'absolute',
    left: 20,
    top: 0,
    padding: 10,
  },
  logoContainer: {
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
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
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  subHeaderText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  formContainer: {
    paddingHorizontal: 30,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 15,
  },
  inputError: {
    borderColor: '#ff6b6b',
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 12,
    marginBottom: 12,
    marginLeft: 5,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 55,
    color: '#fff',
    fontSize: 16,
  },
  buttonContainer: {
    marginTop: 15,
    marginBottom: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 5,
  },
  resetButton: {
    height: 55,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  successMessageContainer: {
    alignItems: 'center',
    marginBottom: 30,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 20,
  },
  emailIcon: {
    marginBottom: 15,
  },
  successMessage: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 10,
    textAlign: 'center',
  },
  emailHighlight: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  instructionsText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 20,
  },
  tryAgainButton: {
    alignItems: 'center',
    padding: 10,
  },
  tryAgainText: {
    color: '#5CBD6A',
    fontSize: 16,
  },
});

export default ForgotPasswordScreen;