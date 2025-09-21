import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  TextInput,
  StatusBar,
  Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../auth/AuthContext';
import { updateProfile, updateEmail, sendEmailVerification, updatePassword } from 'firebase/auth';
import { auth } from '../../firebase-config';

const ProfileScreen = () => {
  const { currentUser, getUserProfile, logout } = useAuth();
  const userProfile = getUserProfile();
  
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(userProfile?.displayName || '');
  const [email, setEmail] = useState(userProfile?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [isUpdating, setIsUpdating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [newPasswordError, setNewPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');

  const toggleEditMode = () => {
    if (isEditing) {
      // Reset form values when canceling
      setName(userProfile?.displayName || '');
      setEmail(userProfile?.email || '');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      // Clear errors
      clearErrors();
    }
    
    setIsEditing(!isEditing);
  };
  
  const clearErrors = () => {
    setNameError('');
    setEmailError('');
    setPasswordError('');
    setNewPasswordError('');
    setConfirmPasswordError('');
  };
  
  const validateForm = () => {
    let isValid = true;
    clearErrors();
    
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
    
    // Only validate password fields if they are filled
    if (newPassword || confirmPassword) {
      // Validate current password if changing password
      if (!currentPassword) {
        setPasswordError('Current password is required to change password');
        isValid = false;
      }
      
      // Validate new password
      if (newPassword && newPassword.length < 6) {
        setNewPasswordError('Password must be at least 6 characters');
        isValid = false;
      }
      
      // Validate confirmation
      if (newPassword !== confirmPassword) {
        setConfirmPasswordError('Passwords do not match');
        isValid = false;
      }
    }
    
    return isValid;
  };
  
  const handleUpdateProfile = async () => {
    if (!validateForm()) return;
    
    setIsUpdating(true);
    
    try {
      const updates = [];
      
      // Update displayName if changed
      if (name !== userProfile?.displayName) {
        updates.push(updateProfile(auth.currentUser, { displayName: name })
          .then(() => console.log('Display name updated')));
      }
      
      // Update email if changed
      if (email !== userProfile?.email) {
        updates.push(updateEmail(auth.currentUser, email)
          .then(() => {
            console.log('Email updated');
            return sendEmailVerification(auth.currentUser);
          })
          .then(() => console.log('Verification email sent')));
      }
      
      // Update password if provided
      if (newPassword && currentPassword) {
        // Note: Changing password in Firebase requires reauthentication
        // For simplicity in this demo, we're showing this alert
        Alert.alert(
          'Password Update', 
          'For security reasons, changing your password requires recent authentication. Please sign out and sign back in to change your password.',
          [{ text: 'OK' }]
        );
      }
      
      // Wait for all updates to complete
      await Promise.all(updates);
      
      Alert.alert('Success', 'Your profile has been updated');
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      
      let errorMessage = 'Failed to update profile';
      
      if (error.code === 'auth/requires-recent-login') {
        errorMessage = 'This operation requires recent authentication. Please sign out and sign back in.';
      } else if (error.code === 'auth/email-already-in-use') {
        setEmailError('This email is already in use');
        errorMessage = 'The email address is already in use';
      } else if (error.code === 'auth/invalid-email') {
        setEmailError('Invalid email format');
        errorMessage = 'The email address format is invalid';
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setIsUpdating(false);
    }
  };
  
  const handleSendVerificationEmail = async () => {
    try {
      await sendEmailVerification(auth.currentUser);
      Alert.alert('Email Sent', 'Verification email has been sent to your email address');
    } catch (error) {
      console.error('Error sending verification email:', error);
      Alert.alert('Error', 'Failed to send verification email. Please try again later.');
    }
  };
  
  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          onPress: logout,
          style: 'destructive',
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <LinearGradient
        colors={['rgba(0,0,0,0.8)', 'rgba(0,0,0,0.6)']}
        style={styles.gradient}
      />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
        
        <TouchableOpacity 
          style={styles.editButton}
          onPress={toggleEditMode}
          disabled={isUpdating}
        >
          <Text style={styles.editButtonText}>
            {isEditing ? 'Cancel' : 'Edit'}
          </Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.scrollContent}>
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            {userProfile?.photoURL ? (
              <Image 
                source={{ uri: userProfile.photoURL }} 
                style={styles.avatar} 
                resizeMode="cover"
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>
                  {name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </View>
          
          <View style={styles.profileInfo}>
            {isEditing ? (
              <>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Name</Text>
                  <TextInput
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                    placeholder="Enter your name"
                    placeholderTextColor="rgba(255,255,255,0.5)"
                    editable={!isUpdating}
                  />
                  {nameError ? <Text style={styles.errorText}>{nameError}</Text> : null}
                </View>
                
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Email</Text>
                  <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="Enter your email"
                    placeholderTextColor="rgba(255,255,255,0.5)"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    editable={!isUpdating}
                  />
                  {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
                </View>
                
                <View style={styles.passwordSection}>
                  <Text style={styles.sectionTitle}>Change Password</Text>
                  
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Current Password</Text>
                    <View style={styles.passwordInputContainer}>
                      <TextInput
                        style={styles.passwordInput}
                        value={currentPassword}
                        onChangeText={setCurrentPassword}
                        placeholder="Enter current password"
                        placeholderTextColor="rgba(255,255,255,0.5)"
                        secureTextEntry={!showPassword}
                        autoCapitalize="none"
                        editable={!isUpdating}
                      />
                      <TouchableOpacity 
                        onPress={() => setShowPassword(!showPassword)}
                        disabled={isUpdating}
                      >
                        <Ionicons 
                          name={showPassword ? "eye-off-outline" : "eye-outline"} 
                          size={20} 
                          color="rgba(255,255,255,0.7)" 
                        />
                      </TouchableOpacity>
                    </View>
                    {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
                  </View>
                  
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>New Password</Text>
                    <View style={styles.passwordInputContainer}>
                      <TextInput
                        style={styles.passwordInput}
                        value={newPassword}
                        onChangeText={setNewPassword}
                        placeholder="Enter new password"
                        placeholderTextColor="rgba(255,255,255,0.5)"
                        secureTextEntry={!showNewPassword}
                        autoCapitalize="none"
                        editable={!isUpdating}
                      />
                      <TouchableOpacity 
                        onPress={() => setShowNewPassword(!showNewPassword)}
                        disabled={isUpdating}
                      >
                        <Ionicons 
                          name={showNewPassword ? "eye-off-outline" : "eye-outline"} 
                          size={20} 
                          color="rgba(255,255,255,0.7)" 
                        />
                      </TouchableOpacity>
                    </View>
                    {newPasswordError ? <Text style={styles.errorText}>{newPasswordError}</Text> : null}
                  </View>
                  
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Confirm New Password</Text>
                    <View style={styles.passwordInputContainer}>
                      <TextInput
                        style={styles.passwordInput}
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        placeholder="Confirm new password"
                        placeholderTextColor="rgba(255,255,255,0.5)"
                        secureTextEntry={!showConfirmPassword}
                        autoCapitalize="none"
                        editable={!isUpdating}
                      />
                      <TouchableOpacity 
                        onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                        disabled={isUpdating}
                      >
                        <Ionicons 
                          name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} 
                          size={20} 
                          color="rgba(255,255,255,0.7)" 
                        />
                      </TouchableOpacity>
                    </View>
                    {confirmPasswordError ? <Text style={styles.errorText}>{confirmPasswordError}</Text> : null}
                  </View>
                </View>
                
                <TouchableOpacity 
                  style={styles.updateButton}
                  onPress={handleUpdateProfile}
                  disabled={isUpdating}
                >
                  <LinearGradient
                    colors={['#5CBD6A', '#3C9D4E']}
                    start={[0, 0]}
                    end={[1, 0]}
                    style={styles.updateButtonGradient}
                  >
                    {isUpdating ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.updateButtonText}>Save Changes</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.userName}>{userProfile?.displayName || 'User'}</Text>
                <Text style={styles.userEmail}>{userProfile?.email}</Text>
                
                <View style={styles.verificationContainer}>
                  {userProfile?.emailVerified ? (
                    <View style={styles.verifiedBadge}>
                      <Ionicons name="checkmark-circle" size={18} color="#5CBD6A" />
                      <Text style={styles.verifiedText}>Email Verified</Text>
                    </View>
                  ) : (
                    <View style={styles.verificationActions}>
                      <Text style={styles.unverifiedText}>Email not verified</Text>
                      <TouchableOpacity onPress={handleSendVerificationEmail}>
                        <Text style={styles.verifyLinkText}>Send verification email</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
                
                <View style={styles.accountInfoSection}>
                  <Text style={styles.sectionTitle}>Account Information</Text>
                  
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>User ID</Text>
                    <Text style={styles.infoValue}>{userProfile?.uid}</Text>
                  </View>
                  
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Provider</Text>
                    <Text style={styles.infoValue}>
                      {userProfile?.providerId || 'Email/Password'}
                    </Text>
                  </View>
                  
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Verified</Text>
                    <Text style={[
                      styles.infoValue, 
                      userProfile?.emailVerified ? styles.verifiedValue : styles.unverifiedValue
                    ]}>
                      {userProfile?.emailVerified ? 'Yes' : 'No'}
                    </Text>
                  </View>
                </View>
              </>
            )}
          </View>
        </View>
      </ScrollView>
      
      <TouchableOpacity 
        style={styles.logoutButton}
        onPress={handleLogout}
      >
        <LinearGradient
          colors={['#ff5252', '#d32f2f']}
          start={[0, 0]}
          end={[1, 0]}
          style={styles.logoutButtonGradient}
        >
          <Ionicons name="log-out-outline" size={22} color="#fff" />
          <Text style={styles.logoutButtonText}>Sign Out</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111',
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  editButton: {
    position: 'absolute',
    right: 20,
    top: Platform.OS === 'ios' ? 60 : 40,
  },
  editButtonText: {
    fontSize: 16,
    color: '#5CBD6A',
    fontWeight: '600',
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  profileSection: {
    marginTop: 20,
  },
  avatarContainer: {
    alignSelf: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#5CBD6A',
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(92, 189, 106, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#5CBD6A',
  },
  avatarInitial: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#5CBD6A',
  },
  profileInfo: {
    marginTop: 10,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 5,
  },
  userEmail: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginBottom: 15,
  },
  verificationContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(92, 189, 106, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  verifiedText: {
    color: '#5CBD6A',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 5,
  },
  verificationActions: {
    alignItems: 'center',
  },
  unverifiedText: {
    color: '#ff6b6b',
    fontSize: 14,
    marginBottom: 5,
  },
  verifyLinkText: {
    color: '#5CBD6A',
    fontSize: 14,
    fontWeight: '500',
  },
  accountInfoSection: {
    marginTop: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  infoLabel: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
  },
  infoValue: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  verifiedValue: {
    color: '#5CBD6A',
  },
  unverifiedValue: {
    color: '#ff6b6b',
  },
  inputContainer: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 15,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 16,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 12,
    marginTop: 5,
  },
  passwordSection: {
    marginTop: 20,
    marginBottom: 15,
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 15,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 16,
  },
  updateButton: {
    marginTop: 10,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 5,
  },
  updateButtonGradient: {
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  updateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  logoutButton: {
    margin: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  logoutButtonGradient: {
    flexDirection: 'row',
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default ProfileScreen;