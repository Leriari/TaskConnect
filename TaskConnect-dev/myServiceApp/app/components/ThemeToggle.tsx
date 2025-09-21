// app/components/ThemeToggle.tsx

import React from 'react';
import { TouchableOpacity, StyleSheet, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../hooks/useThemedStyles';

interface ThemeToggleProps {
  style?: any;
  showText?: boolean;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ style, showText = false }) => {
  const { isDarkMode, toggleTheme, theme } = useTheme();
  
  const styles = useThemedStyles(theme => ({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    toggle: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.borderRadius.round,
      backgroundColor: isDarkMode 
        ? 'rgba(255, 255, 255, 0.1)' 
        : 'rgba(0, 0, 0, 0.05)',
      padding: theme.spacing.s,
    },
    icon: {
      marginRight: showText ? theme.spacing.s : 0,
    },
    text: {
      color: theme.colors.text,
      fontSize: theme.fontSizes.m,
      fontWeight: '600',
    }
  }));

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity 
        style={styles.toggle}
        onPress={toggleTheme}
        activeOpacity={0.7}
      >
        {isDarkMode ? (
          <>
            <Ionicons 
              name="moon" 
              size={24} 
              color={theme.colors.text}
              style={styles.icon}
            />
            {showText && <Text style={styles.text}>Dark Mode</Text>}
          </>
        ) : (
          <>
            <Ionicons 
              name="sunny" 
              size={24} 
              color={theme.colors.text} 
              style={styles.icon}
            />
            {showText && <Text style={styles.text}>Light Mode</Text>}
          </>
        )}
      </TouchableOpacity>
    </View>
  );
};

export default ThemeToggle;