// app/(tabs)/home/screens/TwoFactorAuthScreen.tsx

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  Modal,
  Clipboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { auth, db } from '@/firebase-config';
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  getAuth
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, deleteField } from 'firebase/firestore';
import { useTheme } from '@/app/context/ThemeContext';
import { useThemedStyles, createThemedStyles } from '@/app/hooks/useThemedStyles';
import StatusBarSpace from '@/app/components/StatusBarSpace';
// Import the fixed TOTP service
import TOTPService from '../utils/TOTPService';
// Import QR code helper
import QRCodeHelper from '../utils/QrCodeHelper';

// Real Firebase service for 2FA management
const TwoFactorAuthService = {
  // Check if 2FA is enabled for the current user
  checkEnabled: async (userId: string) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        return !!userData.twoFactorAuth?.enabled;
      }
      return false;
    } catch (error) {
      console.error('Error checking 2FA status:', error);
      return false;
    }
  },
  //

  // Set up 2FA for a user
  setup: async (userId: string, email: string) => {
    try {
      // Generate a secret key (shorter key)
      const secret = TOTPService.generateSecret();

      // Generate QR code URI
      const totpUri = QRCodeHelper.generateTOTPUri('YourApp', email, secret);

      // Generate local QR code image
      const qrCodeUrl = await QRCodeHelper.generateQRCode(totpUri);

      // Generate recovery codes (shorter format)
      const recoveryCodes = TOTPService.generateRecoveryCodes();

      // Store setup data in Firestore (not enabled yet)
      await setDoc(doc(db, 'users', userId), {
        twoFactorAuth: {
          secret,
          recoveryCodes,
          enabled: false,
          setupPending: true,
          createdAt: new Date().toISOString()
        }
      }, { merge: true });

      return {
        secret,
        qrCodeUrl,
        recoveryCodes,
        totpUri
      };
    } catch (error) {
      console.error('Error setting up 2FA:', error);
      throw error;
    }
  },

  // Verify a TOTP code and enable 2FA if valid
  verifyAndEnable: async (userId: string, token: string) => {
    try {
      // Get the user's 2FA data
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) {
        throw new Error('User not found');
      }

      const userData = userDoc.data();
      const twoFactorData = userData.twoFactorAuth;

      if (!twoFactorData || !twoFactorData.secret) {
        throw new Error('2FA not set up');
      }

      // Verify the token
      const isValid = TOTPService.verifyTOTP(twoFactorData.secret, token);

      if (isValid) {
        // Enable 2FA
        await updateDoc(doc(db, 'users', userId), {
          'twoFactorAuth.enabled': true,
          'twoFactorAuth.setupPending': false,
          'twoFactorAuth.enabledAt': new Date().toISOString()
        });

        return true;
      }

      return false;
    } catch (error) {
      console.error('Error verifying and enabling 2FA:', error);
      throw error;
    }
  },

  // Disable 2FA for a user
  disable: async (userId: string) => {
    try {
      // Remove 2FA data from the user document
      await updateDoc(doc(db, 'users', userId), {
        twoFactorAuth: deleteField()
      });

      return true;
    } catch (error) {
      console.error('Error disabling 2FA:', error);
      throw error;
    }
  },

  // Get 2FA setup data for a user
  getSetupData: async (userId: string) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) {
        throw new Error('User not found');
      }

      const userData = userDoc.data();
      const twoFactorData = userData.twoFactorAuth;

      if (!twoFactorData) {
        return null;
      }

      // Re-create QR code URL
      const auth = getAuth();
      const user = auth.currentUser;
      let qrCodeUrl = '';
      let totpUri = '';

      if (user?.email && twoFactorData.secret) {
        totpUri = QRCodeHelper.generateTOTPUri('YourApp', user.email, twoFactorData.secret);
        qrCodeUrl = await QRCodeHelper.generateQRCode(totpUri);
      }

      return {
        secret: twoFactorData.secret,
        qrCodeUrl,
        totpUri,
        recoveryCodes: twoFactorData.recoveryCodes,
        enabled: twoFactorData.enabled,
        setupPending: twoFactorData.setupPending
      };
    } catch (error) {
      console.error('Error getting 2FA setup data:', error);
      throw error;
    }
  }
};

