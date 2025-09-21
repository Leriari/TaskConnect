import React, { createContext, useState, useEffect, useContext } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../../firebase-config';
import { router } from 'expo-router';

// Create context
const AuthContext = createContext();

// Create provider
export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Subscribe to auth state changes
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    // Clean up subscription on unmount
    return () => unsubscribe();
  }, []);

  // Logout function
  const logout = async () => {
    try {
      await signOut(auth);
      router.replace('../auth/index'); // Redirect to login using Expo Router
    } catch (error) {

    }
  };

  // Get user profile data
  const getUserProfile = () => {
    if (!currentUser) return null;
    
    return {
      uid: currentUser.uid,
      email: currentUser.email,
      displayName: currentUser.displayName || 'User',
      photoURL: currentUser.photoURL,
      emailVerified: currentUser.emailVerified,
    };
  };

  // Value object to be provided by context
  const value = {
    currentUser,
    isAuthenticated: !!currentUser,
    loading,
    logout,
    getUserProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;