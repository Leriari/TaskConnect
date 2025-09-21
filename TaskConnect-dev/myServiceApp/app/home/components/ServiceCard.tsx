// app/(tabs)/home/components/ServiceCard.tsx

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Service } from '../types';
import { useTheme } from '@/app/context/ThemeContext';
import { useThemedStyles, createThemedStyles } from '@/app/hooks/useThemedStyles';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '@/firebase-config';

interface ServiceCardProps {
  service: Service;
}

interface Review {
  id: string;
  rating: number;
  comment: string;
  reviewerName: string;
  reviewerId: string;
  taskerId: string;
  createdAt: any;
}

// Helper to calculate distance between two lat/lng points (Haversine formula)
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const R = 6371; // Radius of the Earth in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// In-memory cache for geocoded addresses
const geocodeCache: Record<string, { lat: number, lon: number }> = {};

// Geocode an address string using OpenStreetMap Nominatim
async function geocodeAddress(address: string): Promise<{ lat: number, lon: number } | null> {
  if (geocodeCache[address]) return geocodeCache[address];
  try {
    console.log('[ServiceCard] Geocoding address:', address);
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'TaskConnectApp/1.0 (your@email.com)',
        'Accept': 'application/json'
      }
    });
    const data = await response.json();
    if (data && data.length > 0) {
      const lat = parseFloat(data[0].lat);
      const lon = parseFloat(data[0].lon);
      geocodeCache[address] = { lat, lon };
      console.log('[ServiceCard] Geocoding result:', { lat, lon });
      return { lat, lon };
    }
    console.warn('[ServiceCard] Geocoding failed: No results for', address);
    return null;
  } catch (err) {
    console.error('[ServiceCard] Geocoding error for', address, err);
    return null;
  }
}

