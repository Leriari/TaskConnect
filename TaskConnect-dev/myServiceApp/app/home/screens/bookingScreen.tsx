import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  FlatList,
  ActivityIndicator,
  Alert,
  Animated,
  PanResponder,
  Image
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/app/context/ThemeContext';
import { useThemedStyles, createThemedStyles } from '@/app/hooks/useThemedStyles';
import { auth } from '@/firebase-config';
import {
  getUserAddresses,
  addUserAddress,
  updateUserAddress,
  deleteUserAddress,
  setDefaultAddress,
  Address
} from '@/app/services/userDatabaseService';
import * as Location from 'expo-location';
import { addDoc, collection, serverTimestamp, updateDoc, doc, query, where, getDocs, getDoc } from 'firebase/firestore';
import { db } from '@/firebase-config';

type SearchParamTypes = {
  bookingScreen: {
    tasker: string;
  };
  bookingSummary: {
    tasker: string;
    date: string;
    address: string;
    notes: string;
  };
};

type PaymentMethod = 'mpesa' | 'card' | 'cash';

const BookingScreen = () => {
  const router = useRouter();
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<SearchParamTypes['bookingScreen']>();
  console.log('🔍 DEBUG BOOKING: Raw params:', params);
  console.log('🔍 DEBUG BOOKING: params.tasker:', params.tasker);
  const tasker = JSON.parse(params.tasker);
  console.log('🔍 DEBUG BOOKING: Parsed tasker:', tasker);
  console.log('🔍 DEBUG BOOKING: Tasker bio:', tasker.bio);
  console.log('🔍 DEBUG BOOKING: Tasker areas served:', tasker.areasServed);
  console.log('🔍 DEBUG BOOKING: Tasker profile image:', !!tasker.profileImageBase64);
  console.log('🔍 DEBUG BOOKING: Tasker services:', tasker.services);

  const [date, setDate] = useState(new Date());
  const [showDateModal, setShowDateModal] = useState(false);
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  // For date selection
  const [selectedDay, setSelectedDay] = useState(date.getDate());
  const [selectedMonth, setSelectedMonth] = useState(date.getMonth());
  const [selectedYear, setSelectedYear] = useState(date.getFullYear());

  // For time selection - start with a reasonable default time (next hour)
  const [selectedHour, setSelectedHour] = useState(() => {
    const now = new Date();
    const nextHour = now.getHours() + 1;
    return nextHour > 12 ? nextHour - 12 : nextHour === 0 ? 12 : nextHour;
  });
  const [selectedMinute, setSelectedMinute] = useState(0);
  const [selectedAmPm, setSelectedAmPm] = useState(() => {
    const now = new Date();
    const nextHour = now.getHours() + 1;
    return nextHour >= 12 ? 'PM' : 'AM';
  });

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [locationPermission, setLocationPermission] = useState<boolean>(false);
  const [currentAddress, setCurrentAddress] = useState<Address>({
    id: '',
    street: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'Kenya',
    isDefault: false
  });
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [bottomSheetHeight] = useState(new Animated.Value(0));
  const [isBottomSheetVisible, setIsBottomSheetVisible] = useState(false);
  const [requestSubmitted, setRequestSubmitted] = useState(false);

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gestureState) => {
      return Math.abs(gestureState.dy) > 5;
    },
    onPanResponderMove: (_, gestureState) => {
      if (gestureState.dy > 0) {
        bottomSheetHeight.setValue(gestureState.dy);
      }
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dy > 100) {
        closeBottomSheet();
      } else {
        Animated.spring(bottomSheetHeight, {
          toValue: 0,
          useNativeDriver: false,
        }).start();
      }
    },
  });

  useEffect(() => {
    loadAddresses();
    requestLocationPermission();
  }, []);



  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status === 'granted');
    } catch (error) {
      console.error('Error requesting location permission:', error);
    }
  };

  const loadAddresses = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert('Error', 'You must be logged in to view saved addresses.');
        return;
      }

      const userAddresses = await getUserAddresses();
      setAddresses(userAddresses);

      // Set default address if available
      const defaultAddress = userAddresses.find(addr => addr.isDefault);
      if (defaultAddress) {
        setSelectedAddress(defaultAddress);
        setAddress(defaultAddress.street);
      }
    } catch (error) {
      console.error('Error loading addresses:', error);
      Alert.alert('Error', 'Failed to load saved addresses.');
    }
  };

  const showBottomSheet = () => {
    setIsBottomSheetVisible(true);
    Animated.spring(bottomSheetHeight, {
      toValue: 400,
      useNativeDriver: false,
    }).start();
  };

  const closeBottomSheet = () => {
    Animated.timing(bottomSheetHeight, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start(() => {
      setIsBottomSheetVisible(false);
    });
  };

  const getCurrentLocation = async () => {
    if (!locationPermission) {
      Alert.alert(
        'Location Permission Required',
        'Please enable location services to use this feature.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Settings', onPress: requestLocationPermission }
        ]
      );
      return;
    }

    try {
      setIsLoadingLocation(true);
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced
      });

      const geocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      });

      if (geocode && geocode.length > 0) {
        const addressDetails = geocode[0];
        const formattedAddress = `${addressDetails.street || addressDetails.name || ''}, ${addressDetails.city || addressDetails.region || ''}, ${addressDetails.region || ''}, ${addressDetails.postalCode || ''}, Kenya`;
        setAddress(formattedAddress);
      }
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Error', 'Failed to get your current location. Please enter address manually.');
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const handleSaveAddress = async () => {
    if (!currentAddress.street || !currentAddress.city) {
      Alert.alert('Missing Information', 'Please fill in at least street and city.');
      return;
    }

    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert('Error', 'You must be logged in to save addresses.');
        return;
      }

      if (isEditMode) {
        await updateUserAddress(currentAddress);
      } else {
        await addUserAddress(currentAddress);
      }

      await loadAddresses();
      setShowAddressModal(false);
      Alert.alert('Success', `Address ${isEditMode ? 'updated' : 'added'} successfully`);
    } catch (error) {
      console.error('Error saving address:', error);
      Alert.alert('Error', `Failed to ${isEditMode ? 'update' : 'add'} address.`);
    }
  };

  const handleLongPressAddress = (address: Address) => {
    setCurrentAddress(address);
    setIsEditMode(true);
    showBottomSheet();
  };

  const handleSwipeDelete = async (address: Address) => {
    Alert.alert(
      'Delete Address',
      'Are you sure you want to delete this address?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteUserAddress(address.id);
              await loadAddresses();
            } catch (error) {
              console.error('Error deleting address:', error);
              Alert.alert('Error', 'Failed to delete address.');
            }
          }
        }
      ]
    );
  };

  const renderAddressItem = (address: Address) => (
    <Animated.View
      key={address.id}
      style={[
        styles.addressItem,
        selectedAddress?.id === address.id && styles.selectedAddressItem
      ]}
    >
      <TouchableOpacity
        style={styles.addressItemContent}
        onPress={() => {
          setSelectedAddress(address);
          setAddress(address.street);
        }}
        onLongPress={() => handleLongPressAddress(address)}
      >
        <View style={styles.addressHeader}>
          {address.isDefault && (
            <View style={styles.defaultBadge}>
              <Text style={styles.defaultBadgeText}>Default</Text>
            </View>
          )}
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleSwipeDelete(address)}
          >
            <Ionicons name="trash-outline" size={20} color={theme.colors.error} />
          </TouchableOpacity>
        </View>

        <Text style={styles.addressLine}>{address.street}</Text>
        <Text style={styles.addressLine}>
          {address.city}{address.state ? `, ${address.state}` : ''} {address.postalCode}
        </Text>
        <Text style={styles.addressLine}>{address.country}</Text>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderBottomSheet = () => (
    <Animated.View
      style={[
        styles.bottomSheet,
        {
          height: bottomSheetHeight,
          transform: [{ translateY: bottomSheetHeight }]
        }
      ]}
      {...panResponder.panHandlers}
    >
      <View style={styles.bottomSheetHeader}>
        <View style={styles.bottomSheetHandle} />
        <Text style={styles.bottomSheetTitle}>
          {isEditMode ? 'Edit Address' : 'Add New Address'}
        </Text>
      </View>

      <ScrollView style={styles.bottomSheetContent}>
        {!isEditMode && (
          <TouchableOpacity
            style={styles.locationButton}
            onPress={getCurrentLocation}
            disabled={isLoadingLocation}
          >
            {isLoadingLocation ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="locate" size={20} color="#fff" />
                <Text style={styles.locationButtonText}>Use Current Location</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        <Text style={styles.inputLabel}>Street Address*</Text>
        <TextInput
          style={styles.input}
          value={currentAddress.street}
          onChangeText={(text) => setCurrentAddress({ ...currentAddress, street: text })}
          placeholder="Enter your street address"
          placeholderTextColor={theme.colors.textLight}
        />

        <Text style={styles.inputLabel}>City*</Text>
        <TextInput
          style={styles.input}
          value={currentAddress.city}
          onChangeText={(text) => setCurrentAddress({ ...currentAddress, city: text })}
          placeholder="Enter your city"
          placeholderTextColor={theme.colors.textLight}
        />

        <Text style={styles.inputLabel}>State/Province</Text>
        <TextInput
          style={styles.input}
          value={currentAddress.state}
          onChangeText={(text) => setCurrentAddress({ ...currentAddress, state: text })}
          placeholder="Enter your state or province"
          placeholderTextColor={theme.colors.textLight}
        />

        <Text style={styles.inputLabel}>Postal Code</Text>
        <TextInput
          style={styles.input}
          value={currentAddress.postalCode}
          onChangeText={(text) => setCurrentAddress({ ...currentAddress, postalCode: text })}
          placeholder="Enter your postal code"
          placeholderTextColor={theme.colors.textLight}
          keyboardType="number-pad"
        />

        <Text style={styles.inputLabel}>Country</Text>
        <View style={styles.disabledInput}>
          <Text style={styles.disabledInputText}>Kenya</Text>
        </View>

        <View style={styles.defaultCheckbox}>
          <TouchableOpacity
            style={[
              styles.checkbox,
              currentAddress.isDefault && styles.checkboxChecked
            ]}
            onPress={() => setCurrentAddress({
              ...currentAddress,
              isDefault: !currentAddress.isDefault
            })}
          >
            {currentAddress.isDefault && (
              <Ionicons name="checkmark" size={16} color="#fff" />
            )}
          </TouchableOpacity>
          <Text style={styles.checkboxLabel}>Set as default address</Text>
        </View>

        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSaveAddress}
        >
          <Text style={styles.saveButtonText}>Save Address</Text>
        </TouchableOpacity>
      </ScrollView>
    </Animated.View>
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i);

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  // Only allow days from today onwards if the selected month/year is current or in the past
  const days = Array.from(
    { length: getDaysInMonth(selectedMonth, selectedYear) },
    (_, i) => i + 1
  ).filter(day => {
    const candidate = new Date(selectedYear, selectedMonth, day);
    candidate.setHours(0, 0, 0, 0);
    return candidate >= today;
  });

  const hours = Array.from({ length: 12 }, (_, i) => i === 0 ? 12 : i);
  const minutes = Array.from({ length: 12 }, (_, i) => i * 5);
  const amPm = ['AM', 'PM'];

  const confirmDateSelection = () => {
    const newDate = new Date(date);
    newDate.setFullYear(selectedYear);
    newDate.setMonth(selectedMonth);
    newDate.setDate(selectedDay);
    // Prevent selecting a date before today
    const candidate = new Date(selectedYear, selectedMonth, selectedDay);
    candidate.setHours(0, 0, 0, 0);
    if (candidate < today) {
      Alert.alert('Invalid Date', 'You cannot select a past date.');
      return;
    }
    setDate(newDate);
    setShowDateModal(false);
  };

  const confirmTimeSelection = () => {
    const newDate = new Date(date);
    let hour = selectedHour;

    // Convert 12-hour format to 24-hour format
    if (selectedAmPm === 'PM' && selectedHour !== 12) {
      hour = selectedHour + 12;
    } else if (selectedAmPm === 'AM' && selectedHour === 12) {
      hour = 0;
    }

    newDate.setHours(hour);
    newDate.setMinutes(selectedMinute);

    // Check if the selected time has already passed
    const now = new Date();
    if (newDate <= now) {
      Alert.alert('Invalid Time', 'You cannot select a time that has already passed.');
      return;
    }

    setDate(newDate);
    setShowTimeModal(false);
  };

  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    return date.toLocaleDateString(undefined, options);
  };

  const formatTime = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    };
    return date.toLocaleTimeString(undefined, options);
  };

  /**
   * Helper to find the UID of a tasker given a tasker object (with category and name fields)
   * 1. Get the serviceCategory doc for the tasker's category
   * 2. For each service in the services array, get the taskerId
   * 3. For each taskerId, fetch the tasker doc and compare firstName + lastName to taskerName
   * 4. Return the UID if found, else null
   */
  const findTaskerUidByCategoryAndName = async (taskerObj: any) => {
    if (!taskerObj?.category || !taskerObj?.taskerName) return null;
    try {
      const catSnap = await getDoc(doc(db, 'serviceCategories', taskerObj.category));
      if (!catSnap.exists()) return null;
      const { services } = catSnap.data();
      if (!services || !Array.isArray(services)) return null;
      for (const svc of services) {
        const taskerId = svc.taskerId || svc.TaskerId || svc.taskerID;
        if (!taskerId) continue;
        const taskerSnap = await getDoc(doc(db, 'taskers', taskerId));
        if (!taskerSnap.exists()) continue;
        const t = taskerSnap.data();
        const fullName = `${t.firstName || ''} ${t.lastName || ''}`.trim();
        if (fullName === taskerObj.taskerName) {
          return taskerId;
        }
      }
      return null;
    } catch (err) {
      console.error('Error finding tasker UID:', err);
      return null;
    }
  };

  const handleBooking = async () => {
    if (!address.trim()) {
      alert('Please enter your address');
      return;
    }

    // Parse and validate the amount
    let amount = 0;
    try {
      // Remove any currency symbols and non-numeric characters except decimal point
      const priceString = tasker.price?.replace(/[^0-9.]/g, '');
      amount = parseFloat(priceString || '0');

      if (isNaN(amount) || amount <= 0) {
        alert('Invalid price amount');
        return;
      }
    } catch (error) {
      console.error('Error parsing price:', error);
      alert('Invalid price format');
      return;
    }

    try {
      // Find the correct tasker UID
      const taskerUid = await findTaskerUidByCategoryAndName(tasker);
      if (!taskerUid) {
        alert('Could not find the tasker. Please try again.');
        return;
      }

      // // Check tasker availability for the selected date and time
      // const selectedDate = new Date(date);
      // const startOfDay = new Date(selectedDate);
      // startOfDay.setHours(0, 0, 0, 0);
      // const endOfDay = new Date(selectedDate);
      // endOfDay.setHours(23, 59, 59, 999);

      // // Query for existing jobs on the same date for this tasker
      // const jobsRef = collection(db, 'jobs');
      // const availabilityQuery = query(
      //   jobsRef,
      //   where('taskerId', '==', taskerUid),
      //   where('date', '>=', startOfDay.toISOString()),
      //   where('date', '<=', endOfDay.toISOString()),
      //   where('status', 'in', ['pending_approval', 'in_progress', 'in_escrow', 'processing_payment'])
      // );

      // const availabilitySnapshot = await getDocs(availabilityQuery);

      // if (!availabilitySnapshot.empty) {
      //   // Check if any existing jobs overlap with the selected time
      //   const selectedTime = selectedDate.getTime();
      //   const timeWindow = 2 * 60 * 60 * 1000; // 2 hours window for overlap detection

      //   const hasConflict = availabilitySnapshot.docs.some(doc => {
      //     const jobData = doc.data();
      //     const jobDate = new Date(jobData.date);
      //     const jobTime = jobDate.getTime();

      //     // Check if the times overlap (within 2 hours of each other)
      //     return Math.abs(selectedTime - jobTime) < timeWindow;
      //   });

      //   if (hasConflict) {
      //     alert('This tasker is not available at the selected time. Please choose a different time or date.');
      //     return;
      //   }
      // }

      // Create job in Firestore with validated amount
      await addDoc(collection(db, 'jobs'), {
        clientId: auth.currentUser?.uid,
        taskerId: taskerUid,
        amount: amount, // Use the validated amount
        date: date.toISOString(),
        address,
        notes,
        status: 'pending_approval',
        paymentStatus: 'pending',
        createdAt: serverTimestamp(),
      });
      setRequestSubmitted(true);
    } catch (error) {
      console.error('Booking request failed:', error);
      alert('Booking request failed. Please try again.');
    }
  };

  const handleChatPress = async () => {
    if (!auth.currentUser) {
      Alert.alert('Error', 'You must be logged in to chat with the tasker.');
      return;
    }
    // Find the correct tasker UID
    const taskerUid = await findTaskerUidByCategoryAndName(tasker);
    if (!taskerUid) {
      Alert.alert('Error', 'Could not find the tasker. Please try again.');
      return;
    }
    // Log the UIDs for debugging
    console.log('Current User UID:', auth.currentUser.uid);
    console.log('Tasker UID (Other Participant):', taskerUid);
    console.log('Tasker object:', tasker);
    try {
      // Check if conversation already exists
      const conversationsRef = collection(db, 'conversations');
      const q = query(
        conversationsRef,
        where('participants', 'array-contains', auth.currentUser?.uid)
      );
      const querySnapshot = await getDocs(q);
      let conversationId;
      // Filter results to find conversation with both participants
      const existingConversation = querySnapshot.docs.find(doc => {
        const data = doc.data();
        return data.participants &&
          data.participants.includes(auth.currentUser?.uid) &&
          data.participants.includes(taskerUid);
      });
      if (existingConversation) {
        // Use existing conversation
        conversationId = existingConversation.id;
        console.log('Using existing conversation ID:', conversationId);
      } else {
        // Create new conversation
        const conversationRef = await addDoc(conversationsRef, {
          participants: [auth.currentUser.uid, taskerUid],
          lastMessage: 'Chat created. Say hello!',
          lastMessageTimestamp: serverTimestamp(),
          createdAt: serverTimestamp(),
        });
        conversationId = conversationRef.id;
        console.log('Created new conversation ID:', conversationId);
      }
      // Navigate to chat room
      router.push({
        pathname: '/home/screens/ChatRoomScreen',
        params: {
          chatId: conversationId,
          otherParticipantId: taskerUid,
          otherParticipantName: tasker.taskerName || 'Tasker',
          otherParticipantPhoto: tasker.profileImageBase64 ? `data:image/jpeg;base64,${tasker.profileImageBase64}` : ''
        }
      });
    } catch (error) {
      console.error('Error navigating to chat:', error);
      Alert.alert('Error', 'Failed to open chat. Please try again.');
    }
  };

  if (requestSubmitted) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
        <Ionicons name="hourglass-outline" size={48} color={theme.colors.primary} style={{ marginBottom: 20 }} />
        <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 10, color: theme.colors.text }}>Request Submitted!</Text>
        <Text style={{ fontSize: 16, color: theme.colors.textLight, textAlign: 'center', marginBottom: 20 }}>
          Your service request has been sent to the tasker. You will be notified once the tasker approves your request.
        </Text>
        <TouchableOpacity
          style={{ backgroundColor: theme.colors.primary, paddingVertical: 12, paddingHorizontal: 32, borderRadius: 10, marginTop: 10 }}
          onPress={() => router.replace('/home')}
        >
          <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (isLoadingLocation) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.7)', zIndex: 1000 }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Custom Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Book Tasker</Text>
        <View style={styles.headerSpacer} />
      </View>

      <TouchableOpacity 
        style={styles.card}
        onPress={() => {
          console.log('🔍 DEBUG BOOKING: Tasker data being passed:', tasker);
          console.log('🔍 DEBUG BOOKING: Tasker bio:', tasker.bio);
          console.log('🔍 DEBUG BOOKING: Tasker areas served:', tasker.areasServed);
          console.log('🔍 DEBUG BOOKING: Tasker profile image:', !!tasker.profileImageBase64);
          console.log('🔍 DEBUG BOOKING: Tasker services:', tasker.services);
          router.push({
            pathname: '/home/screens/CustomerTaskerProfileScreen',
            params: {
              taskerData: JSON.stringify(tasker)
            }
          });
        }}
      >
        {(tasker.taskerProfileImage || tasker.profileImageBase64) ? (
          <Image
            source={{ uri: `data:image/jpeg;base64,${tasker.taskerProfileImage || tasker.profileImageBase64}` }}
            style={{ width: 50, height: 50, borderRadius: 25 }}
            resizeMode="cover"
            onError={(error) => console.log('🔍 DEBUG BOOKING IMAGE ERROR:', error.nativeEvent)}
            onLoad={() => console.log('🔍 DEBUG BOOKING IMAGE LOADED SUCCESSFULLY')}
          />
        ) : (
          <Ionicons name="person-circle-outline" size={50} color={theme.colors.primary} />
        )}
        <View style={styles.taskerInfo}>
          <Text style={styles.name}>{tasker.taskerName}</Text>
          <Text style={styles.detail}>{tasker.category}</Text>
          <Text style={styles.detail}>{tasker.price}</Text>
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.chatButton}
            onPress={(e) => {
              e.stopPropagation();
              handleChatPress();
            }}
          >
            <Ionicons name="chatbubble-outline" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.textLight} />
        </View>
      </TouchableOpacity>

      {/* Date & Time Selection */}
      <View style={styles.dateTimeSection}>
        <Text style={styles.sectionTitle}>Schedule Service</Text>

        <TouchableOpacity
          onPress={() => setShowDateModal(true)}
          style={styles.dateTimeBox}
        >
          <Ionicons name="calendar-outline" size={24} color={theme.colors.primary} />
          <View style={styles.dateTimeTextContainer}>
            <Text style={styles.dateTimeLabel}>Date</Text>
            <Text style={styles.dateTimeValue}>{formatDate(date)}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.textLight} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setShowTimeModal(true)}
          style={styles.dateTimeBox}
        >
          <Ionicons name="time-outline" size={24} color={theme.colors.primary} />
          <View style={styles.dateTimeTextContainer}>
            <Text style={styles.dateTimeLabel}>Time</Text>
            <Text style={styles.dateTimeValue}>{formatTime(date)}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.textLight} />
        </TouchableOpacity>
      </View>

      <View style={styles.addressSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your Address</Text>
          <TouchableOpacity
            style={styles.addAddressButton}
            onPress={() => {
              setCurrentAddress({
                id: Date.now().toString(),
                street: '',
                city: '',
                state: '',
                postalCode: '',
                country: 'Kenya',
                isDefault: addresses.length === 0
              });
              setIsEditMode(false);
              showBottomSheet();
            }}
          >
            <Ionicons name="add-circle-outline" size={20} color={theme.colors.primary} />
            <Text style={styles.addAddressText}>Add New</Text>
          </TouchableOpacity>
        </View>

        {addresses.length > 0 ? (
          <View style={styles.addressesList}>
            {addresses.map(address => renderAddressItem(address))}
          </View>
        ) : (
          <TouchableOpacity
            style={styles.emptyAddressButton}
            onPress={() => {
              setCurrentAddress({
                id: Date.now().toString(),
                street: '',
                city: '',
                state: '',
                postalCode: '',
                country: 'Kenya',
                isDefault: true
              });
              setIsEditMode(false);
              showBottomSheet();
            }}
          >
            <Ionicons name="add-circle-outline" size={24} color={theme.colors.primary} />
            <Text style={styles.emptyAddressText}>Add your first address</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.label}>Or enter address manually</Text>
        <TextInput
          style={styles.input}
          value={address}
          onChangeText={setAddress}
          placeholder="Enter your address"
          placeholderTextColor={theme.colors.textLight}
        />
      </View>

      <Text style={styles.label}>Additional Notes</Text>
      <TextInput
        style={[styles.input, { height: 100 }]}
        value={notes}
        onChangeText={setNotes}
        placeholder="Add any specific instructions"
        multiline
      />

      <TouchableOpacity style={styles.button} onPress={handleBooking}>
        <Text style={styles.buttonText}>Continue to Summary</Text>
      </TouchableOpacity>
      
      {/* Bottom safe area to prevent button from clashing with phone navigation */}
      <View style={{ height: insets.bottom + 20 }} />

      {/* Custom Date Modal */}
      <Modal
        visible={showDateModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowDateModal(false)}>
                <Text style={styles.modalHeaderButton}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Select Date</Text>
              <TouchableOpacity onPress={confirmDateSelection}>
                <Text style={styles.modalHeaderButton}>Done</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.pickerContainer}>
              {/* Month Picker */}
              <View style={styles.pickerColumn}>
                <FlatList
                  data={months}
                  initialScrollIndex={selectedMonth}
                  getItemLayout={(data, index) => ({
                    length: 50,
                    offset: 50 * index,
                    index,
                  })}
                  renderItem={({ item, index }) => (
                    <TouchableOpacity
                      style={[styles.pickerItem, index === selectedMonth && styles.selectedPickerItem]}
                      onPress={() => setSelectedMonth(index)}
                    >
                      <Text
                        style={[
                          styles.pickerItemText,
                          index === selectedMonth && styles.selectedPickerItemText
                        ]}
                      >
                        {item}
                      </Text>
                    </TouchableOpacity>
                  )}
                  keyExtractor={(item) => item}
                  showsVerticalScrollIndicator={false}
                />
              </View>

              {/* Day Picker */}
              <View style={styles.pickerColumn}>
                <FlatList
                  data={days}
                  initialScrollIndex={selectedDay - 1}
                  getItemLayout={(data, index) => ({
                    length: 50,
                    offset: 50 * index,
                    index,
                  })}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[styles.pickerItem, item === selectedDay && styles.selectedPickerItem]}
                      onPress={() => setSelectedDay(item)}
                    >
                      <Text
                        style={[
                          styles.pickerItemText,
                          item === selectedDay && styles.selectedPickerItemText
                        ]}
                      >
                        {item}
                      </Text>
                    </TouchableOpacity>
                  )}
                  keyExtractor={(item) => item.toString()}
                  showsVerticalScrollIndicator={false}
                />
              </View>

              {/* Year Picker */}
              <View style={styles.pickerColumn}>
                <FlatList
                  data={years}
                  initialScrollIndex={years.indexOf(selectedYear)}
                  getItemLayout={(data, index) => ({
                    length: 50,
                    offset: 50 * index,
                    index,
                  })}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[styles.pickerItem, item === selectedYear && styles.selectedPickerItem]}
                      onPress={() => setSelectedYear(item)}
                    >
                      <Text
                        style={[
                          styles.pickerItemText,
                          item === selectedYear && styles.selectedPickerItemText
                        ]}
                      >
                        {item}
                      </Text>
                    </TouchableOpacity>
                  )}
                  keyExtractor={(item) => item.toString()}
                  showsVerticalScrollIndicator={false}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Custom Time Modal */}
      <Modal
        visible={showTimeModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowTimeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowTimeModal(false)}>
                <Text style={styles.modalHeaderButton}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Select Time</Text>
              <TouchableOpacity onPress={confirmTimeSelection}>
                <Text style={styles.modalHeaderButton}>Done</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.pickerContainer}>
              {/* Hour Picker */}
              <View style={styles.pickerColumn}>
                <FlatList
                  data={hours}
                  initialScrollIndex={hours.indexOf(selectedHour)}
                  getItemLayout={(data, index) => ({
                    length: 50,
                    offset: 50 * index,
                    index,
                  })}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[styles.pickerItem, item === selectedHour && styles.selectedPickerItem]}
                      onPress={() => setSelectedHour(item)}
                    >
                      <Text
                        style={[
                          styles.pickerItemText,
                          item === selectedHour && styles.selectedPickerItemText
                        ]}
                      >
                        {item}
                      </Text>
                    </TouchableOpacity>
                  )}
                  keyExtractor={(item) => item.toString()}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.pickerContentContainer}
                />
              </View>

              {/* Minute Picker */}
              <View style={styles.pickerColumn}>
                <FlatList
                  data={minutes}
                  initialScrollIndex={minutes.indexOf(selectedMinute)}
                  getItemLayout={(data, index) => ({
                    length: 50,
                    offset: 50 * index,
                    index,
                  })}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[styles.pickerItem, item === selectedMinute && styles.selectedPickerItem]}
                      onPress={() => setSelectedMinute(item)}
                    >
                      <Text
                        style={[
                          styles.pickerItemText,
                          item === selectedMinute && styles.selectedPickerItemText
                        ]}
                      >
                        {item.toString().padStart(2, '0')}
                      </Text>
                    </TouchableOpacity>
                  )}
                  keyExtractor={(item) => item.toString()}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.pickerContentContainer}
                />
              </View>

              {/* AM/PM Picker */}
              <View style={styles.pickerColumn}>
                <FlatList
                  data={amPm}
                  initialScrollIndex={amPm.indexOf(selectedAmPm)}
                  getItemLayout={(data, index) => ({
                    length: 50,
                    offset: 50 * index,
                    index,
                  })}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[styles.pickerItem, item === selectedAmPm && styles.selectedPickerItem]}
                      onPress={() => setSelectedAmPm(item)}
                    >
                      <Text
                        style={[
                          styles.pickerItemText,
                          item === selectedAmPm && styles.selectedPickerItemText
                        ]}
                      >
                        {item}
                      </Text>
                    </TouchableOpacity>
                  )}
                  keyExtractor={(item) => item}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.pickerContentContainer}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {isBottomSheetVisible && renderBottomSheet()}
    </ScrollView>
  );
};

