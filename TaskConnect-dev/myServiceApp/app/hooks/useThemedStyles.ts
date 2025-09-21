// app/hooks/useThemedStyles.ts

import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Theme } from '../constants/theme';

// Generic type for style creators
type StylesCreator<T> = (theme: Theme) => T;

/**
 * Custom hook to create styles that automatically adjust to the current theme
 * @param createStyles Function that takes a theme and returns StyleSheet styles
 * @returns Memoized styles that update when the theme changes
 */
export function useThemedStyles<T extends StyleSheet.NamedStyles<T>>(
  createStyles: StylesCreator<T>
): T {
  const { theme } = useTheme();
  
  // Memoize the styles to prevent unnecessary re-creation on each render
  return useMemo(() => createStyles(theme), [theme, createStyles]);
}

/**
 * Helper function to create themed styles more easily
 * @param createStyles Function that takes a theme and returns StyleSheet styles
 * @returns Function that creates StyleSheet styles
 */
export function createThemedStyles<T extends StyleSheet.NamedStyles<T>>(
  createStyles: StylesCreator<T>
): StylesCreator<T> {
  return (theme: Theme) => StyleSheet.create(createStyles(theme));
}