// app/(tabs)/home/components/Banner.tsx

import React from 'react';
import { View, Text, TouchableOpacity, ViewStyle, TextStyle, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/app/context/ThemeContext';
import { useThemedStyles, createThemedStyles } from '@/app/hooks/useThemedStyles';

// Define props for the Banner component
interface BannerProps {
  title: string;
  subtitle: string;
  buttonText: string;
  iconName?: keyof typeof Ionicons.glyphMap; // Optional for custom image
  image?: any; // Optional for custom image
  backgroundColor: string;
  onPress: () => void;
}

const Banner: React.FC<BannerProps> = ({ title, subtitle, buttonText, iconName, image, backgroundColor, onPress }) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={[styles.bannerContainer, { backgroundColor }]}>
      <View style={styles.bannerContent}>
        <Text style={styles.bannerTitle}>{title}</Text>
        <Text style={styles.bannerSubtitle}>{subtitle}</Text>
      </View>
      <View style={styles.bannerImageContainer}>
        {image ? (
          <Image source={image} style={[styles.bannerImage, { backgroundColor: 'transparent' }]} resizeMode="cover" />
        ) : (
          iconName && <Ionicons name={iconName} size={60} color="#fff" style={styles.bannerImage} />
        )}
      </View>
    </View>
  );
};

const createStyles = createThemedStyles(theme => ({
  bannerContainer: {
    borderRadius: 20,
    marginHorizontal: 20,
    paddingHorizontal: 20,
    paddingVertical: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 140,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  bannerContent: {
    flex: 3,
    justifyContent: 'center',
  },
  bannerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  bannerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 5,
    marginBottom: 15,
  },
  bannerButton: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
  },
  bannerButtonText: {
    color: theme.colors.primary, // Button text color uses primary theme color
    fontWeight: '600',
  },
  bannerImageContainer: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  bannerImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    opacity: 0.95,
  },
}));

export default Banner;