import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { router, usePathname } from 'expo-router';
import { useAuth } from '../auth/AuthContext';

/**
 * AuthGuard component to protect routes that require authentication
 * Wrap protected screens with this component
 */
const AuthGuard = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const pathname = usePathname();
  
  useEffect(() => {
    // Skip redirect for auth routes
    const isAuthRoute = pathname?.startsWith('/auth');
    
    // If not loading and user is not authenticated and not on an auth route, redirect to login
    if (!loading && !isAuthenticated && !isAuthRoute) {
      router.replace('../auth/index');
    }
    
    // If authenticated and on an auth route, redirect to home
    if (!loading && isAuthenticated && isAuthRoute) {
      router.replace('/home');
    }
  }, [isAuthenticated, loading, pathname]);

  // Show loading indicator while checking authentication state
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5CBD6A" />
      </View>
    );
  }
  
  // If on auth route and not authenticated, or on protected route and authenticated,
  // render the children
  const isAuthRoute = pathname?.startsWith('/auth');
  if ((isAuthRoute && !isAuthenticated) || (!isAuthRoute && isAuthenticated)) {
    return children;
  }
  
  // Return empty view while redirecting
  return null;
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111',
  },
});

export default AuthGuard;