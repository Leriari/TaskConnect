// app/(tabs)/home/screens/ProfileScreen.tsx

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
  Switch
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { auth } from '@/firebase-config'; // Ensure this path is correct for your Firebase config
import { updateProfile } from 'firebase/auth';
import { router } from 'expo-router';
import { useTheme } from '@/app/context/ThemeContext';
import { useThemedStyles, createThemedStyles } from '@/app/hooks/useThemedStyles';
import StatusBarSpace from '@/app/components/StatusBarSpace';
import BiometricHelper from '../utils/BiometricHelper'; // Ensure this path is correct
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { app } from '@/firebase-config';
import * as FileSystem from 'expo-file-system';
import { useNavigation } from '@react-navigation/native';

const db = getFirestore(app);

const ProfileScreen = () => {
  const { theme, isDarkMode, toggleTheme } = useTheme();
  const styles = useThemedStyles(createProfileStyles);
  const navigation = useNavigation();

  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [profileImageBase64, setProfileImageBase64] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [hasTaskerProfile, setHasTaskerProfile] = useState(false);

  // Mock data for profile sections
  const accountInfo = [
    { icon: 'person-outline', title: 'Personal Information', destination: 'personalInfo' },
    { icon: 'card-outline', title: 'Payment Methods', destination: 'paymentMethods' },
    { icon: 'location-outline', title: 'Saved Addresses', destination: 'SavedAddressesScreen' },
    { icon: 'shield-outline', title: 'Security', destination: 'SecurityScreen' },
  ];

  // NEW: Tasker Information Section
  const taskerInfo = [
    { icon: 'briefcase-outline', title: 'Tasker Profile', destination: 'TaskerProfileScreen' },
    { icon: 'speedometer-outline', title: 'Tasker Dashboard', destination: 'TaskerDashboard' },
    { icon: 'star-outline', title: 'My Ratings', destination: 'TaskerRatingsScreen' },
    // Add more tasker-specific items here if needed in the future
  ];

  const appSettings = [
    { icon: 'notifications-outline', title: 'Notifications', destination: 'notifications' },
    { icon: 'globe-outline', title: 'Language', destination: 'language', value: 'English' },
    { icon: 'moon-outline', title: 'Dark Mode', destination: 'darkMode', toggle: true },
  ];

  const supportSection = [
    { icon: 'help-circle-outline', title: 'Help & Support', destination: 'helpSupport' },
    { icon: 'document-text-outline', title: 'Terms & Policies', destination: 'termsAndPolicies' },
    { icon: 'information-circle-outline', title: 'About', destination: 'about' },
  ];

  useEffect(() => {
    loadUserData();
    // Check if user has a tasker profile
    const checkTaskerProfile = async () => {
      const user = auth.currentUser;
      if (user) {
        const docRef = doc(db, 'taskers', user.uid);
        const docSnap = await getDoc(docRef);
        setHasTaskerProfile(docSnap.exists());
      }
    };
    checkTaskerProfile();
  }, []);

  useEffect(() => {
    const fetchUserProfileImage = async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            if (userData.profileImageBase64) {
              setProfileImageBase64(userData.profileImageBase64);
              setProfileImage(null); // Use null instead of undefined
              return;
            }
          }
          // Fallback to photoURL if no base64
          setProfileImage(user.photoURL);
        } catch (err) {
          setProfileImage(user.photoURL);
        }
      }
    };
    fetchUserProfileImage();
  }, []);

  const loadUserData = () => {
    const user = auth.currentUser;
    if (user) {
      setUserName(user.displayName || 'User');
      setUserEmail(user.email || '');
      setProfileImage(user.photoURL);
    }
  };

  const pickImage = async () => {
    // Request permission
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'We need permission to access your photos to set a profile picture.');
      return;
    }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      if (!result.canceled) {
        const uri = result.assets[0].uri;
        updateLocalProfileImage(uri);
        // Convert to base64 and save
        const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
        setProfileImageBase64(base64);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  // Simpler function that just updates the profile without Firebase Storage
  const updateLocalProfileImage = async (uri: string) => {
    if (!auth.currentUser) {
      Alert.alert('Error', 'You must be logged in to update your profile picture.');
      return;
    }

    setUploadingImage(true);

    try {
      // Update user profile with the image URI directly
      // This is a temporary solution until Firebase Storage is properly configured
      await updateProfile(auth.currentUser, {
        photoURL: uri
      });

      // Update local state
      setProfileImage(uri);

      Alert.alert('Success', 'Profile picture updated successfully.');
    } catch (error) {
      console.error("Error updating profile image:", error);
      Alert.alert('Error', 'Failed to update profile picture. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      // Clear biometric credentials when signing out for security
      await BiometricHelper.clearCredentials();

      // Sign out from Firebase
      await auth.signOut();
      router.replace('/auth/Login');
    } catch (error) {
      console.error("Error signing out:", error);
      Alert.alert('Error', 'Failed to sign out. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const navigateTo = (destination: string) => {
    switch (destination) {
      case 'personalInfo':
        router.push('/home/screens/PersonalInfoScreen');
        break;
      case 'SavedAddressesScreen':
        router.push('/home/screens/SavedAddressesScreen');
        break;
      case 'SecurityScreen':
        router.push('/home/screens/SecurityScreen');
        break;
      case 'TaskerProfileScreen':
        router.push('/home/screens/TaskerProfileScreen');
        break;
      case 'TaskerDashboard':
        router.push('/home/screens/TaskerDashboard');
        break;
      case 'TaskerRatingsScreen':
        router.push('/home/screens/TaskerRatingsScreen');
        break;
      case 'notifications':
        navigation.navigate('Notifications');
        break;
      case 'helpSupport':
        router.push('/home/screens/HelpSupportScreen');
        break;
      case 'termsAndPolicies':
        router.push('/home/screens/TermsAndPoliciesScreen');
        break;
      case 'about':
        router.push('/home/screens/AboutScreen');
        break;
      case 'editProfile':
        router.push('/home/screens/PersonalInfoScreen');
        break;
      case 'darkMode':
        // Toggle theme instead of navigating
        toggleTheme();
        break;
      default:
        // For other screens that are not yet implemented
        Alert.alert('Coming Soon', `${destination} will be available in a future update.`);
        break;
    }
  };

  const base64ToImageSource = (base64String: string | null) => {
    if (!base64String) return undefined;
    return { uri: `data:image/jpeg;base64,${base64String}` };
  };

  const renderProfileHeader = () => (
    <View style={styles.profileHeader}>
      <View style={styles.profileImageContainer}>
        {uploadingImage ? (
          <View style={styles.profileImage}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : (
          <>
            {profileImageBase64 ? (
              <Image
                source={base64ToImageSource(profileImageBase64)}
                style={styles.profileImage}
              />
            ) : profileImage ? (
              <Image
                source={{ uri: profileImage }}
                style={styles.profileImage}
              />
            ) : (
              <Ionicons name="person-circle" size={90} color={theme.colors.primary} />
            )}
            <TouchableOpacity
              style={styles.editImageButton}
              onPress={pickImage}
            >
              <Ionicons name="camera" size={18} color="#fff" />
            </TouchableOpacity>
          </>
        )}
      </View>

      <Text style={styles.userName}>{userName}</Text>
      <Text style={styles.userEmail}>{userEmail}</Text>

      <TouchableOpacity
        style={styles.editProfileButton}
        onPress={() => navigateTo('editProfile')}
      >
        <Text style={styles.editProfileButtonText}>Edit Profile</Text>
      </TouchableOpacity>
    </View>
  );

  const renderSectionHeader = (title: string) => (
    <Text style={styles.sectionTitle}>{title}</Text>
  );

  const renderItem = (item: any) => (
    <TouchableOpacity
      key={item.title}
      style={styles.menuItem}
      onPress={() => navigateTo(item.destination)}
    >
      <View style={styles.menuItemLeft}>
        <Ionicons
          name={item.icon}
          size={24}
          color={theme.colors.textSecondary}
          style={styles.menuItemIcon}
        />
        <Text style={styles.menuItemTitle}>{item.title}</Text>
      </View>

      <View style={styles.menuItemRight}>
        {item.value && <Text style={styles.menuItemValue}>{item.value}</Text>}
        {item.toggle ? (
          <Switch
            value={isDarkMode}
            onValueChange={toggleTheme}
            thumbColor={isDarkMode ? theme.colors.primary : '#f4f3f4'}
            trackColor={{
              false: '#767577',
              true: `${theme.colors.primary}80`
            }}
            ios_backgroundColor="#3e3e3e"
          />
        ) : (
          <Ionicons name="chevron-forward" size={20} color={theme.colors.textLight} />
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBarSpace />
      <LinearGradient
        colors={isDarkMode
          ? ['rgba(92, 189, 106, 0.2)', 'rgba(18, 18, 18, 0)']
          : ['rgba(92, 189, 106, 0.2)', 'rgba(255, 255, 255, 0)']}
        style={styles.headerGradient}
      />

      <ScrollView showsVerticalScrollIndicator={false}>
        {renderProfileHeader()}

        <View style={styles.contentContainer}>
          {renderSectionHeader('Account')}
          {accountInfo.map(item => renderItem(item))}

          {/* NEW: Tasker Information Section */}
          {hasTaskerProfile && (
            <>
              {renderSectionHeader('Tasker Information')}
              {taskerInfo.map(item => renderItem(item))}
            </>
          )}

          {renderSectionHeader('App Settings')}
          {appSettings.map(item => renderItem(item))}

          {renderSectionHeader('Support')}
          {supportSection.map(item => renderItem(item))}

          <TouchableOpacity
            style={styles.signOutButton}
            onPress={handleSignOut}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="log-out-outline" size={20} color="#fff" style={styles.signOutIcon} />
                <Text style={styles.signOutText}>Sign Out</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.versionText}>Version 1.0.0</Text>
        </View>
      </ScrollView>
    </View>
  );
};

const createProfileStyles = createThemedStyles(theme => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  headerGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 150,
  },
  profileHeader: {
    alignItems: 'center',
    paddingTop: 30,
    paddingBottom: 20,
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 15,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: theme.colors.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: theme.colors.card,
  },
  profileImagePlaceholderText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#fff',
  },
  editImageButton: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.primary,
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.card,
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  userEmail: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 5,
  },
  editProfileButton: {
    marginTop: 15,
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: theme.colors.primaryLight,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  editProfileButtonText: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  contentContainer: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: 25,
    marginBottom: 15,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.card,
    paddingVertical: 15,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 10,
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
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemIcon: {
    marginRight: 15,
  },
  menuItemTitle: {
    fontSize: 16,
    color: theme.colors.text,
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemValue: {
    fontSize: 14,
    color: theme.colors.textLight,
    marginRight: 10,
  },
  signOutButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.secondary,
    paddingVertical: 15,
    borderRadius: 12,
    marginTop: 30,
  },
  signOutIcon: {
    marginRight: 10,
  },
  signOutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  versionText: {
    textAlign: 'center',
    color: theme.colors.textLight,
    fontSize: 12,
    marginTop: 20,
    marginBottom: 30,
  }
}));

export default ProfileScreen;