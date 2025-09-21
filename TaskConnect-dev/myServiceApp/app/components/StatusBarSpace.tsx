import React from 'react';
import { View, StatusBar, Platform } from 'react-native';
import { useTheme } from '@/app/context/ThemeContext';
import { useThemedStyles, createThemedStyles } from '@/app/hooks/useThemedStyles';

// This component adds safe padding at the top of screens to avoid status bar overlap
interface StatusBarSpaceProps {
  backgroundColor?: string; // Optional override for background color
}

const StatusBarSpace: React.FC<StatusBarSpaceProps> = ({ backgroundColor }) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  
  return (
    <View 
      style={[
        styles.container, 
        backgroundColor ? { backgroundColor } : null
      ]}
    >
      <StatusBar
        barStyle={theme.dark ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent
      />
    </View>
  );
};

const createStyles = createThemedStyles(theme => ({
  container: {
    height: Platform.OS === 'ios' ? 47 : 35, // Add appropriate height for status bar
    width: '100%',
    backgroundColor: theme.colors.card,
    zIndex: 100,
  },
}));

export default StatusBarSpace;