const createStyles = createThemedStyles(theme => ({
  container: {
    backgroundColor: theme.colors.background,
    padding: 20,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 10,
    padding: 15,
    backgroundColor: theme.dark ? 'rgba(255,255,255,0.05)' : '#f9f9f9',
    borderRadius: 10,
  },
  taskerInfo: {
    flex: 1,
    marginLeft: 10,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  detail: {
    fontSize: 14,
    color: theme.colors.textLight,
    marginBottom: 2,
  },

  dateTimeSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 15,
  },
  dateTimeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: theme.dark ? 'rgba(255,255,255,0.05)' : '#f8f9fd',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.dark ? 'rgba(255,255,255,0.1)' : '#eee',
    marginBottom: 15,
  },
  dateTimeTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  dateTimeLabel: {
    fontSize: 12,
    color: theme.colors.textLight,
    marginBottom: 4,
  },
  dateTimeValue: {
    fontSize: 16,
    color: theme.colors.text,
    fontWeight: '500',
  },
  label: {
    marginTop: 10,
    marginBottom: 8,
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.dark ? 'rgba(255,255,255,0.1)' : '#ccc',
    borderRadius: 10,
    padding: 12,
    marginBottom: 15,
    backgroundColor: theme.dark ? 'rgba(255,255,255,0.05)' : '#fafafa',
    color: theme.colors.text,
  },
  button: {
    marginTop: 15,
    marginBottom: 30,
    backgroundColor: theme.colors.primary,
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 30,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.dark ? 'rgba(255,255,255,0.1)' : '#eee',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: theme.colors.text,
  },
  modalHeaderButton: {
    fontSize: 17,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  pickerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
    height: 200,
  },
  pickerColumn: {
    flex: 1,
    height: 200,
  },
  pickerContentContainer: {
    paddingVertical: 75, // Add padding to center items in the visible area
  },
  pickerItem: {
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedPickerItem: {
    backgroundColor: theme.dark ? 'rgba(74, 128, 240, 0.1)' : '#f0f5ff',
  },
  pickerItemText: {
    fontSize: 16,
    color: theme.colors.text,
  },
  selectedPickerItemText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  addressSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  addAddressButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addAddressText: {
    color: theme.colors.primary,
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '600',
  },
  addressesList: {
    marginBottom: 15,
  },
  addressItem: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  selectedAddressItem: {
    borderColor: theme.colors.primary,
    borderWidth: 2,
  },
  addressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  defaultBadge: {
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  defaultBadgeText: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  addressLine: {
    fontSize: 14,
    color: theme.colors.text,
    marginBottom: 4,
  },
  emptyAddressButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
  },
  emptyAddressText: {
    color: theme.colors.primary,
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  locationButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalForm: {
    maxHeight: '80%',
  },
  inputLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 5,
  },
  disabledInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 15,
    backgroundColor: theme.dark ? 'rgba(255, 255, 255, 0.05)' : '#f5f5f5',
  },
  disabledInputText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  defaultCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
    marginBottom: 20,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  checkboxChecked: {
    backgroundColor: theme.colors.primary,
  },
  checkboxLabel: {
    fontSize: 16,
    color: theme.colors.text,
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  bottomSheetHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.dark ? 'rgba(255,255,255,0.1)' : '#eee',
    alignItems: 'center',
  },
  bottomSheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: theme.dark ? 'rgba(255,255,255,0.3)' : '#ccc',
    borderRadius: 2,
    marginBottom: 8,
  },
  bottomSheetTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  bottomSheetContent: {
    padding: 16,
  },
  addressItemContent: {
    flex: 1,
  },
  deleteButton: {
    padding: 8,
  },
  chatButton: {
    padding: 8,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingVertical: 30,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  headerSpacer: {
    width: 40,
  },
}));

export default BookingScreen;