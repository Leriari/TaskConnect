// components/useColorScheme.ts

import { useContext } from 'react';
import { ThemeContext } from '../context/ThemeContext';

/**
 * Custom hook to get the current color scheme.
 * This replaces the default React Native useColorScheme
 * to work with our custom theme system.
 */
export function useColorScheme() {
  const { isDarkMode } = useContext(ThemeContext);
  return isDarkMode ? 'dark' : 'light';
}