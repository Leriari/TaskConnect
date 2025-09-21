// app/(tabs)/home/components/BannerCarousel.tsx

import React, { useRef, useState, useEffect } from 'react';
import { View, Dimensions, Animated, StyleSheet } from 'react-native';
import Banner from './Banner';
import EllaImg from '@/assets/images/Ella.jpg';
import { useTheme } from '@/app/context/ThemeContext';
import { useThemedStyles, createThemedStyles } from '@/app/hooks/useThemedStyles';
import { Ionicons } from '@expo/vector-icons';

// Get the full width of the window
const { width } = Dimensions.get('window');
// Define the width for each banner item, making it slightly less than full width
const CAROUSEL_ITEM_WIDTH = width - 2; // Increased width from previous version (was width - 20)

// Define the shape of data for a single banner
interface BannerData {
  id: string;
  title: string;
  subtitle: string;
  buttonText: string;
  iconName?: keyof typeof Ionicons.glyphMap; // Optional for custom image
  image?: any; // For custom image (e.g. Ella)
  backgroundColor: string;
  onPress: () => void;
}

// Mock data array for the banners to be displayed in the carousel
const mockBanners: BannerData[] = [
  {
    id: 'ella',
    title: 'Meet Ella',
    subtitle: 'Your friendly AI assistant for TaskConnect. Ask Ella anything about booking, payments, or using the app!',
    buttonText: 'Chat Now',
    image: EllaImg,
    backgroundColor: '#FFD600', // Bright yellow
    onPress: () => console.log('Chat with Ella'),
  },
  {
    id: '1',
    title: 'Get 20% off',
    subtitle: 'on your first home cleaning',
    buttonText: 'Book Now',
    iconName: 'home',
    backgroundColor: '#388E3C', // Darker Green
    onPress: () => console.log('Book Home Cleaning'),
  },
  {
    id: '2',
    title: 'New Service Alert!',
    subtitle: 'Professional plumbing now available',
    buttonText: 'Explore',
    iconName: 'construct',
    backgroundColor: '#4CAF50', // Medium Green
    onPress: () => console.log('Explore Plumbing'),
  },
  {
    id: '3',
    title: 'Refer a Friend',
    subtitle: 'And get Ksh. 500 credit!',
    buttonText: 'Share Now',
    iconName: 'people',
    backgroundColor: '#66BB6A', // Lighter Green
    onPress: () => console.log('Refer a Friend'),
  },
];

const BannerCarousel: React.FC = () => {
  // Access the current theme for styling purposes
  const { theme } = useTheme();
  // Apply themed styles dynamically
  const styles = useThemedStyles(createStyles);

  // State to keep track of the currently active banner index
  const [currentIndex, setCurrentIndex] = useState(0);
  // Animated value for horizontal translation of the banners
  const translateXAnim = useRef(new Animated.Value(0)).current;

  // Effect hook for auto-playing the carousel
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    const numBanners = mockBanners.length;

    // Function to move to the next banner
    const nextBanner = () => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % numBanners);
    };

    // Start auto-play interval if there's more than one banner
    if (numBanners > 1) {
      interval = setInterval(nextBanner, 8000); // Change banner every 8 seconds (was 5 seconds)
    }

    // Cleanup function to clear the interval when the component unmounts
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [mockBanners.length]); // Re-run effect if the number of banners changes

  // Effect hook to trigger the sliding animation when currentIndex changes
  useEffect(() => {
    Animated.timing(translateXAnim, {
      toValue: -currentIndex * CAROUSEL_ITEM_WIDTH, // Calculate the offset based on current index
      duration: 1000, // Animation duration increased to 1000ms (1 second)
      useNativeDriver: true, // Use native driver for better performance
    }).start(); // Start the animation
  }, [currentIndex, translateXAnim]); // Re-run effect when currentIndex or translateXAnim changes

  return (
    // Main container for the carousel, with overflow hidden to clip off-screen banners
    <View style={styles.carouselContainer}>
      {/* Animated container that holds all banners and slides horizontally */}
      <Animated.View
        style={[
          styles.animatedBannerWrapper,
          {
            // Set total width to accommodate all banners laid out in a row
            width: CAROUSEL_ITEM_WIDTH * mockBanners.length,
            // Apply the horizontal translation animation
            transform: [{ translateX: translateXAnim }],
          },
        ]}
      >
        {/* Map through the mock data to render each banner */}
        {mockBanners.map((banner) => (
          // Each banner is wrapped in a View to give it a fixed width for the sliding effect
          <View key={banner.id} style={{ width: CAROUSEL_ITEM_WIDTH }}>
            <Banner
              title={banner.title}
              subtitle={banner.subtitle}
              buttonText={banner.buttonText}
              iconName={banner.iconName}
              image={banner.image}
              backgroundColor={banner.backgroundColor}
              onPress={banner.onPress}
            />
          </View>
        ))}
      </Animated.View>
      {/* Pagination dots have been removed as per the request */}
    </View>
  );
};

// Stylesheet for the BannerCarousel component
const createStyles = createThemedStyles(theme => ({
  carouselContainer: {
    height: 200, // Fixed height for the carousel container
    marginBottom: 0, // Removed extra bottom padding (was 25)
    overflow: 'hidden', // Crucial for clipping banners outside the viewable area
    // No specific alignment here, as the Animated.View handles the internal layout
  },
  animatedBannerWrapper: {
    flexDirection: 'row', // Arrange banners horizontally
    // No explicit width or transform here, as it's set dynamically in the component
  },
  // Pagination dot styles are removed
}));

export default BannerCarousel;