const TwoFactorAuthScreen = () => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createTwoFactorAuthStyles);

  // State variables
  const [step, setStep] = useState(0); // 0: intro, 1: setup, 2: verify, 3: recovery codes, 4: success
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [setupPending, setSetupPending] = useState(false);
  const [qrCodeUri, setQrCodeUri] = useState('');
  const [secret, setSecret] = useState('');
  const [totpUri, setTotpUri] = useState(''); // Store the raw TOTP URI
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationCodeError, setVerificationCodeError] = useState('');
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showVerificationDialog, setShowVerificationDialog] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  // References for OTP input fields
  const inputRefs = useRef<Array<TextInput | null>>([]);

  // Check if 2FA is already enabled
  useEffect(() => {
    checkTwoFactorStatus();
  }, []);

  const checkTwoFactorStatus = async () => {
    try {
      setIsLoading(true);

      const user = auth.currentUser;
      if (!user || !user.uid) {
        throw new Error('User not logged in');
      }

      // Check if 2FA is enabled
      const enabled = await TwoFactorAuthService.checkEnabled(user.uid);
      setIs2FAEnabled(enabled);

      // If 2FA is not enabled, check if setup is pending
      if (!enabled) {
        const setupData = await TwoFactorAuthService.getSetupData(user.uid);
        if (setupData && setupData.setupPending) {
          setSetupPending(true);
          setQrCodeUri(setupData.qrCodeUrl);
          setSecret(setupData.secret);
          setTotpUri(setupData.totpUri || '');
          setRecoveryCodes(setupData.recoveryCodes);
        }
      }
    } catch (error) {
      console.log('Error checking 2FA status:', error);
      Alert.alert('Error', 'Failed to check two-factor authentication status.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle going back
  const handleGoBack = () => {
    if (step > 0 && !is2FAEnabled) {
      // If in the middle of setup process, confirm before going back
      Alert.alert(
        'Cancel Setup',
        'Are you sure you want to cancel the two-factor authentication setup?',
        [
          { text: 'No', style: 'cancel' },
          { text: 'Yes', onPress: () => router.back() }
        ]
      );
    } else {
      router.back();
    }
  };

  // Initialize 2FA setup
  const startTwoFactorSetup = async () => {
    const user = auth.currentUser;
    if (!user || !user.email) {
      Alert.alert('Error', 'User information not available');
      return;
    }

    // If setup is pending, continue from where we left off
    if (setupPending) {
      setStep(1);
    } else {
      // Otherwise, start fresh with password verification
      setShowVerificationDialog(true);
    }
  };

  // Verify user password before proceeding
  const handlePasswordVerification = async () => {
    if (!password) {
      setPasswordError('Password is required');
      return;
    }

    setIsLoading(true);

    try {
      const user = auth.currentUser;
      if (!user || !user.email) {
        throw new Error('User not logged in');
      }

      // Create credential with the user's email and password
      const credential = EmailAuthProvider.credential(user.email, password);

      // Reauthenticate the user with Firebase
      await reauthenticateWithCredential(user, credential);

      // If verification successful, proceed with setup
      setShowVerificationDialog(false);
      setPassword('');

      // Set up 2FA for the user
      const setupData = await TwoFactorAuthService.setup(user.uid, user.email);

      // Store the setup data
      setQrCodeUri(setupData.qrCodeUrl);
      setSecret(setupData.secret);
      setTotpUri(setupData.totpUri || '');
      setRecoveryCodes(setupData.recoveryCodes);
      setSetupPending(true);

      // Move to setup step
      setStep(1);
    } catch (error: any) {
      console.log('Verification error:', error);
      if (error.code === 'auth/wrong-password') {
        setPasswordError('Incorrect password. Please try again.');
      } else {
        setPasswordError('Failed to verify identity. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Format inputted verification code
  const handleCodeInput = (index: number, text: string) => {
    if (text.length === 0) {
      // Handle backspace - clear current digit and focus previous input
      const newVerificationCode =
        verificationCode.substring(0, index) +
        ' ' +
        verificationCode.substring(index + 1);

      setVerificationCode(newVerificationCode.trim());

      if (index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
      return;
    }

    // Only allow numbers
    if (!/^\d+$/.test(text)) {
      return;
    }

    // Update verification code
    const newVerificationCode =
      verificationCode.substring(0, index) +
      text +
      verificationCode.substring(index + 1);

    setVerificationCode(newVerificationCode);

    // Move to next input if available
    if (index < 5 && text.length === 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle key press - for backspace
  const handleKeyPress = (index: number, e: any) => {
    if (e.nativeEvent.key === 'Backspace' && index > 0 && !verificationCode[index]) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Verify the entered OTP code
  const verifyOTPCode = async () => {
    if (verificationCode.length !== 6) {
      setVerificationCodeError('Please enter a 6-digit code');
      return;
    }

    setIsLoading(true);

    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not logged in');
      }

      // Verify the code and enable 2FA
      const isValid = await TwoFactorAuthService.verifyAndEnable(user.uid, verificationCode);

      if (isValid) {
        // Move to recovery codes step
        setStep(3);
      } else {
        setVerificationCodeError('Invalid verification code. Please try again.');
      }
    } catch (error) {
      console.log('Error verifying OTP:', error);
      setVerificationCodeError('Failed to verify code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Complete the 2FA setup
  const completeSetup = async () => {
    setIsLoading(true);

    try {
      // At this point, 2FA is already enabled
      setIs2FAEnabled(true);
      setStep(4);
    } catch (error) {
      console.log('Error enabling 2FA:', error);
      Alert.alert('Error', 'Failed to complete two-factor authentication setup.');
    } finally {
      setIsLoading(false);
    }
  };

  // Copy recovery codes to clipboard
  const copyRecoveryCodes = () => {
    try {
      Clipboard.setString(recoveryCodes.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (error) {
      console.log('Error copying to clipboard:', error);
      Alert.alert('Error', 'Failed to copy recovery codes to clipboard.');
    }
  };

  // Copy secret key to clipboard
  const copySecret = () => {
    try {
      // Copy without spaces
      Clipboard.setString(secret.replace(/\s+/g, ''));
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (error) {
      console.log('Error copying to clipboard:', error);
      Alert.alert('Error', 'Failed to copy secret key to clipboard.');
    }
  };

  // Disable 2FA
  const handleDisable2FA = () => {
    Alert.alert(
      'Disable Two-Factor Authentication',
      'Are you sure you want to disable two-factor authentication? This will make your account less secure.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Disable', style: 'destructive', onPress: confirmDisable2FA }
      ]
    );
  };

  // Confirm disabling 2FA
  const confirmDisable2FA = async () => {
    setIsLoading(true);

    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not logged in');
      }

      // Disable 2FA
      const success = await TwoFactorAuthService.disable(user.uid);

      if (success) {
        setIs2FAEnabled(false);
        setSetupPending(false);
        setStep(0);
        Alert.alert('Success', 'Two-factor authentication has been disabled.');
      } else {
        throw new Error('Failed to disable two-factor authentication');
      }
    } catch (error) {
      console.log('Error disabling 2FA:', error);
      Alert.alert('Error', 'Failed to disable two-factor authentication. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Reset the verification process
  const resetVerification = () => {
    setVerificationCode('');
    setVerificationCodeError('');
    // Focus first input
    inputRefs.current[0]?.focus();
  };

  // Format secret key for display (split into groups of 4)
  const formatSecret = (secret: string) => {
    // First remove any existing spaces
    const cleanSecret = secret.replace(/\s+/g, '');

    const groups = [];
    for (let i = 0; i < cleanSecret.length; i += 4) {
      groups.push(cleanSecret.substring(i, i + 4));
    }
    return groups.join(' ');
  };

  // Render intro screen
  const renderIntroScreen = () => (
    <View style={styles.contentContainer}>
      <View style={styles.iconContainer}>
        <Ionicons name="shield-checkmark" size={60} color={theme.colors.primary} />
      </View>

      <Text style={styles.title}>Two-Factor Authentication</Text>

      <Text style={styles.description}>
        Add an extra layer of security to your account by enabling two-factor authentication.
        When enabled, you'll need your password and a verification code from your authentication app to sign in.
      </Text>

      <View style={styles.securityFeature}>
        <Ionicons name="shield-outline" size={24} color={theme.colors.success} style={styles.featureIcon} />
        <View style={styles.featureContent}>
          <Text style={styles.featureTitle}>Enhanced Security</Text>
          <Text style={styles.featureDescription}>
            Protect your account with both your password and your phone
          </Text>
        </View>
      </View>

      <View style={styles.securityFeature}>
        <Ionicons name="phone-portrait-outline" size={24} color={theme.colors.success} style={styles.featureIcon} />
        <View style={styles.featureContent}>
          <Text style={styles.featureTitle}>Authentication App</Text>
          <Text style={styles.featureDescription}>
            Use apps like Google Authenticator or Authy to generate verification codes
          </Text>
        </View>
      </View>

      <View style={styles.securityFeature}>
        <Ionicons name="key-outline" size={24} color={theme.colors.success} style={styles.featureIcon} />
        <View style={styles.featureContent}>
          <Text style={styles.featureTitle}>Recovery Codes</Text>
          <Text style={styles.featureDescription}>
            Get backup codes to use if you can't access your authentication app
          </Text>
        </View>
      </View>

      <View style={styles.setupContainer}>
        {is2FAEnabled ? (
          <>
            <Text style={styles.statusText}>
              Two-factor authentication is currently <Text style={styles.enabledText}>enabled</Text>
            </Text>
            <TouchableOpacity
              style={styles.disableButton}
              onPress={handleDisable2FA}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.disableButtonText}>Disable 2FA</Text>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.statusText}>
              Two-factor authentication is currently <Text style={styles.disabledText}>disabled</Text>
              {setupPending && ' (setup pending)'}
            </Text>
            <TouchableOpacity
              style={styles.setupButton}
              onPress={startTwoFactorSetup}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.setupButtonText}>
                  {setupPending ? 'Continue Setup' : 'Set Up 2FA'}
                </Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>

      <View style={styles.securityTipContainer}>
        <Ionicons
          name="information-circle-outline"
          size={22}
          color={theme.colors.primary}
          style={styles.tipIcon}
        />
        <Text style={styles.tipText}>
          If you lose access to your authentication app and recovery codes,
          you may be locked out of your account permanently.
        </Text>
      </View>
    </View>
  );

  // Render setup screen - QR Code
  const renderSetupScreen = () => (
    <ScrollView
      style={styles.scrollContent}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.stepTitle}>Step 1: Scan QR Code</Text>

      <Text style={styles.stepDescription}>
        Install an authenticator app like Google Authenticator or Authy on your phone,
        then scan this QR code to add your account.
      </Text>

      <View style={styles.qrContainer}>
        {qrCodeUri ? (
          <Image
            source={{ uri: qrCodeUri }}
            style={styles.qrCode}
            resizeMode="contain"
          />
        ) : (
          <View style={styles.qrPlaceholder}>
            <Text style={styles.qrPlaceholderText}>Unable to generate QR code</Text>
          </View>
        )}
      </View>

      <View style={styles.orDivider}>
        <View style={styles.dividerLine} />
        <Text style={styles.orText}>OR</Text>
        <View style={styles.dividerLine} />
      </View>

      <Text style={styles.setupInstructions}>
        Enter this code in your authenticator app:
      </Text>

      <View style={styles.secretContainer}>
        <Text style={styles.setupCode}>{formatSecret(secret)}</Text>
        <TouchableOpacity
          style={styles.copySecretButton}
          onPress={copySecret}
        >
          <Ionicons name="copy-outline" size={18} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <Text style={styles.manualInstructions}>
        Do NOT include spaces when entering the code manually.
      </Text>

      <TouchableOpacity
        style={styles.nextButton}
        onPress={() => setStep(2)}
      >
        <Text style={styles.nextButtonText}>Next Step</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  // Render verification screen
  const renderVerificationScreen = () => (
    <View style={styles.contentContainer}>
      <Text style={styles.stepTitle}>Step 2: Verify Setup</Text>

      <Text style={styles.stepDescription}>
        Enter the 6-digit verification code from your authenticator app to confirm setup
      </Text>

      <View style={styles.otpContainer}>
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <TextInput
            key={index}
            ref={(ref) => (inputRefs.current[index] = ref)}
            style={styles.otpInput}
            maxLength={1}
            keyboardType="number-pad"
            value={verificationCode[index] || ''}
            onChangeText={(text) => handleCodeInput(index, text)}
            onKeyPress={(e) => handleKeyPress(index, e)}
          />
        ))}
      </View>

      {verificationCodeError ? (
        <Text style={styles.verificationError}>{verificationCodeError}</Text>
      ) : null}

      <TouchableOpacity
        style={styles.resendButton}
        onPress={resetVerification}
      >
        <Text style={styles.resendButtonText}>Reset</Text>
      </TouchableOpacity>

      <View style={styles.verificationButtonsContainer}>
        <TouchableOpacity
          style={styles.backStepButton}
          onPress={() => setStep(1)}
        >
          <Text style={styles.backStepButtonText}>Back</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.verifyButton}
          onPress={verifyOTPCode}
          disabled={isLoading || verificationCode.length !== 6}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.verifyButtonText}>Verify</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  // Render recovery codes screen
  const renderRecoveryCodesScreen = () => (
    <ScrollView
      style={styles.scrollContent}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.stepTitle}>Step 3: Save Recovery Codes</Text>

      <Text style={styles.stepDescription}>
        Save these recovery codes in a secure place. You can use each code once to sign in if you don't have access to your authenticator app.
      </Text>

      <View style={styles.recoveryCodesContainer}>
        {recoveryCodes.map((code, index) => (
          <Text key={index} style={styles.recoveryCode}>{code}</Text>
        ))}
      </View>

      <TouchableOpacity
        style={styles.copyButton}
        onPress={copyRecoveryCodes}
      >
        <Ionicons name="copy-outline" size={20} color={theme.colors.primary} />
        <Text style={styles.copyButtonText}>
          {copied ? 'Copied!' : 'Copy Recovery Codes'}
        </Text>
      </TouchableOpacity>

      <View style={styles.warningContainer}>
        <Ionicons name="warning-outline" size={20} color={theme.colors.warning} />
        <Text style={styles.warningText}>
          Without these recovery codes, you'll lose access to your account if you lose your device.
        </Text>
      </View>

      <TouchableOpacity
        style={styles.completeButton}
        onPress={completeSetup}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.completeButtonText}>Complete Setup</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );

  // Render success screen
  const renderSuccessScreen = () => (
    <View style={[styles.contentContainer, styles.successContainer]}>
      <View style={styles.successIconContainer}>
        <Ionicons name="checkmark-circle" size={80} color={theme.colors.success} />
      </View>

      <Text style={styles.successTitle}>Setup Complete!</Text>

      <Text style={styles.successDescription}>
        Two-factor authentication has been successfully enabled for your account.
        Your account is now more secure!
      </Text>

      <TouchableOpacity
        style={styles.doneButton}
        onPress={handleGoBack}
      >
        <Text style={styles.doneButtonText}>Done</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>


      {/* Main content - different views based on current step */}
      {isLoading && step === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      ) : (
        <>
          {step === 0 && renderIntroScreen()}
          {step === 1 && renderSetupScreen()}
          {step === 2 && renderVerificationScreen()}
          {step === 3 && renderRecoveryCodesScreen()}
          {step === 4 && renderSuccessScreen()}
        </>
      )}

      {/* Password Verification Modal */}
      <Modal
        visible={showVerificationDialog}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowVerificationDialog(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Verify Your Identity</Text>
              <Text style={styles.modalSubtitle}>
                Please enter your password to enable two-factor authentication
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
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (passwordError) setPasswordError('');
                  }}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.visibilityIcon}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={22}
                    color={theme.colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>

              {passwordError ? (
                <Text style={styles.errorText}>{passwordError}</Text>
              ) : null}
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowVerificationDialog(false)}
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
    </View>
  );
};

const createTwoFactorAuthStyles = createThemedStyles(theme => ({
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  scrollContent: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: 24,
    textAlign: 'center',
  },
  securityFeature: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    backgroundColor: theme.colors.card,
    padding: 16,
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: theme.dark ? 0.3 : 0.1,
        shadowRadius: 3.84,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  featureIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  setupContainer: {
    marginTop: 8,
    marginBottom: 24,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    marginBottom: 16,
  },
  enabledText: {
    color: theme.colors.success,
    fontWeight: '600',
  },
  disabledText: {
    color: theme.colors.warning,
    fontWeight: '600',
  },
  setupButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    width: '100%',
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
  setupButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  disableButton: {
    backgroundColor: theme.colors.error || '#FF6B6B',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    width: '100%',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.error || '#FF6B6B',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  disableButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  securityTipContainer: {
    flexDirection: 'row',
    backgroundColor: `${theme.colors.primary}10`,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    alignItems: 'flex-start',
    marginBottom: 16,
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
  // Step styles
  stepTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 12,
  },
  stepDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: 24,
  },
  // QR code styles
  qrContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    alignSelf: 'center',
    width: 240,
    height: 240,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  qrCode: {
    width: 200,
    height: 200,
  },
  qrPlaceholder: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f0f0',
  },
  qrPlaceholderText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    padding: 8,
  },
  orDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
  },
  orText: {
    paddingHorizontal: 16,
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
  setupInstructions: {
    textAlign: 'center',
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  secretContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  setupCode: {
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    letterSpacing: 1,
  },
  copySecretButton: {
    marginLeft: 8,
    padding: 6,
  },
  manualInstructions: {
    textAlign: 'center',
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 32,
    fontStyle: 'italic',
  },
  nextButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
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
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // OTP input styles
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    marginTop: 8,
  },
  otpInput: {
    width: 45,
    height: 55,
    borderWidth: 1,
    borderColor: theme.dark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text,
    backgroundColor: theme.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
  },
  verificationError: {
    color: theme.colors.error || '#FF6B6B',
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  resendButton: {
    alignSelf: 'center',
    padding: 8,
    marginBottom: 24,
  },
  resendButtonText: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  verificationButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  backStepButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    alignItems: 'center',
    marginRight: 8,
  },
  backStepButtonText: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  verifyButton: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginLeft: 8,
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
  verifyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // Recovery codes styles
  recoveryCodesContainer: {
    backgroundColor: theme.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  recoveryCode: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 16,
    color: theme.colors.text,
    marginBottom: 8,
    textAlign: 'center',
    fontWeight: '500',
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${theme.colors.primary}20`,
    borderRadius: 8,
    paddingVertical: 12,
    marginBottom: 24,
  },
  copyButtonText: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    backgroundColor: `${theme.colors.warning}20`,
    borderRadius: 8,
    marginBottom: 24,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.text,
    marginLeft: 8,
    lineHeight: 18,
  },
  completeButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    paddingVertical: 14,
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
  completeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // Success screen styles
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successIconContainer: {
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  successDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: 32,
    textAlign: 'center',
  },
  doneButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    paddingHorizontal: 40,
    paddingVertical: 12,
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
  doneButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
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
  visibilityIcon: {
    padding: 8,
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

}));

export default TwoFactorAuthScreen;