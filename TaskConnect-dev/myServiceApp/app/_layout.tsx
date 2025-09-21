import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { useColorScheme as useRNColorScheme } from 'react-native';
import { StatusBar } from 'expo-status-bar';

// Import our custom theme provider
import { ThemeProvider, useTheme } from '@/app/context/ThemeContext';
import { AuthProvider } from '../app/auth/AuthContext';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  // Wrap RootLayoutNav with our ThemeProvider and AuthProvider
  return (
    <AuthProvider>
      <ThemeProvider>
        <RootLayoutNav />
      </ThemeProvider>
    </AuthProvider>
  );
}

function RootLayoutNav() {
  // Use our custom theme hook
  const { isDarkMode } = useTheme();

  // Pass the theme value to React Navigation's ThemeProvider
  return (
    <NavigationThemeProvider value={isDarkMode ? DarkTheme : DefaultTheme}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="home" options={{ headerShown: false }} />
        <Stack.Screen name="booking" options={{ headerShown: false }} />
        <Stack.Screen name="bookingSummary" options={{ headerShown: false }} />
        <Stack.Screen name="home/screens/ChatRoomScreen" options={{ headerShown: false }} />
        <Stack.Screen name="home/screens/CustomerTaskerProfileScreen" options={{ headerShown: false }} />
        <Stack.Screen
          name="modal"
          options={{
            presentation: 'modal',
            // Additional option to ensure modal is properly styled
            headerShown: false, // Hide the header as your modal has its own close button
          }}
        />
        <Stack.Screen
          name="auth"
          options={{
            headerShown: false, // Hide the header for auth screens
          }}
        />
      </Stack>
    </NavigationThemeProvider>
  );
}