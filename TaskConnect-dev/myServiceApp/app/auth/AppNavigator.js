import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Auth Screens
import SignUp from '../auth/signUp';
import LoginScreen from './Login';
import ForgotPassword from '../auth/ForgotPassword';

// App Screens (you'll need to create these)
import HomeScreen from '../home/screens/HomeScreenContent'; // Example, create as needed

// Auth Context
import { useAuth, AuthProvider } from '../auth/AuthContext';

const Stack = createNativeStackNavigator();

// Auth Navigator
const AuthNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="SignUp" component={SignUp} />
      <Stack.Screen name="ForgotPassword" component={ForgotPassword} />
    </Stack.Navigator>
  );
};

// App Navigator (for authenticated users)
const AppNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} />
      {/* Add other app screens here */}
    </Stack.Navigator>
  );
};

// Root Navigator
const RootNavigator = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    // You could return a loading screen here
    return null;
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
};

// Wrap the Root Navigator with AuthProvider
export const AppWithAuth = () => {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
};

export default AppWithAuth;