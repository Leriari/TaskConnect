// app/(tabs)/home/utils/logout.ts

import { Alert } from 'react-native';
import { auth } from '@/firebase-config';
import { router } from 'expo-router';

export const handleLogout = async () => {
  try {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Yes, Logout", 
          onPress: async () => {
            await auth.signOut();
            router.replace('/');
            console.log('User logged out successfully');
          }
        }
      ]
    );
  } catch (error) {
    console.error('Error signing out:', error);
    Alert.alert('Error', 'Failed to log out. Please try again.');
  }
};