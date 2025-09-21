// app/(tabs)/home/screens/HomeScreenContent.tsx

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Platform, TouchableOpacity, Image } from 'react-native';
import { auth, db } from '@/firebase-config';
import { doc, getDoc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/app/context/ThemeContext';
import { useThemedStyles, createThemedStyles } from '@/app/hooks/useThemedStyles';
import StatusBarSpace from '@/app/components/StatusBarSpace';
import { useRouter } from 'expo-router';

// Components
import Header from '../components/Header';
import SearchBar from '../components/SearchBar';
import BannerCarousel from '../components/BannerCarousel';
import BecomeTaskerCard from '../components/BecomeTaskerCard';
import CategoryScroll from '../components/CategoryScroll';
import ServiceCard from '../components/ServiceCard';
import FilterModal from '../components/FilterModal';
import LocationModal from '../components/LocationModal';
import CategoryListModal from '../components/CategoryListModal';
import ProfileModal from '../components/ProfileModal';

// Types & API
import { fetchAllServices, fetchServicesByCategory } from '../api/service';
import { Service } from '../types';
import { allServices, cities } from '../data/mockData';

// Local types
type City = { name: string; latitude: number; longitude: number };
type FilterOptions = { minRating: number; maxPrice: number; maxDistance: number; sortBy: 'rating' | 'price' | 'distance' };
type ServiceWithDistance = Service & { distanceKm?: number };

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

// Helper to get default address from user data
const getDefaultAddress = (data: any) => {
  if (!data.addresses || !Array.isArray(data.addresses)) return null;
  return data.addresses.find((a: any) => a.isDefault) || data.addresses[0] || null;
};

// Helper to get coordinates from address (with geocoding fallback)
const geocodeCache: Record<string, { lat: number, lon: number }> = {};
async function geocodeAddress(address: string): Promise<{ lat: number, lon: number } | null> {
  if (geocodeCache[address]) return geocodeCache[address];
  try {
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
      return { lat, lon };
    }
    return null;
  } catch (err) {
    return null;
  }
}

