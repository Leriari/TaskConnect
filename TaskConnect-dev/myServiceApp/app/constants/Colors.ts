// constants/Colors.ts

const tintColorLight = '#2E7D32'; // Primary green color
const tintColorDark = '#4CAF50'; // Lighter green for dark mode

export default {
  light: {
    text: '#000000',
    textSecondary: '#666666',
    background: '#FFFFFF',
    backgroundSecondary: '#F5F5F5',
    tint: tintColorLight,
    tabIconDefault: '#CCCCCC',
    tabIconSelected: tintColorLight,
    border: '#E0E0E0',
    buttonBackground: tintColorLight,
    buttonText: '#FFFFFF',
    cardBackground: '#FFFFFF',
    cardShadow: '#000000',
    error: '#FF5252',
    success: '#4CAF50',
    warning: '#FFC107',
    info: '#2196F3',
  },
  dark: {
    text: '#FFFFFF',
    textSecondary: '#CCCCCC',
    background: '#000000',
    backgroundSecondary: '#121212',
    tint: tintColorDark,
    tabIconDefault: '#666666',
    tabIconSelected: tintColorDark,
    border: '#333333',
    buttonBackground: tintColorDark,
    buttonText: '#000000',
    cardBackground: '#1C1C1C',
    cardShadow: '#000000',
    error: '#FF6B6B',
    success: '#66BB6A',
    warning: '#FFD54F',
    info: '#64B5F6',
  },
};