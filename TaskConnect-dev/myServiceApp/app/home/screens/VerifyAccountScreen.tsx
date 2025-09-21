import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { auth } from '../../../firebase-config';
import { router } from 'expo-router';

const VerifyAccountScreen = () => {
  const [checking, setChecking] = useState(false);
  const user = auth.currentUser;

  if (!user) {
    // If no user, redirect to login or show loading
    router.replace('/auth/Login');
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#5CBD6A" />
      </View>
    );
  }

  const handleCheckVerification = async () => {
    setChecking(true);
    try {
      await user.reload();
      if (user.emailVerified) {
        router.replace('/home');
      } else {
        Alert.alert('Not Verified', 'Your account is not verified yet. Please check your email or phone for the verification code.');
      }
    } catch (e) {
      Alert.alert('Error', 'Could not check verification status.');
    }
    setChecking(false);
  };

  const handleLogout = async () => {
    await auth.signOut();
    router.replace('/auth/Login');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Verify Your Account</Text>
      <Text style={styles.text}>
        Please verify your email or phone number to continue. Check your inbox or SMS for a verification link or code.
      </Text>
      <TouchableOpacity style={styles.button} onPress={handleCheckVerification} disabled={checking}>
        {checking ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>I've Verified</Text>}
      </TouchableOpacity>
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#222',
  },
  text: {
    fontSize: 16,
    color: '#444',
    textAlign: 'center',
    marginBottom: 32,
  },
  button: {
    backgroundColor: '#5CBD6A',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginBottom: 16,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  logoutButton: {
    marginTop: 8,
  },
  logoutText: {
    color: '#888',
    fontSize: 15,
  },
});

export default VerifyAccountScreen; 