export default function HomeScreenContent() {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();

  // state
  const [services, setServices] = useState<ServiceWithDistance[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showCategoryListModal, setShowCategoryListModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({ minRating: 4.0, maxPrice: 7000, maxDistance: 10, sortBy: 'rating' });
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [userName, setUserName] = useState<string>('User');
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [isTasker, setIsTasker] = useState<boolean>(false);
  const [isBookingLoading, setIsBookingLoading] = useState<boolean>(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const [userCoords, setUserCoords] = useState<{ lat: number, lon: number } | null>(null);

  // Get current user UID
  const currentUserUid = auth.currentUser?.uid;

  // fetch profile & tasker status once
  useEffect(() => {
    (async () => {
      setIsLoading(true);
      const user = auth.currentUser;
      if (user) {
        // Try to get firstName from users collection first
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            if (userData.firstName) {
              setUserName(userData.firstName);
            } else if (user.displayName) {
              // Fallback to first part of displayName if firstName not available
              setUserName(user.displayName.split(' ')[0]);
            }
          } else if (user.displayName) {
            // Fallback to first part of displayName if no user document
            setUserName(user.displayName.split(' ')[0]);
          }
        } catch (error) {
          // Fallback to first part of displayName if error occurs
          if (user.displayName) {
            setUserName(user.displayName.split(' ')[0]);
          }
        }
        
        user.photoURL && setUserPhoto(user.photoURL);
        try {
          const snap = await getDoc(doc(db, 'taskers', user.uid));
          setIsTasker(snap.exists());
        } catch {
          setIsTasker(false);
        }
      }
      setIsLoading(false);
    })();
  }, []);

  // Fetch the logged-in user's default address and coordinates on mount
  useEffect(() => {
    (async () => {
      const user = auth.currentUser;
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const userAddress = getDefaultAddress(userData);
          let lat = userAddress?.latitude, lon = userAddress?.longitude;
          if (!lat || !lon) {
            const userFullAddress = `${userAddress?.street || ''}, ${userAddress?.city || ''}, ${userAddress?.state || ''}, ${userAddress?.country || ''}`;
            const geo = await geocodeAddress(userFullAddress);
            if (geo) {
              lat = geo.lat;
              lon = geo.lon;
            }
          }
          if (lat && lon) setUserCoords({ lat: parseFloat(lat), lon: parseFloat(lon) });
          else setUserCoords(null);
        } else {
          setUserCoords(null);
        }
      } else {
        setUserCoords(null);
      }
    })();
  }, []);

  // whenever category changes, reload services
  useEffect(() => {
    (async () => {
      setIsLoading(true);
      try {
        const data = selectedCategory === 'All'
          ? await fetchAllServices()
          : await fetchServicesByCategory(selectedCategory);
        // For each service, calculate distanceKm property
        const enriched = await Promise.all(data.map(async (svc) => {
          const taskerId = (svc as any).taskerFirestoreId || (svc as any).taskerIdString || (svc as any).taskerId;
          let dist = Infinity;
          if (userCoords && taskerId) {
            // Fetch tasker's default address
            const taskerDoc = await getDoc(doc(db, 'users', taskerId));
            if (taskerDoc.exists()) {
              const taskerData = taskerDoc.data();
              const taskerAddress = getDefaultAddress(taskerData);
              let lat = taskerAddress?.latitude, lon = taskerAddress?.longitude;
              if (!lat || !lon) {
                const taskerFullAddress = `${taskerAddress?.street || ''}, ${taskerAddress?.city || ''}, ${taskerAddress?.state || ''}, ${taskerAddress?.country || ''}`;
                const geo = await geocodeAddress(taskerFullAddress);
                if (geo) {
                  lat = geo.lat;
                  lon = geo.lon;
                }
              }
              if (lat && lon) {
                dist = haversineDistance(userCoords.lat, userCoords.lon, parseFloat(lat), parseFloat(lon));
              }
            }
          }
          return { ...svc, distanceKm: dist };
        }));
        setServices(enriched);
      } catch (e) {
        console.error('Error loading services:', e);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [selectedCategory, userCoords]);

  // Combined search and filter logic
  const filteredServices: ServiceWithDistance[] = services
    .filter(s => {
      // Exclude services belonging to the logged-in user
      const serviceTaskerId = (s as any).taskerFirestoreId || (s as any).taskerIdString || (s as any).taskerId;
      if (currentUserUid && serviceTaskerId && serviceTaskerId === currentUserUid) return false;
      // Search filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.trim().toLowerCase();
      return (
        (s.title && s.title.toLowerCase().includes(q)) ||
        (s.name && s.name.toLowerCase().includes(q)) ||
        (s.taskerName && s.taskerName.toLowerCase().includes(q)) ||
        (s.category && s.category.toLowerCase().includes(q))
      );
    })
    .filter(s => s.rating >= filterOptions.minRating)
    .filter(s => parseInt(s.price.replace('Ksh', '')) <= filterOptions.maxPrice)
    .filter(s => parseFloat(s.location) <= filterOptions.maxDistance)
    .sort((a, b) => {
      const aDist = a.distanceKm !== undefined ? a.distanceKm : Infinity;
      const bDist = b.distanceKm !== undefined ? b.distanceKm : Infinity;
      if (aDist !== bDist) return aDist - bDist;
      return b.rating - a.rating;
    });

  // Prepare dropdown results for SearchBar
  const searchResults = searchQuery.trim()
    ? services
      .filter(s => {
        // Exclude services belonging to the logged-in user
        const serviceTaskerId = (s as any).taskerFirestoreId || (s as any).taskerIdString || (s as any).taskerId;
        if (currentUserUid && serviceTaskerId && serviceTaskerId === currentUserUid) return false;
        const q = searchQuery.trim().toLowerCase();
        return (
          (s.title && s.title.toLowerCase().includes(q)) ||
          (s.name && s.name.toLowerCase().includes(q)) ||
          (s.taskerName && s.taskerName.toLowerCase().includes(q)) ||
          (s.category && s.category.toLowerCase().includes(q))
        );
      })
      .slice(0, 8) // limit results
      .map(s => ({
        id: s.id,
        title: s.title || s.name,
        subtitle: `${s.taskerName || s.name} • ${s.category}`,
        onPress: async () => {
          setIsBookingLoading(true);
          try {
            await router.push({
              pathname: "/home/screens/bookingScreen",
              params: { tasker: JSON.stringify(s) }
            });
          } catch (error) {
            console.error('Error navigating to booking screen:', error);
            alert('Unable to proceed with booking. Please try again.');
          } finally {
            setIsBookingLoading(false);
          }
        },
        profileImage: s.taskerProfileImage || null,
      }))
    : [];

  // Just close the modal on apply
  const applyFilters = () => {
    setShowFilterModal(false);
  };

  // Floating Ella chat button handler
  const handleEllaChat = () => {
    router.push('/home/screens/HelpSupportScreen');
  };

  return (
    <View style={styles.container}>
      <StatusBarSpace />
      <Header userName={userName} onProfilePress={() => setShowProfileModal(true)} />

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      )}

      {isBookingLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      )}

      <SearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        onFilterPress={() => setShowFilterModal(true)}
        results={searchResults}
        onDismiss={() => setSearchQuery('')}
        loading={!!(isLoading && searchQuery.trim())}
      />
      <ScrollView ref={scrollViewRef} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <BannerCarousel />
        {!isTasker && <BecomeTaskerCard />}

        <View style={styles.categorySectionWrapper}>
          <Text style={styles.sectionTitleText}>Categories</Text>
        </View>

        <CategoryScroll
          selectedCategory={selectedCategory}
          onCategorySelect={setSelectedCategory}
        />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitleText}>
            {selectedCategory === 'All' ? 'Top Rated Services' : `${selectedCategory} Services`}
          </Text>
          <TouchableOpacity onPress={() => setShowCategoryListModal(true)}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>

        {filteredServices.length > 0 ? (
          filteredServices.map((s, idx) => <ServiceCard key={s.id + '-' + idx} service={s} />)
        ) : (
          <View style={styles.noResultsContainer}>
            <Ionicons name="search-outline" size={50} color={theme.colors.textLight} />
            <Text style={styles.noResultsText}>No services found</Text>
            <Text style={styles.noResultsSubtext}>Try adjusting your filters or search</Text>
          </View>
        )}
      </ScrollView>

      <ProfileModal visible={showProfileModal} onClose={() => setShowProfileModal(false)} userName={userName} />
      <FilterModal visible={showFilterModal} onClose={applyFilters} filterOptions={filterOptions} setFilterOptions={setFilterOptions} onApply={applyFilters} />
      <CategoryListModal visible={showCategoryListModal} onClose={() => setShowCategoryListModal(false)} selectedCategory={selectedCategory} services={services} />
      <LocationModal visible={showLocationModal} onClose={() => setShowLocationModal(false)} currentLocation={cities[0]} cities={cities} onLocationChange={() => { }} />

      {/* Floating Ella Chat Button */}
      <TouchableOpacity
        style={styles.ellaFab}
        activeOpacity={0.85}
        onPress={handleEllaChat}
      >
        <Image
          source={require('@/assets/images/Ella.jpg')}
          style={styles.ellaFabAvatar}
        />
      </TouchableOpacity>
    </View>
  );
}

const createStyles = createThemedStyles(theme => ({
  container: { flex: 1, backgroundColor: theme.colors.background },
  loadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: theme.dark ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.7)', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  scrollContent: { paddingBottom: 30 },
  sectionTitleText: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
  categorySectionWrapper: { marginHorizontal: 20, marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 20, marginVertical: 15 },
  seeAllText: { color: theme.colors.primary, fontWeight: '600' },
  noResultsContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 30, marginHorizontal: 20 },
  noResultsText: { fontSize: 18, fontWeight: '600', color: theme.colors.text, marginTop: 15 },
  noResultsSubtext: { fontSize: 14, color: theme.colors.textLight, marginTop: 5 },
  ellaFab: {
    position: 'absolute',
    bottom: 32,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 100,
  },
  ellaFabAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#eee',
  },
}));