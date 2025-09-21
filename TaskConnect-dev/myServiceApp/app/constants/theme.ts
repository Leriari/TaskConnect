// app/constants/theme.ts

// Define the colors for light and dark themes
export const lightColors = {
    primary: '#5CBD6A',
    primaryLight: 'rgba(92, 189, 106, 0.15)',
    primaryDark: '#4AA559',
    secondary: '#FF5252',
    background: '#FFFFFF',
    card: '#FFFFFF',
    text: '#000000',
    textSecondary: '#666666',
    textLight: '#999999',
    border: '#E0E0E0',
    borderLight: '#F0F0F0',
    tabBarIcon: '#777777',
    tabBarActiveTint: '#5CBD6A',
    tabBarInactiveTint: '#999999',
    shadow: '#000000',
    success: '#32CD32',
    error: '#FF453A',
    warning: '#FFD60A',
    info: '#0A84FF',
    shadowOpacity: 0.1,
    shadowColor: '#000000',
  };
  
  export const darkColors = {
    primary: '#5CBD6A',
    primaryLight: 'rgba(92, 189, 106, 0.15)',
    primaryDark: '#4AA559',
    secondary: '#FF5252',
    background: '#121212',
    card: '#1E1E1E',
    text: '#FFFFFF',
    textSecondary: '#CCCCCC',
    textLight: '#999999',
    border: '#333333',
    borderLight: '#444444',
    tabBarIcon: '#777777',
    tabBarActiveTint: '#4A80F0',
    tabBarInactiveTint: '#777777',
    shadow: '#000000',
    success: '#32CD32',
    error: '#FF453A',
    warning: '#FFD60A',
    info: '#0A84FF',
    shadowOpacity: 0.2,
    shadowColor: '#000',
  };
  
  // Define other theme-related constants
  export const spacing = {
    xs: 4,
    s: 8,
    m: 16,
    l: 24,
    xl: 32,
    xxl: 48,
  };
  
  export const fontSizes = {
    xs: 10,
    s: 12,
    m: 14,
    l: 16,
    xl: 18,
    xxl: 22,
    xxxl: 28,
  };
  
  export const borderRadius = {
    s: 4,
    m: 8,
    l: 12,
    xl: 20,
    round: 9999,
  };
  
  export type ThemeColors = typeof lightColors;
  
  export interface Theme {
    dark: boolean;
    colors: ThemeColors;
    spacing: typeof spacing;
    fontSizes: typeof fontSizes;
    borderRadius: typeof borderRadius;
  }
  
  export const lightTheme: Theme = {
    dark: false,
    colors: lightColors,
    spacing,
    fontSizes,
    borderRadius,
  };
  
  export const darkTheme: Theme = {
    dark: true,
    colors: darkColors,
    spacing,
    fontSizes,
    borderRadius,
  };