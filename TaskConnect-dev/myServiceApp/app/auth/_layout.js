import React from 'react';
import { Stack } from 'expo-router';
import { AuthProvider } from '../auth/AuthContext';
import AuthGuard from '../auth/AddGuard';

// Main layout component using Expo Router
export default function AppLayout() {
  return (
    <AuthProvider>
      <AuthGuard>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen
            name="index"
            redirect={true}
          />
          <Stack.Screen
            name="../home/index"
            options={{
              title: 'Home',
            }}
          />
          <Stack.Screen
            name="../auth/index"
            options={{
              title: 'Login',
            }}
          />
          <Stack.Screen
            name="../auth/signUp"
            options={{
              title: 'Sign Up',
            }}
          />
          <Stack.Screen
            name="../auth/ForgotPassword"
            options={{
              title: 'Forgot Password',
            }}
          />
          <Stack.Screen
            name="../profile/index"
            options={{
              title: 'Profile',
            }}
          />
        </Stack>
      </AuthGuard>
    </AuthProvider>
  );
}