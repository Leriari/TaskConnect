import React from 'react';
import { View, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/app/context/ThemeContext';
import { useThemedStyles, createThemedStyles } from '@/app/hooks/useThemedStyles';

// This component adds safe padding at the bottom of screens to avoid navigation bar overlap
interface BottomBarSpaceProps {
  backgroundColor?: string; // Optional override for background color
}

const BottomBarSpace: React.FC<BottomBarSpaceProps> = ({ backgroundColor }) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        { height: insets.bottom || (Platform.OS === 'ios' ? 24 : 16) },
        backgroundColor ? { backgroundColor } : null
      ]}
    />
  );
};

const createStyles = createThemedStyles(theme => ({
  container: {
    width: '100%',
    backgroundColor: theme.colors.card,
    zIndex: 100,
  },
}));

export default BottomBarSpace; 