const ServiceCard = ({ service }: ServiceCardProps) => {
  const router = useRouter();
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  
  const [reviews, setReviews] = useState<Review[]>([]);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [distance, setDistance] = useState<string>('');
  const [debugAddress, setDebugAddress] = useState<string>('');

  // Calculate average rating from reviews
  const calculateAverageRating = (reviews: Review[]): number => {
    if (reviews.length === 0) return 0;
    const totalStars = reviews.reduce((sum, review) => sum + review.rating, 0);
    const average = totalStars / reviews.length;
    return Math.round(average * 10) / 10; // Round to 1 decimal place
  };

  // Load reviews when component mounts
  useEffect(() => {
    loadReviews();
    fetchAndCalculateDistance();
  }, [service]);

  const loadReviews = async () => {
    try {
      // Use the correct tasker ID for loading reviews
      const correctTaskerId = (service as any).taskerFirestoreId || (service as any).taskerIdString || service.taskerId;
      
      if (!correctTaskerId) {
        console.log('🔍 DEBUG SERVICECARD: No tasker ID available for reviews');
        return;
      }

      console.log('🔍 DEBUG SERVICECARD: Loading reviews for tasker ID:', correctTaskerId);
      
      const reviewsRef = collection(db, 'reviews');
      const q = query(reviewsRef, where('taskerId', '==', correctTaskerId));
      
      const querySnapshot = await getDocs(q);
      console.log('🔍 DEBUG SERVICECARD: Found', querySnapshot.size, 'reviews');
      
      const reviewsData: Review[] = [];
      querySnapshot.forEach((doc) => {
        const reviewData = doc.data();
        reviewsData.push({
          id: doc.id,
          rating: reviewData.rating || 0,
          comment: reviewData.comment || '',
          reviewerName: reviewData.reviewerName || 'Anonymous',
          reviewerId: reviewData.reviewerId || '',
          taskerId: reviewData.taskerId || '',
          createdAt: reviewData.createdAt,
        });
      });

      setReviews(reviewsData);
      const avgRating = calculateAverageRating(reviewsData);
      setAverageRating(avgRating);
      setTotalReviews(reviewsData.length);
      
      console.log('🔍 DEBUG SERVICECARD: Calculated average rating:', avgRating);
      console.log('🔍 DEBUG SERVICECARD: Total reviews:', reviewsData.length);
    } catch (error) {
      console.error('🔍 DEBUG SERVICECARD: Error loading reviews:', error);
      // Fallback to static values if reviews fail to load
      setAverageRating(service.rating || 0);
      setTotalReviews(service.reviews || 0);
    }
  };

  const fetchAndCalculateDistance = async () => {
    try {
      const currentUser = auth.currentUser;
      const taskerId = (service as any).taskerFirestoreId || (service as any).taskerIdString || service.taskerId;
      if (!currentUser || !taskerId) {
        setDistance('');
        setDebugAddress('No current user or taskerId');
        return;
      }
      // Fetch logged-in user's default address
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      // Fetch tasker's default address
      const taskerDoc = await getDoc(doc(db, 'users', taskerId));
      if (!userDoc.exists() || !taskerDoc.exists()) {
        setDistance('');
        setDebugAddress('User or tasker doc does not exist');
        return;
      }
      const userData = userDoc.data();
      const taskerData = taskerDoc.data();
      const getDefaultAddress = (data: any) => {
        if (!data.addresses || !Array.isArray(data.addresses)) return null;
        return data.addresses.find((a: any) => a.isDefault) || data.addresses[0] || null;
      };
      const userAddress = getDefaultAddress(userData);
      const taskerAddress = getDefaultAddress(taskerData);
      if (!userAddress || !taskerAddress) {
        setDistance('');
        setDebugAddress('No default address for user or tasker');
        return;
      }
      // Get coordinates for both addresses (use geocoding if missing)
      let userLat = userAddress.latitude, userLon = userAddress.longitude;
      let taskerLat = taskerAddress.latitude, taskerLon = taskerAddress.longitude;
      let userGeoTried = false, taskerGeoTried = false;
      if (!userLat || !userLon) {
        const userFullAddress = `${userAddress.street || ''}, ${userAddress.city || ''}, ${userAddress.state || ''}, ${userAddress.country || ''}`;
        setDebugAddress('User address: ' + userFullAddress);
        const geo = await geocodeAddress(userFullAddress);
        userGeoTried = true;
        if (geo) {
          userLat = geo.lat;
          userLon = geo.lon;
        }
      }
      if (!taskerLat || !taskerLon) {
        const taskerFullAddress = `${taskerAddress.street || ''}, ${taskerAddress.city || ''}, ${taskerAddress.state || ''}, ${taskerAddress.country || ''}`;
        setDebugAddress(prev => prev + '\nTasker address: ' + taskerFullAddress);
        const geo = await geocodeAddress(taskerFullAddress);
        taskerGeoTried = true;
        if (geo) {
          taskerLat = geo.lat;
          taskerLon = geo.lon;
        }
      }
      if (userLat && userLon && taskerLat && taskerLon) {
        const dist = haversineDistance(
          parseFloat(userLat),
          parseFloat(userLon),
          parseFloat(taskerLat),
          parseFloat(taskerLon)
        );
        setDistance(`${dist.toFixed(1)} km away`);
        setDebugAddress('');
      } else {
        setDistance('');
        let msg = 'Distance unavailable.';
        if (userGeoTried && (!userLat || !userLon)) msg += ' User geocode failed.';
        if (taskerGeoTried && (!taskerLat || !taskerLon)) msg += ' Tasker geocode failed.';
        setDebugAddress(msg);
      }
    } catch (err) {
      setDistance('');
      setDebugAddress('Error: ' + (err?.message || err));
    }
  };

  // Helper to handle both base64 and URL images
  const getImageSource = (img: string | null | undefined) => {
    console.log('🔍 DEBUG SERVICECARD IMAGE: Raw image data:', img?.substring(0, 50));
    console.log('🔍 DEBUG SERVICECARD IMAGE: Image length:', img?.length);
    console.log('🔍 DEBUG SERVICECARD IMAGE: Starts with data:image:', img?.startsWith('data:image'));
    console.log('🔍 DEBUG SERVICECARD IMAGE: Starts with http:', img?.startsWith('http'));
    
    if (!img) return undefined;
    if (img.startsWith('data:image')) {
      console.log('🔍 DEBUG SERVICECARD IMAGE: Using as data URI');
      return { uri: img };
    }
    // Heuristic: if it's a long string and not a URL, treat as base64
    if (!img.startsWith('http') && img.length > 100) {
      console.log('🔍 DEBUG SERVICECARD IMAGE: Converting to data URI');
      return { uri: `data:image/jpeg;base64,${img}` };
    }
    console.log('🔍 DEBUG SERVICECARD IMAGE: Using as URL');
    return { uri: img };
  };

  // Render stars based on rating
  const renderStars = (rating: number = 0) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    
    // Add full stars
    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Ionicons key={`full-${i}`} name="star" size={16} color="#FFD700" />
      );
    }
    
    // Add half star if needed
    if (hasHalfStar) {
      stars.push(
        <Ionicons key="half" name="star-half" size={16} color="#FFD700" />
      );
    }
    
    // Add empty stars
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <Ionicons key={`empty-${i}`} name="star-outline" size={16} color="#FFD700" />
      );
    }
    
    return stars;
  };

  return (
    <View style={styles.serviceCard}>
      <View style={styles.serviceCardTop}>
        <View style={styles.serviceImageContainer}>
          {service.taskerProfileImage ? (
            <Image
              source={getImageSource(service.taskerProfileImage)}
              style={{ width: 60, height: 60, borderRadius: 30, alignSelf: 'center' }}
              resizeMode="cover"
              onError={(error) => console.log('🔍 DEBUG SERVICECARD IMAGE ERROR:', error.nativeEvent)}
              onLoad={() => console.log('🔍 DEBUG SERVICECARD IMAGE LOADED SUCCESSFULLY')}
            />
          ) : (
            <Ionicons name="person" size={36} color={theme.colors.primary} />
          )}
        </View>
        <View style={styles.serviceInfo}>
          <Text style={styles.serviceName}>{service.title}</Text>
          <Text style={styles.taskerName}>{service.taskerName}</Text>
          <View style={styles.ratingContainer}>
            {renderStars(averageRating)}
            <Text style={styles.ratingText}>{averageRating.toFixed(1)}</Text>
            <Text style={styles.reviewsText}>({totalReviews} reviews)</Text>
          </View>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={14} color={theme.colors.textLight} />
            <Text style={styles.serviceLocation}>{distance || 'Distance unavailable'}</Text>
          </View>
          {debugAddress ? (
            <Text style={{ color: 'red', fontSize: 10 }}>{debugAddress}</Text>
          ) : null}
          <View style={styles.priceRow}>
            <Ionicons name="cash-outline" size={14} color={theme.colors.primary} />
            <Text style={styles.priceText}>{service.price}</Text>
          </View>
        </View>
      </View>
      <TouchableOpacity
        style={styles.bookBtn}
        onPress={() => {
          try {
            console.log('🔍 DEBUG SERVICECARD: Service data being passed:', service);
            console.log('🔍 DEBUG SERVICECARD: Service bio:', (service as any).bio);
            console.log('🔍 DEBUG SERVICECARD: Service areas served:', (service as any).areasServed);
            console.log('🔍 DEBUG SERVICECARD: Service profile image:', !!service.taskerProfileImage);
            console.log('🔍 DEBUG SERVICECARD: Service services:', (service as any).services);
            router.push({
              pathname: "/home/screens/bookingScreen",
              params: { tasker: JSON.stringify(service) }
            });
          } catch (error) {
            console.error('Error navigating to booking screen:', error);
            alert('Unable to proceed with booking. Please try again.');
          }
        }}
      >
        <Text style={styles.bookBtnText}>Book</Text>
        <Ionicons name="arrow-forward" size={16} color="#fff" style={styles.bookBtnIcon} />
      </TouchableOpacity>
    </View>
  );
};

