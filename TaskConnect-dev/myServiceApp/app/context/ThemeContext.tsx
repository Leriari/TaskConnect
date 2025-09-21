// app/context/ThemeContext.tsx

import React, { createContext, useState, useContext, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightTheme, darkTheme, Theme } from '../constants/theme';

type ThemeContextType = {
  theme: Theme;
  isDarkMode: boolean;
  toggleTheme: () => void;
  setDarkMode: (isDark: boolean) => void;
};

// Create a context with a default value
// Export the ThemeContext so it can be imported elsewhere
export const ThemeContext = createContext<ThemeContextType>({
  theme: lightTheme,
  isDarkMode: false,
  toggleTheme: () => {},
  setDarkMode: () => {},
});

// Storage key
const THEME_PREFERENCE_KEY = '@theme_preference';

// Provider component that wraps the app
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Get the device color scheme
  const deviceColorScheme = useColorScheme();
  
  // State to track the current theme mode
  const [isDarkMode, setIsDarkMode] = useState<boolean>(deviceColorScheme === 'dark');

  // Load saved theme preference on initial render
  useEffect(() => {
    const loadThemePreference = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem(THEME_PREFERENCE_KEY);
        
        // If user has a saved preference, use it
        if (savedTheme !== null) {
          setIsDarkMode(savedTheme === 'dark');
        } else {
          // Otherwise use the device preference
          setIsDarkMode(deviceColorScheme === 'dark');
        }
      } catch (error) {
        console.error('Failed to load theme preference:', error);
      }
    };

    loadThemePreference();
  }, [deviceColorScheme]);

  // Update storage when theme changes
  useEffect(() => {
    const saveThemePreference = async () => {
      try {
        await AsyncStorage.setItem(THEME_PREFERENCE_KEY, isDarkMode ? 'dark' : 'light');
      } catch (error) {
        console.error('Failed to save theme preference:', error);
      }
    };

    saveThemePreference();
  }, [isDarkMode]);

  // Toggle between dark and light mode
  const toggleTheme = () => {
    setIsDarkMode(prevMode => !prevMode);
  };

  // Set specific theme mode
  const setDarkMode = (isDark: boolean) => {
    setIsDarkMode(isDark);
  };

  // Get the current theme based on mode
  const theme = isDarkMode ? darkTheme : lightTheme;

  // Provide the theme context to children
  return (
    <ThemeContext.Provider value={{ theme, isDarkMode, toggleTheme, setDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook to use the theme context
export const useTheme = () => useContext(ThemeContext);