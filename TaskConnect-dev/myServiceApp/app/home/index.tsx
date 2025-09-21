import React, { useEffect, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '@/firebase-config';
import { onAuthStateChanged } from 'firebase/auth';
import { router } from 'expo-router';
import { View, ActivityIndicator, Text } from 'react-native';
import { useTheme } from '@/app/context/ThemeContext';
import { useThemedStyles, createThemedStyles } from '@/app/hooks/useThemedStyles';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '@/firebase-config';
// Screens
import HomeScreenContent from './screens/HomeScreenContent';
import NotificationsScreen from './screens/NotificationsScreen';
import ProfileScreen from './screens/ProfileScreen';
import ChatListScreen from './screens/ChatListScreen';
import TaskerProfileScreen from './screens/TaskerProfileScreen';
import VerifyAccountScreen from './screens/VerifyAccountScreen';

const Tab = createBottomTabNavigator();

const HomeScreen = () => {
  const { theme, isDarkMode } = useTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();

  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [unreadChats, setUnreadChats] = useState(0);
  const [isVerified, setIsVerified] = useState(false);

  // Check authentication state when component mounts
  useEffect(() => {
    console.log("Setting up auth state listener in Tab Navigator");

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsVerified(true);
        setIsAuthChecking(false);
      } else {
        setIsAuthChecking(false);
        router.replace('/auth/Login');
      }
    });

    // Clean up the listener on unmount
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Listen for unread chat count (number of chats with at least one unread message)
    let unsubscribe: (() => void) | undefined;
    const fetchUnreadChats = async () => {
      const user = auth.currentUser;
      if (!user) return;
      // Query all conversations where the user is a participant
      const conversationsRef = collection(db, 'conversations');
      const q = query(conversationsRef, where('participants', 'array-contains', user.uid));
      unsubscribe = onSnapshot(q, async (snapshot) => {
        let unreadChatsCount = 0;
        for (const docSnap of snapshot.docs) {
          const conversationData = docSnap.data();
          const conversationId = docSnap.id;
          
          // Check if the current user sent the last message
          const lastMessageSenderId = conversationData.lastMessageSenderId;
          const currentUserSentLastMessage = lastMessageSenderId === user.uid;
          
          // Only count unread messages if the current user didn't send the last message
          if (!currentUserSentLastMessage) {
            // Query unread messages for this conversation
            const messagesQ = query(
              collection(db, 'messages'),
              where('conversationId', '==', conversationId),
              where('receiverId', '==', user.uid),
              where('read', '==', false)
            );
            const messagesSnap = await getDocs(messagesQ);
            if (messagesSnap.size > 0) {
              unreadChatsCount += 1;
              console.log(`HomeScreen: Conversation ${conversationId} has ${messagesSnap.size} unread messages`);
            }
          } else {
            console.log(`HomeScreen: Conversation ${conversationId} - Current user sent last message, skipping unread count`);
          }
        }
        setUnreadChats(unreadChatsCount);
      });
    };
    fetchUnreadChats();
    return () => { if (unsubscribe) unsubscribe(); };
  }, []);

  // Show loading indicator while checking authentication
  if (isAuthChecking) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Checking authentication...</Text>
      </View>
    );
  }

  return (
    <Tab.Navigator
      screenOptions={({ route }: { route: { name: string } }) => ({
        tabBarIcon: ({ focused, color, size }: { focused: boolean; color: string; size: number }) => {
          let iconName = 'home-outline';

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Notifications') {
            iconName = focused ? 'notifications' : 'notifications-outline';
          } else if (route.name === 'Messages') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          // Add badge for Messages tab
          if (route.name === 'Messages' && unreadChats > 0) {
            return (
              <View>
                <Ionicons name={iconName as any} size={size} color={color} />
                <View style={{
                  position: 'absolute',
                  right: -6,
                  top: -3,
                  backgroundColor: theme.colors.primary,
                  borderRadius: 8,
                  minWidth: 16,
                  height: 16,
                  justifyContent: 'center',
                  alignItems: 'center',
                  paddingHorizontal: 3,
                }}>
                  <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>{unreadChats}</Text>
                </View>
              </View>
            );
          }
          return <Ionicons name={iconName as any} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary, // Use the primary color (green) for active icons
        tabBarInactiveTintColor: theme.colors.tabBarInactiveTint,
        tabBarStyle: {
          height: 56 + insets.bottom,
          paddingBottom: 8,
          paddingTop: 8,
          backgroundColor: theme.colors.card,
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
          elevation: 8,
          shadowColor: theme.colors.shadow,
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: isDarkMode ? 0.3 : 0.1,
          shadowRadius: 4,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreenContent} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} />
      <Tab.Screen name="Messages" component={ChatListScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

const createStyles = createThemedStyles(theme => ({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: theme.colors.text,
  },
}));

export default HomeScreen;