const createStyles = createThemedStyles(theme => ({
  serviceCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 20,
    padding: 15,
    marginHorizontal: 20,
    marginBottom: 15,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: theme.dark ? 0.3 : 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  serviceCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  serviceImageContainer: {
    height: 60,
    width: 60,
    borderRadius: 30,
    backgroundColor: theme.dark ? 'rgba(92, 189, 106, 0.15)' : '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    overflow: 'hidden',
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 5,
  },
  taskerName: {
    fontSize: 14,
    color: theme.colors.textLight,
    fontWeight: '500',
    marginBottom: 2,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  ratingText: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: '700',
    marginLeft: 4,
  },
  reviewsText: {
    fontSize: 12,
    color: theme.colors.textLight,
    marginLeft: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceText: {
    fontSize: 13,
    color: theme.colors.primary,
    fontWeight: '600',
    marginLeft: 4,
  },
  serviceLocation: {
    fontSize: 13,
    color: theme.colors.textLight,
    marginLeft: 4,
  },
  bookBtn: {
    marginTop: 15,
    backgroundColor: theme.colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
  },
  bookBtnText: {
    color: '#fff',
    fontWeight: '600',
    marginRight: 5,
  },
  bookBtnIcon: {
    marginLeft: 3,
  },
}));

export default ServiceCard;