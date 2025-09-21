// app/(tabs)/home/components/Header.tsx

import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '@/firebase-config';
import { useTheme } from '@/app/context/ThemeContext';
import { useThemedStyles, createThemedStyles } from '@/app/hooks/useThemedStyles';

interface HeaderProps {
  userName: string;
  onProfilePress: () => void;
}

const Header = ({ userName, onProfilePress }: HeaderProps) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  
  const [profileImage, setProfileImage] = useState<string | null>(null);
  
  // Load the profile image from Firebase Auth
  useEffect(() => {
    const user = auth.currentUser;
    if (user && user.photoURL) {
      setProfileImage(user.photoURL);
    }
    
    // Set up a listener to detect changes to the user's profile
    const interval = setInterval(() => {
      const currentUser = auth.currentUser;
      if (currentUser && currentUser.photoURL !== profileImage) {
        setProfileImage(currentUser.photoURL);
      }
    }, 2000); // Check every 2 seconds
    
    return () => clearInterval(interval);
  }, [profileImage]);
  
  return (
    <View style={styles.header}>
      <View>
        <Text style={styles.headerText}>Hi, {userName} 👋</Text>
        <Text style={styles.subHeaderText}>Find trusted help nearby</Text>
      </View>
      <TouchableOpacity
        style={styles.avatarContainer}
        onPress={onProfilePress}
      >
        {profileImage ? (
          <Image 
            source={{ uri: profileImage }}
            style={styles.profileImage}
          />
        ) : (
          <Ionicons name="person-circle" size={40} color={theme.colors.primary} />
        )}
      </TouchableOpacity>
    </View>
  );
};

const createStyles = createThemedStyles(theme => ({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 15,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: theme.dark ? 0.3 : 0.1,
    shadowRadius: 10,
    elevation: 5,
    zIndex: 100,
  },
  headerText: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.text,
  },
  subHeaderText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 3,
  },
  avatarContainer: {
    height: 45,
    width: 45,
    borderRadius: 22.5,
    backgroundColor: theme.dark ? 'rgba(92, 189, 106, 0.2)' : '#F0F4FF',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
}));

export default Header;