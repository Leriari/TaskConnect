import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  Dimensions,
  Platform
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/app/context/ThemeContext';
import { createThemedStyles, useThemedStyles } from '@/app/hooks/useThemedStyles';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { doc, getDoc, collection, query, where, getDocs, addDoc, updateDoc, arrayUnion, serverTimestamp, limit } from 'firebase/firestore';
import { db } from '@/firebase-config';
import { auth } from '@/firebase-config';

interface TaskerData {
  id: string;
  firstName?: string;
  lastName?: string;
  taskerName?: string;
  bio?: string;
  phoneNumber?: string;
  phone?: string;
  email?: string;
  profileImageBase64?: string;
  areasServed?: string[];
  services?: Service[];
  category?: string;
  price?: string;
  rating?: number;
  totalReviews?: number;
  onboardingStatus?: 'pendingVerification' | 'completed';
  kraPin?: string;
  idNumber?: string;
  supportingDocuments?: any[];
  submissionDate?: string;
  [key: string]: any;
}

interface Service {
  id: string;
  category: string;
  title: string;
  rate: string;
  description: string;
  isCustom?: boolean;
  taskerId?: string;
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

const { width } = Dimensions.get('window');

const CustomerTaskerProfileScreen = () => {
  const { taskerId, taskerData } = useLocalSearchParams();
  const router = useRouter();
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  
  const [tasker, setTasker] = useState<TaskerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [userHasReviewed, setUserHasReviewed] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [editRating, setEditRating] = useState(0);
  const [editComment, setEditComment] = useState('');
  const [submittingEdit, setSubmittingEdit] = useState(false);

  useEffect(() => {
    console.log('🔍 DEBUG: useEffect triggered with taskerId:', taskerId, 'taskerData:', taskerData);
    loadTaskerData();
  }, [taskerId, taskerData]);

  // Load reviews when tasker data is available
  useEffect(() => {
    if (tasker?.id) {
      console.log('🔍 DEBUG: Tasker data loaded, now loading reviews');
      loadReviews();
    }
  }, [tasker]);

  const loadTaskerData = async () => {
    try {
      setLoading(true);
      let taskerInfo: TaskerData | null = null;

      console.log('🔍 DEBUG: Starting loadTaskerData');
      console.log('🔍 DEBUG: taskerData param:', taskerData);
      console.log('🔍 DEBUG: taskerId param:', taskerId);

      // If taskerData is passed as a parameter, use it
      if (taskerData) {
        console.log('🔍 DEBUG: Using taskerData from params');
        taskerInfo = JSON.parse(taskerData as string);
        console.log('🔍 DEBUG: Parsed taskerData:', taskerInfo);
      } else if (taskerId) {
        console.log('🔍 DEBUG: Fetching from Firestore with taskerId:', taskerId);
        // Fetch from Firestore using taskerId (same as TaskerProfileScreen but with taskerId)
        const taskerDoc = await getDoc(doc(db, 'taskers', taskerId as string));
        console.log('🔍 DEBUG: Firestore doc exists:', taskerDoc.exists());
        
        if (taskerDoc.exists()) {
          const docData = taskerDoc.data();
          console.log('🔍 DEBUG: Raw Firestore data:', docData);
          taskerInfo = { id: taskerDoc.id, ...docData } as TaskerData;
          console.log('🔍 DEBUG: Processed taskerInfo:', taskerInfo);
        } else {
          console.log('🔍 DEBUG: Tasker document does not exist in Firestore');
        }
      } else {
        console.log('🔍 DEBUG: No taskerData or taskerId provided');
      }

      if (taskerInfo) {
        console.log('🔍 DEBUG: Setting tasker state with:', taskerInfo);
        console.log('🔍 DEBUG: Bio field:', taskerInfo.bio);
        console.log('🔍 DEBUG: Areas served:', taskerInfo.areasServed);
        console.log('🔍 DEBUG: Profile image exists:', !!taskerInfo.profileImageBase64);
        console.log('🔍 DEBUG: Services:', taskerInfo.services);
        console.log('🔍 DEBUG: Phone:', taskerInfo.phoneNumber || taskerInfo.phone);
        console.log('🔍 DEBUG: Email:', taskerInfo.email);
        console.log('🔍 DEBUG: Total Reviews:', taskerInfo.totalReviews);
        
        // Use the data directly like TaskerProfileScreen does, without reformatting
        setTasker(taskerInfo);
        setError(null);
        console.log('🔍 DEBUG: Tasker state set successfully');
      } else {
        console.log('🔍 DEBUG: No tasker info found, setting error');
        setError('Tasker not found');
      }
    } catch (error) {
      console.error('🔍 DEBUG: Error loading tasker data:', error);
      setError('Failed to load tasker information');
    } finally {
      setLoading(false);
      console.log('🔍 DEBUG: Loading finished');
    }
  };

  // Calculate average rating from reviews
  const calculateAverageRating = (reviews: Review[]): number => {
    if (reviews.length === 0) return 0;
    const totalStars = reviews.reduce((sum, review) => sum + review.rating, 0);
    const average = totalStars / reviews.length;
    console.log('🔍 DEBUG CALC: Calculating average rating from', reviews.length, 'reviews');
    console.log('🔍 DEBUG CALC: Total stars:', totalStars);
    console.log('🔍 DEBUG CALC: Average rating:', average);
    return average;
  };

  // Get the calculated average rating
  const averageRating = calculateAverageRating(reviews);

  const loadReviews = async () => {
    if (!tasker?.id) {
      console.log('🔍 DEBUG LOAD REVIEWS: No tasker ID available');
      return;
    }

    // Use the correct tasker ID for loading reviews
    const correctTaskerId = (tasker as any).taskerFirestoreId || (tasker as any).taskerIdString || tasker.id;
    console.log('🔍 DEBUG LOAD REVIEWS: Using tasker ID:', correctTaskerId);
    console.log('🔍 DEBUG LOAD REVIEWS: Tasker object:', tasker);

    try {
      const reviewsRef = collection(db, 'reviews');
      const q = query(reviewsRef, where('taskerId', '==', correctTaskerId));
      console.log('🔍 DEBUG LOAD REVIEWS: Query created, executing...');
      
      const querySnapshot = await getDocs(q);
      console.log('🔍 DEBUG LOAD REVIEWS: Query executed, found', querySnapshot.size, 'reviews');
      
      const reviewsData: Review[] = [];
      querySnapshot.forEach((doc) => {
        const reviewData = doc.data();
        console.log('🔍 DEBUG LOAD REVIEWS: Review data:', reviewData);
        reviewsData.push({ id: doc.id, ...reviewData } as Review);
      });

      console.log('🔍 DEBUG LOAD REVIEWS: Processed reviews:', reviewsData);

      // Sort by creation date (newest first)
      reviewsData.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
        return dateB.getTime() - dateA.getTime();
      });
      
      console.log('🔍 DEBUG LOAD REVIEWS: Setting reviews state with', reviewsData.length, 'reviews');
      setReviews(reviewsData);

      // Check if current user has already reviewed
      const currentUser = auth.currentUser;
      if (currentUser) {
        const userReview = reviewsData.find(review => review.reviewerId === currentUser.uid);
        setUserHasReviewed(!!userReview);
        console.log('🔍 DEBUG LOAD REVIEWS: User has reviewed:', !!userReview);
      }
    } catch (error) {
      console.error('🔍 DEBUG LOAD REVIEWS: Error loading reviews:', error);
    }
  };

  const handleBookNow = () => {
    if (!tasker) return;
    
    // Navigate to booking screen with tasker data
    router.push({
      pathname: '/home/screens/bookingScreen',
      params: {
        tasker: JSON.stringify(tasker)
      }
    });
  };

  const handleChat = async () => {
    if (!auth.currentUser || !tasker) {
      Alert.alert('Error', 'You must be logged in to chat with the tasker.');
      return;
    }

    try {
      // Check if conversation already exists
      const conversationsRef = collection(db, 'conversations');
      const q = query(
        conversationsRef,
        where('participants', 'array-contains', auth.currentUser?.uid)
      );
      const querySnapshot = await getDocs(q);
      
      // Use the correct tasker ID for chat
      const correctTaskerId = (tasker as any).taskerFirestoreId || (tasker as any).taskerIdString || tasker.id;
      
      // Filter results to find conversation with both participants
      const existingConversation = querySnapshot.docs.find(doc => {
        const data = doc.data();
        return data.participants &&
          data.participants.includes(auth.currentUser?.uid) &&
          data.participants.includes(correctTaskerId);
      });

      let conversationId;
      if (existingConversation) {
        conversationId = existingConversation.id;
      } else {
        // Create new conversation
        const conversationRef = await addDoc(conversationsRef, {
          participants: [auth.currentUser.uid, correctTaskerId],
          lastMessage: 'Chat created. Say hello!',
          lastMessageTimestamp: serverTimestamp(),
          createdAt: serverTimestamp(),
        });
        conversationId = conversationRef.id;
      }

      // Navigate to chat room
      router.push({
        pathname: '/home/screens/ChatRoomScreen',
        params: {
          chatId: conversationId,
          otherParticipantId: correctTaskerId,
          otherParticipantName: tasker.taskerName || `${tasker.firstName} ${tasker.lastName}`.trim() || 'Tasker',
          otherParticipantPhoto: tasker.profileImageBase64 ? `data:image/jpeg;base64,${tasker.profileImageBase64}` : ''
        }
      });
    } catch (error) {
      console.error('Error navigating to chat:', error);
      Alert.alert('Error', 'Failed to open chat. Please try again.');
    }
  };

  const handleSubmitReview = async () => {
    console.log('🔍 DEBUG REVIEW: Auth current user:', auth.currentUser);
    console.log('🔍 DEBUG REVIEW: Auth current user UID:', auth.currentUser?.uid);
    console.log('🔍 DEBUG REVIEW: Auth current user email:', auth.currentUser?.email);
    console.log('🔍 DEBUG REVIEW: Auth current user displayName:', auth.currentUser?.displayName);
    console.log('🔍 DEBUG REVIEW: Tasker exists:', !!tasker);
    
    // Force refresh the auth state
    await auth.currentUser?.reload();
    console.log('🔍 DEBUG REVIEW: After reload - Auth current user UID:', auth.currentUser?.uid);
    
    if (!auth.currentUser || !tasker) {
      Alert.alert('Error', 'You must be logged in to submit a review.');
      return;
    }

    if (rating === 0) {
      Alert.alert('Error', 'Please select a rating.');
      return;
    }

    if (!comment.trim()) {
      Alert.alert('Error', 'Please write a comment.');
      return;
    }

    setSubmittingReview(true);
    try {
      console.log('🔍 DEBUG REVIEW: Current user UID:', auth.currentUser.uid);
      console.log('🔍 DEBUG REVIEW: Tasker ID:', tasker.id);
      console.log('🔍 DEBUG REVIEW: Tasker ID type:', typeof tasker.id);
      console.log('🔍 DEBUG REVIEW: Tasker Firestore ID:', (tasker as any).taskerFirestoreId);
      console.log('🔍 DEBUG REVIEW: Tasker ID String:', (tasker as any).taskerIdString);
      
      // Use the correct tasker ID - prefer taskerFirestoreId, fallback to taskerIdString, then tasker.id
      const correctTaskerId = (tasker as any).taskerFirestoreId || (tasker as any).taskerIdString || tasker.id;
      console.log('🔍 DEBUG REVIEW: Using tasker ID:', correctTaskerId);
      
      if (!correctTaskerId) {
        throw new Error('Tasker ID is missing or invalid');
      }
      
      // Add review to Firestore
      const reviewData = {
        taskerId: correctTaskerId,
        reviewerId: auth.currentUser.uid,
        reviewerName: auth.currentUser.displayName || 'Anonymous',
        rating: rating,
        comment: comment.trim(),
        createdAt: serverTimestamp(),
      };

      console.log('🔍 DEBUG REVIEW: Review data being submitted:', reviewData);
      console.log('🔍 DEBUG REVIEW: About to call addDoc...');
      
      // Test with minimal data first
      const testReviewData = {
        taskerId: correctTaskerId,
        reviewerId: auth.currentUser.uid,
        rating: rating,
        comment: comment.trim(),
        createdAt: serverTimestamp(),
      };
      console.log('🔍 DEBUG REVIEW: Test review data:', testReviewData);
      
      // Test if we can read from reviews collection first
      try {
        console.log('🔍 DEBUG REVIEW: Testing read permission...');
        const testQuery = query(collection(db, 'reviews'), limit(1));
        const testSnapshot = await getDocs(testQuery);
        console.log('🔍 DEBUG REVIEW: Read test successful, found', testSnapshot.size, 'documents');
      } catch (readError) {
        console.error('🔍 DEBUG REVIEW: Read test failed:', readError);
      }
      
      // Try with the most basic data first
      try {
        console.log('🔍 DEBUG REVIEW: Trying with minimal data...');
        const minimalReviewData = {
          taskerId: correctTaskerId,
          reviewerId: auth.currentUser.uid,
          rating: 5,
          comment: 'Test review',
          createdAt: serverTimestamp(),
        };
        const minimalDocRef = await addDoc(collection(db, 'reviews'), minimalReviewData);
        console.log('🔍 DEBUG REVIEW: Minimal review created successfully with ID:', minimalDocRef.id);
        
        // If minimal works, try the full review
        const docRef = await addDoc(collection(db, 'reviews'), reviewData);
        console.log('🔍 DEBUG REVIEW: Full review created successfully with ID:', docRef.id);
      } catch (minimalError: any) {
        console.error('🔍 DEBUG REVIEW: Minimal review failed:', minimalError);
        throw minimalError;
      }

      // Update tasker's total reviews count only
      const newTotalReviews = (tasker.totalReviews || 0) + 1;

      console.log('🔍 DEBUG REVIEW: Updating tasker total reviews...');
      console.log('🔍 DEBUG REVIEW: Current totalReviews:', tasker.totalReviews);
      console.log('🔍 DEBUG REVIEW: New totalReviews:', newTotalReviews);
      console.log('🔍 DEBUG REVIEW: Tasker ID for update:', correctTaskerId);

      try {
        await updateDoc(doc(db, 'taskers', correctTaskerId), {
          totalReviews: newTotalReviews,
        });
        console.log('🔍 DEBUG REVIEW: Tasker total reviews updated successfully');
      } catch (ratingError: any) {
        console.error('🔍 DEBUG REVIEW: Failed to update tasker total reviews:', ratingError);
        console.error('🔍 DEBUG REVIEW: Rating error code:', ratingError.code);
        console.error('🔍 DEBUG REVIEW: Rating error message:', ratingError.message);
        // Don't fail the entire review submission if rating update fails
        // The review was already saved successfully
      }

      // Update local state
      setTasker(prev => prev ? {
        ...prev,
        totalReviews: newTotalReviews,
      } : null);

      setUserHasReviewed(true);
      setShowRatingModal(false);
      setRating(0);
      setComment('');
      
      // Reload reviews
      await loadReviews();

      Alert.alert('Success', 'Your review has been submitted successfully! The tasker\'s rating will be updated shortly.');
    } catch (error: any) {
      console.error('🔍 DEBUG REVIEW ERROR:', error);
      console.error('🔍 DEBUG REVIEW ERROR CODE:', error.code);
      console.error('🔍 DEBUG REVIEW ERROR MESSAGE:', error.message);
      console.error('🔍 DEBUG REVIEW ERROR DETAILS:', error.details);
      
      if (error.code === 'permission-denied') {
        Alert.alert('Permission Error', 'You do not have permission to submit this review. Please make sure you are logged in.');
      } else {
        Alert.alert('Error', `Failed to submit review: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleEditReview = (review: Review) => {
    setEditingReview(review);
    setEditRating(review.rating);
    setEditComment(review.comment);
    setShowEditModal(true);
  };

  const handleSubmitEdit = async () => {
    if (!editingReview || !auth.currentUser) return;

    if (editRating === 0) {
      Alert.alert('Error', 'Please select a rating.');
      return;
    }

    if (!editComment.trim()) {
      Alert.alert('Error', 'Please write a comment.');
      return;
    }

    setSubmittingEdit(true);
    try {
      console.log('🔍 DEBUG EDIT: Updating review:', editingReview.id);
      console.log('🔍 DEBUG EDIT: New rating:', editRating);
      console.log('🔍 DEBUG EDIT: New comment:', editComment);

      // Update the review in Firestore
      await updateDoc(doc(db, 'reviews', editingReview.id), {
        rating: editRating,
        comment: editComment.trim(),
        updatedAt: serverTimestamp(),
      });

      console.log('🔍 DEBUG EDIT: Review updated successfully');

      // Update local state
      setReviews(prev => prev.map(review => 
        review.id === editingReview.id 
          ? { ...review, rating: editRating, comment: editComment.trim() }
          : review
      ));

      setShowEditModal(false);
      setEditingReview(null);
      setEditRating(0);
      setEditComment('');

      Alert.alert('Success', 'Your review has been updated successfully!');
    } catch (error: any) {
      console.error('🔍 DEBUG EDIT ERROR:', error);
      Alert.alert('Error', `Failed to update review: ${error.message || 'Unknown error'}`);
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleCancelEdit = () => {
    setShowEditModal(false);
    setEditingReview(null);
    setEditRating(0);
    setEditComment('');
  };

  const renderStars = (rating: number = 0, interactive = false, onPress?: (starIndex: number) => void) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      let starName: "star" | "star-outline" | "star-half" = "star-outline";
      let starColor = theme.colors.textLight;
      
      if (i <= Math.floor(rating)) {
        // Full star
        starName = "star";
        starColor = "#FFD700";
      } else if (i === Math.ceil(rating) && rating % 1 !== 0) {
        // Half star for decimal ratings
        starName = "star-half";
        starColor = "#FFD700";
      }
      
      stars.push(
        <TouchableOpacity
          key={i}
          onPress={() => interactive && onPress && onPress(i)}
          disabled={!interactive}
        >
          <Ionicons
            name={starName}
            size={interactive ? 32 : 16}
            color={starColor}
            style={styles.starIcon}
          />
        </TouchableOpacity>
      );
    }
    return stars;
  };

  const formatDate = (date: any) => {
    if (!date) return '';
    const dateObj = date.toDate ? date.toDate() : new Date(date);
    return dateObj.toLocaleDateString();
  };

  // Convert base64 to image source (same as TaskerProfileScreen)
  const base64ToImageSource = (base64String: string | null) => {
    if (!base64String) return undefined;
    // Add the data URI prefix if it's not already there
    return { uri: `data:image/jpeg;base64,${base64String}` };
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading Tasker Profile...</Text>
      </View>
    );
  }

  if (error || !tasker) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Ionicons name="alert-circle-outline" size={50} color={theme.colors.textSecondary} />
        <Text style={styles.errorText}>{error || 'Tasker not found'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => router.back()}>
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const taskerName = tasker.taskerName || 
    (tasker.firstName && tasker.lastName ? `${tasker.firstName} ${tasker.lastName}`.trim() : 'Tasker');

  // Debug logging for render
  console.log('🔍 DEBUG RENDER: Current tasker state:', tasker);
  console.log('🔍 DEBUG RENDER: Tasker name:', taskerName);
  console.log('🔍 DEBUG RENDER: Bio exists:', !!tasker.bio);
  console.log('🔍 DEBUG RENDER: Bio content:', tasker.bio);
  console.log('🔍 DEBUG RENDER: Areas served exists:', !!tasker.areasServed);
  console.log('🔍 DEBUG RENDER: Areas served content:', tasker.areasServed);
  console.log('🔍 DEBUG RENDER: Profile image exists:', !!tasker.profileImageBase64);
  console.log('🔍 DEBUG RENDER: Profile image length:', tasker.profileImageBase64?.length);
  console.log('🔍 DEBUG RENDER: Profile image first 50 chars:', tasker.profileImageBase64?.substring(0, 50));
  console.log('🔍 DEBUG RENDER: taskerProfileImage exists:', !!tasker.taskerProfileImage);
  console.log('🔍 DEBUG RENDER: taskerProfileImage length:', tasker.taskerProfileImage?.length);
  console.log('🔍 DEBUG RENDER: Services exists:', !!tasker.services);
  console.log('🔍 DEBUG RENDER: Services content:', tasker.services);
  console.log('🔍 DEBUG RENDER: Reviews state:', reviews);
  console.log('🔍 DEBUG RENDER: Reviews length:', reviews.length);
  console.log('🔍 DEBUG RENDER: Calculated Average Rating:', averageRating);
  console.log('🔍 DEBUG RENDER: Total Reviews from reviews array:', reviews.length);

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {/* Header with back button */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Tasker Profile</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Profile Image and Basic Info */}
        <View style={styles.profileSection}>
          <View style={styles.profileImageContainer}>
            {(tasker.profileImageBase64 || tasker.taskerProfileImage) ? (
              <Image
                source={base64ToImageSource(tasker.profileImageBase64 || tasker.taskerProfileImage)}
                style={styles.profileImage}
                onError={(error) => console.log('🔍 DEBUG IMAGE ERROR:', error.nativeEvent)}
                onLoad={() => console.log('🔍 DEBUG IMAGE LOADED SUCCESSFULLY')}
              />
            ) : (
              <View style={styles.profileImagePlaceholder}>
                <Ionicons name="person" size={40} color={theme.colors.primary} />
              </View>
            )}
          </View>
          
          <Text style={styles.taskerName}>{taskerName}</Text>
          
          {tasker.category && (
            <Text style={styles.category}>{tasker.category}</Text>
          )}
          
          {tasker.price && (
            <Text style={styles.price}>{tasker.price}</Text>
          )}

          {/* Rating */}
          <View style={styles.ratingContainer}>
            <View style={styles.starsContainer}>
              {renderStars(averageRating)}
            </View>
            <Text style={styles.ratingText}>
              {averageRating > 0 ? averageRating.toFixed(1) : '0.0'} 
              {reviews.length > 0 && ` (${reviews.length} reviews)`}
            </Text>
          </View>

          {/* Rate Button */}
          {!userHasReviewed && auth.currentUser && (
            <TouchableOpacity 
              style={styles.rateButton}
              onPress={() => setShowRatingModal(true)}
            >
              <Ionicons name="star-outline" size={20} color={theme.colors.primary} />
              <Text style={styles.rateButtonText}>Rate this Tasker</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Bio Section */}
        {tasker.bio && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.bioText}>{tasker.bio}</Text>
          </View>
        )}

        {/* Contact Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          {(tasker.phoneNumber || tasker.phone) && (
            <View style={styles.contactItem}>
              <Ionicons name="call-outline" size={20} color={theme.colors.primary} />
              <Text style={styles.contactText}>{tasker.phoneNumber || tasker.phone}</Text>
            </View>
          )}
          {tasker.email && (
            <View style={styles.contactItem}>
              <Ionicons name="mail-outline" size={20} color={theme.colors.primary} />
              <Text style={styles.contactText}>{tasker.email}</Text>
            </View>
          )}
        </View>

        {/* Services Section */}
        {tasker.services && tasker.services.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Services</Text>
            <View style={styles.servicesContainer}>
              {tasker.services.map((service, index) => (
                <View key={index} style={styles.serviceTag}>
                  <Text style={styles.serviceText}>
                    {service.title}
                  </Text>
                  {service.rate && (
                    <Text style={styles.serviceRate}>{service.rate}</Text>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Areas Served Section */}
        {tasker.areasServed && tasker.areasServed.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Areas Served</Text>
            <View style={styles.areasContainer}>
              {tasker.areasServed.map((area, index) => (
                <View key={index} style={styles.areaTag}>
                  <Ionicons name="location-outline" size={14} color={theme.colors.primary} />
                  <Text style={styles.areaText}>{area}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Reviews Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reviews ({reviews.length})</Text>
          {reviews.length > 0 ? (
            <View style={styles.reviewsContainer}>
              {reviews.map((review) => (
                <View key={review.id} style={styles.reviewItem}>
                  <View style={styles.reviewHeader}>
                    <View style={styles.reviewerInfo}>
                      <Text style={styles.reviewerName}>{review.reviewerName}</Text>
                      <Text style={styles.reviewDate}>{formatDate(review.createdAt)}</Text>
                    </View>
                    {auth.currentUser && review.reviewerId === auth.currentUser.uid && (
                      <TouchableOpacity 
                        style={styles.editButton}
                        onPress={() => handleEditReview(review)}
                      >
                        <Ionicons name="create-outline" size={16} color={theme.colors.primary} />
                        <Text style={styles.editButtonText}>Edit</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <View style={styles.reviewStars}>
                    {renderStars(review.rating)}
                  </View>
                  <Text style={styles.reviewComment}>{review.comment}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.noReviewsText}>No reviews yet. Be the first to review this tasker!</Text>
          )}
        </View>

        {/* Bottom safe area */}
        <View style={{ height: insets.bottom + 100 }} />
      </ScrollView>

      {/* Action Buttons */}
      <View style={[styles.actionButtons, { paddingBottom: insets.bottom + 20 }]}>
        <TouchableOpacity style={styles.chatButton} onPress={handleChat}>
          <Ionicons name="chatbubble-outline" size={20} color={theme.colors.primary} />
          <Text style={styles.chatButtonText}>Chat</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.bookButton} onPress={handleBookNow}>
          <Text style={styles.bookButtonText}>Book Now</Text>
        </TouchableOpacity>
      </View>

      {/* Rating Modal */}
      <Modal
        visible={showRatingModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowRatingModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Rate {taskerName}</Text>
              <TouchableOpacity onPress={() => setShowRatingModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.ratingModalContent}>
              <Text style={styles.ratingLabel}>Your Rating</Text>
              <View style={styles.interactiveStars}>
                {renderStars(rating, true, setRating)}
              </View>

              <Text style={styles.commentLabel}>Your Review</Text>
              <TextInput
                style={styles.commentInput}
                placeholder="Share your experience with this tasker..."
                placeholderTextColor={theme.colors.textLight}
                value={comment}
                onChangeText={setComment}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setShowRatingModal(false)}
                  disabled={submittingReview}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.submitButton]}
                  onPress={handleSubmitReview}
                  disabled={submittingReview}
                >
                  {submittingReview ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.submitButtonText}>Submit Review</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Review Modal */}
      <Modal
        visible={showEditModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Your Review</Text>
              <TouchableOpacity onPress={handleCancelEdit}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.ratingModalContent}>
              <Text style={styles.ratingLabel}>Your Rating</Text>
              <View style={styles.interactiveStars}>
                {renderStars(editRating, true, setEditRating)}
              </View>

              <Text style={styles.commentLabel}>Your Review</Text>
              <TextInput
                style={styles.commentInput}
                placeholder="Share your experience with this tasker..."
                placeholderTextColor={theme.colors.textLight}
                value={editComment}
                onChangeText={setEditComment}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={handleCancelEdit}
                  disabled={submittingEdit}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.submitButton]}
                  onPress={handleSubmitEdit}
                  disabled={submittingEdit}
                >
                  {submittingEdit ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.submitButtonText}>Update Review</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const createStyles = createThemedStyles(theme => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  contentContainer: {
    padding: 16,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: theme.colors.error,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingVertical: 30,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  headerSpacer: {
    width: 24,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  profileSection: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: theme.dark ? 0.3 : 0.05,
        shadowRadius: 3.84,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  profileImageContainer: {
    marginBottom: 15,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  profileImagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  taskerName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 5,
  },
  category: {
    fontSize: 16,
    color: theme.colors.primary,
    fontWeight: '600',
    marginBottom: 5,
  },
  price: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 10,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  starsContainer: {
    flexDirection: 'row',
    marginRight: 8,
  },
  starIcon: {
    marginRight: 2,
  },
  ratingText: {
    fontSize: 14,
    color: theme.colors.textLight,
  },
  rateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  rateButtonText: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  section: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: theme.dark ? 0.3 : 0.05,
        shadowRadius: 3.84,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 15,
  },
  bioText: {
    fontSize: 16,
    color: theme.colors.text,
    lineHeight: 24,
  },
  servicesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  serviceTag: {
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    minWidth: 100,
  },
  serviceText: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  serviceRate: {
    color: theme.colors.primary,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 2,
  },
  areasContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  areaTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  areaText: {
    color: theme.colors.text,
    fontSize: 14,
    marginLeft: 5,
  },
  reviewsContainer: {
    gap: 15,
  },
  reviewItem: {
    backgroundColor: theme.colors.card,
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewerInfo: {
    flex: 1,
  },
  reviewerName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  reviewDate: {
    fontSize: 12,
    color: theme.colors.textLight,
    marginTop: 2,
  },
  reviewStars: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  reviewComment: {
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 20,
  },
  noReviewsText: {
    fontSize: 14,
    color: theme.colors.textLight,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 15,
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    gap: 15,
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    backgroundColor: 'transparent',
  },
  chatButtonText: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  bookButton: {
    flex: 2,
    backgroundColor: theme.colors.primary,
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  bookButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: theme.colors.background,
    borderRadius: 20,
    padding: 20,
    width: width * 0.9,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  ratingModalContent: {
    gap: 15,
  },
  ratingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  interactiveStars: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 10,
  },
  commentLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 15,
    backgroundColor: theme.colors.card,
    color: theme.colors.text,
    fontSize: 16,
    minHeight: 100,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 15,
    marginTop: 10,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cancelButtonText: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingVertical: 8,
  },
  contactText: {
    fontSize: 16,
    color: theme.colors.text,
    marginLeft: 10,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: 8,
  },
  editButtonText: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
}));

export default CustomerTaskerProfileScreen; 