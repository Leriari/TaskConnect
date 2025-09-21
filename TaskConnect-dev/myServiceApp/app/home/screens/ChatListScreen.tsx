/**
 * ChatListScreen displays a list of chat conversations for the authenticated user.
 * 
 * - Fetches conversations from Firestore where the current user is a participant.
 * - For each conversation, retrieves the other participant's details from either the 'taskers' or 'users' Firestore collections.
 * - Shows the last message, timestamp, and unread message count for each chat.
 * - Handles authentication state, loading, and error states.
 * - Allows navigation to individual chat rooms.
 * 
 * @component
 * @returns {JSX.Element} The rendered chat list screen.
 * 
 * @remarks
 * - Uses Firebase Firestore for real-time updates via `onSnapshot`.
 * - Integrates with Expo Router for navigation.
 * - Utilizes a custom theme context for styling.
 * - Includes extensive debug logging for Firestore access and authentication.
 * 
 * @example
 * ```tsx
 * <ChatListScreen />
 * ```
 */
// app/(tabs)/chat/ChatListScreen.tsx

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, ActivityIndicator, Platform, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/app/context/ThemeContext';
import { useThemedStyles, createThemedStyles } from '@/app/hooks/useThemedStyles';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Firebase imports for dynamic data fetching and writing
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  getDoc,
  getDocs,
  addDoc,
  Timestamp
} from 'firebase/firestore';
import { db, auth } from '@/firebase-config';
import { User, onAuthStateChanged } from 'firebase/auth';

// --- ADDED LOG FOR FIREBASE PROJECT ID ---
console.log("ChatListScreen: Firebase Project ID:", db.app.options.projectId);
// --- END ADDED LOG ---

// Define the structure for a chat item in the list
interface ChatListItem {
  id: string; // The conversation document ID from Firestore (auto-generated)
  otherParticipantId: string; // The UID of the other person in the chat
  otherParticipantName: string; // Display name of the other person
  otherParticipantPhoto: string; // URL/URI for profile picture (Base64 for taskers, URL for users)
  lastMessage: string;
  lastMessageTimestamp: Date; // Converted from Firestore Timestamp to JavaScript Date
  unreadCount: number; // Placeholder, you'd implement actual unread logic later
}

// Define the name of your Firestore collection for conversations
const CONVERSATIONS_COLLECTION_NAME = 'conversations';

// Enhanced debug function for Firestore access
const debugFirestoreAccess = async (db: any, otherParticipantId: string) => {
  console.log(`=== DEBUGGING FIRESTORE ACCESS ===`);
  console.log(`Target UID: '${otherParticipantId}'`);
  console.log(`UID length: ${otherParticipantId.length}`);
  console.log(`UID chars: ${otherParticipantId.split('').join(', ')}`);

  // Test 1: Try to access the taskers collection directly
  console.log(`\n--- Test 1: Accessing taskers collection ---`);
  try {
    const taskersCollectionRef = collection(db, 'taskers');
    const taskersSnapshot = await getDocs(taskersCollectionRef);
    console.log(`Taskers collection size: ${taskersSnapshot.size}`);

    taskersSnapshot.forEach((docSnap) => {
      console.log(`Found tasker doc ID: '${docSnap.id}' (length: ${docSnap.id.length})`);
      console.log(`Doc ID === target: ${docSnap.id === otherParticipantId}`);
      if (docSnap.id === otherParticipantId) {
        console.log(`MATCH FOUND! Data:`, docSnap.data());
      }
    });
  } catch (error) {
    console.error(`Error accessing taskers collection:`, error);
  }

  // Test 2: Try direct document access with detailed error handling
  console.log(`\n--- Test 2: Direct document access ---`);
  try {
    const taskerDocRef = doc(db, 'taskers', otherParticipantId);
    console.log(`Document reference path: ${taskerDocRef.path}`);

    const taskerDocSnap = await getDoc(taskerDocRef);
    console.log(`Document exists: ${taskerDocSnap.exists()}`);

    if (taskerDocSnap.exists()) {
      console.log(`Document data:`, taskerDocSnap.data());
    } else {
      console.log(`Document does not exist or access denied`);
    }
  } catch (error: any) {
    console.error(`Error in direct document access:`, error);
    console.error(`Error code:`, error.code);
    console.error(`Error message:`, error.message);
  }

  // Test 3: Check authentication
  console.log(`\n--- Test 3: Authentication check ---`);
  const currentUser = auth.currentUser;
  if (currentUser) {
    console.log(`Current user UID: ${currentUser.uid}`);
    console.log(`Current user email: ${currentUser.email}`);
  } else {
    console.log(`No authenticated user`);
  }

  console.log(`=== END DEBUG ===\n`);
};

// Helper to get initials from a name
function getInitials(name: string) {
  if (!name) return '';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Helper to generate a color from a string
function stringToColor(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const c = (hash & 0x00FFFFFF)
    .toString(16)
    .toUpperCase();
  return '#' + '00000'.substring(0, 6 - c.length) + c;
}

const ChatListScreen: React.FC = () => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();

  const [chats, setChats] = useState<ChatListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  console.log("ChatListScreen: Component mounted.");

  // --- Effect to listen for Auth State Changes ---
  useEffect(() => {
    console.log("ChatListScreen: Setting up auth state listener in useEffect[].");
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      console.log(`ChatListScreen: Auth state changed. User: ${user ? user.uid : 'null'}`);
      setCurrentUser(user);
      if (user) {
        console.log("ChatListScreen: User authenticated. UID:", user.uid);
        setError(null); // Clear any previous auth errors
      } else {
        console.log("ChatListScreen: No user authenticated. Displaying login prompt.");
        setLoading(false); // Stop loading if no user is found
        setError("Please log in to view your chats.");
      }
    });
    return () => {
      console.log("ChatListScreen: Cleaning up auth state listener in cleanup of useEffect[].");
      unsubscribeAuth();
    };
  }, []); // Empty dependency array means this runs once on mount

  // --- Effect to Fetch and Listen to Chat Updates from Firestore ---
  useEffect(() => {
    console.log(`ChatListScreen: useEffect[currentUser] triggered. CurrentUser: ${currentUser ? currentUser.uid : 'null'}`);

    if (!currentUser) {
      console.log("ChatListScreen: currentUser is null, skipping conversation listener setup.");
      setLoading(false); // Ensure loading is false if no user
      setChats([]); // Clear chats if user logs out
      return;
    }

    console.log(`ChatListScreen: User detected (${currentUser.uid}). Setting up onSnapshot for conversations.`);
    setLoading(true);
    setError(null); // Clear previous errors before fetching

    const conversationsCollectionRef = collection(db, CONVERSATIONS_COLLECTION_NAME);
    // Query for conversations where the current user is a participant, ordered by last message timestamp
    const q = query(
      conversationsCollectionRef,
      where('participants', 'array-contains', currentUser.uid),
      orderBy('lastMessageTimestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      console.log(`ChatListScreen: New conversation snapshot received! Number of docs: ${snapshot.docs.length}`);
      const fetchedChats: ChatListItem[] = [];

      if (snapshot.empty) {
        console.log("ChatListScreen: No conversations found for the current user.");
      }

      for (const docSnapshot of snapshot.docs) {
        const conversationData = docSnapshot.data();
        console.log(`ChatListScreen: Processing conversation doc ID: ${docSnapshot.id}, data:`, conversationData);

        const participants = conversationData.participants as string[];
        if (!participants || participants.length < 2) {
            console.warn(`ChatListScreen: Conversation ${docSnapshot.id} has invalid or insufficient participants data. Skipping.`);
            continue; // Skip this document if participants array is malformed
        }
        const otherParticipantId = participants.find(uid => uid !== currentUser.uid);

        if (!otherParticipantId) {
          console.warn(`ChatListScreen: Could not determine other participant for conversation doc ID: ${docSnapshot.id}. Current user ${currentUser.uid} might be the only participant listed or not found.`);
          continue; // Skip if no other participant is found
        }
        console.log(`ChatListScreen: Other participant ID identified: '${otherParticipantId}'`); // Added quotes for visual inspection

        // Initialize with default values
        let otherParticipantName = "Unknown User";
        let otherParticipantPhoto = '';
        let participantDetailsFetched = false;

        // --- Enhanced Fetch Other Participant's Details from 'taskers' first ---
        console.log(`ChatListScreen: Attempting to fetch from 'taskers' for ID: '${otherParticipantId}'`);

        // Add the debug function call here
        // The debugFirestoreAccess function will use the otherParticipantId that comes from the conversation participants
        await debugFirestoreAccess(db, otherParticipantId);

        const taskerDocRef = doc(db, 'taskers', otherParticipantId);
        try {
          console.log(`Tasker document reference path: ${taskerDocRef.path}`);

          const taskerDocSnap = await getDoc(taskerDocRef);
          console.log(`Tasker document exists: ${taskerDocSnap.exists()}`);
          console.log(`Tasker document metadata:`, {
            fromCache: taskerDocSnap.metadata.fromCache,
            hasPendingWrites: taskerDocSnap.metadata.hasPendingWrites
          });

          if (taskerDocSnap.exists()) {
            const taskerData = taskerDocSnap.data();
            console.log(`ChatListScreen: Found in 'taskers' collection! Data:`, taskerData);
            otherParticipantName = `${taskerData.firstName || ''} ${taskerData.lastName || ''}`.trim();
            if (!otherParticipantName) {
                otherParticipantName = "Tasker";
                console.warn(`ChatListScreen: Tasker ${otherParticipantId} has empty firstName/lastName. Using default "Tasker".`);
            }
            if (taskerData.profileImageBase64) {
              otherParticipantPhoto = `data:image/jpeg;base64,${taskerData.profileImageBase64}`;
              console.log("ChatListScreen: Profile image (Base64) found for tasker.");
            } else {
              console.log("ChatListScreen: No Base64 profile image found for tasker.");
            }
            participantDetailsFetched = true;
          } else {
            console.log(`ChatListScreen: Document does not exist or access is denied for ID: '${otherParticipantId}'.`);
          }
        } catch (fetchError: any) {
          console.error(`ChatListScreen: Error fetching tasker data for ${otherParticipantId}:`, fetchError);
          console.error(`Error details:`, {
            code: fetchError.code,
            message: fetchError.message,
            stack: fetchError.stack
          });
        }

        // --- If not found in 'taskers', attempt to fetch from 'users' ---
        if (!participantDetailsFetched) {
          console.log(`ChatListScreen: Attempting to fetch from 'users' for ID: '${otherParticipantId}'`); // Added quotes
          const userDocRef = doc(db, 'users', otherParticipantId);
          try {
            console.log(`User document reference path: ${userDocRef.path}`);

            const userDocSnap = await getDoc(userDocRef);
            console.log(`User document exists: ${userDocSnap.exists()}`);
            console.log(`User document metadata:`, {
              fromCache: userDocSnap.metadata.fromCache,
              hasPendingWrites: userDocSnap.metadata.hasPendingWrites
            });

            if (userDocSnap.exists()) {
              const userData = userDocSnap.data();
              console.log(`ChatListScreen: Found in 'users' collection! Data:`, userData);
              otherParticipantName = userData.name || userData.displayName || "User";
              if (userData.photoURL) {
                otherParticipantPhoto = userData.photoURL;
                console.log("ChatListScreen: Profile image (URL) found for user.");
              } else {
                console.log("ChatListScreen: No URL profile image found for user.");
              }
              participantDetailsFetched = true;
            } else {
              console.log(`ChatListScreen: Not found in 'users' collection either for ID: '${otherParticipantId}'. Will use "Unknown User".`); // Added quotes
            }
          } catch (fetchError: any) {
            console.error(`ChatListScreen: Error fetching user data for ${otherParticipantId}:`, fetchError);
            console.error(`User fetch error details:`, {
              code: fetchError.code,
              message: fetchError.message,
              stack: fetchError.stack
            });
          }
        }

        // Count unread messages for this conversation
        let unreadCount = 0;
        if (currentUser) {
          // Check if the current user sent the last message
          const lastMessageSenderId = conversationData.lastMessageSenderId;
          const currentUserSentLastMessage = lastMessageSenderId === currentUser.uid;
          
          // Only count unread messages if the current user didn't send the last message
          if (!currentUserSentLastMessage) {
            const messagesQ = query(
              collection(db, 'messages'),
              where('conversationId', '==', docSnapshot.id),
              where('receiverId', '==', currentUser.uid),
              where('read', '==', false)
            );
            const messagesSnap = await getDocs(messagesQ);
            unreadCount = messagesSnap.size;
          }
          
          console.log(`ChatListScreen: Conversation ${docSnapshot.id} - Current user sent last message: ${currentUserSentLastMessage}, Unread count: ${unreadCount}`);
        }

        // Construct the chat item with the fetched details
        const chatItem: ChatListItem = {
          id: docSnapshot.id,
          otherParticipantId: otherParticipantId,
          otherParticipantName: otherParticipantName,
          otherParticipantPhoto: otherParticipantPhoto,
          lastMessage: conversationData.lastMessage || 'No messages yet.',
          lastMessageTimestamp: (conversationData.lastMessageTimestamp as Timestamp)?.toDate() || new Date(0), // Ensure it's a Date object
          unreadCount: unreadCount,
        };
        console.log("ChatListScreen: Prepared chat item for state update:", chatItem);
        fetchedChats.push(chatItem);
      }

      setChats(fetchedChats);
      setLoading(false);
      setError(null);
      console.log("ChatListScreen: Finished processing conversation snapshot. Chats state updated.");
    }, (err) => {
      console.error("ChatListScreen: Error fetching conversations via onSnapshot:", err);
      console.error("ChatListScreen: Snapshot error details:", {
        code: err.code,
        message: err.message,
        stack: err.stack
      });
      setError("Failed to load chats. Please check your network or Firestore rules.");
      setLoading(false);
    });

    return () => {
      console.log("ChatListScreen: Cleaning up onSnapshot listener for conversations in cleanup of useEffect[currentUser].");
      unsubscribe();
    };
  }, [currentUser]); // Re-run this effect when currentUser changes

  // Function to navigate to the ChatRoomScreen, creating a new conversation if it doesn't exist
  const navigateToChatRoom = async (initialChatItem: ChatListItem) => {
    console.log("ChatListScreen: navigateToChatRoom called with initialChatItem:", initialChatItem);

    if (!currentUser) {
      console.warn("ChatListScreen: No current user, cannot navigate to chat room or create new chat.");
      setError("Authentication required to start or join a chat.");
      return;
    }
    console.log(`ChatListScreen: Current user UID for navigation: ${currentUser.uid}`);

    let targetChatId = initialChatItem.id;
    const finalOtherParticipantId = initialChatItem.otherParticipantId;
    const finalOtherParticipantName = initialChatItem.otherParticipantName;
    const finalOtherParticipantPhoto = initialChatItem.otherParticipantPhoto;

    if (initialChatItem.id) {
      console.log(`ChatListScreen: Navigating to existing chat from list item with ID: ${initialChatItem.id}`);
    } else {
      console.warn("ChatListScreen: navigateToChatRoom called without a valid chat ID.");
      setError("Invalid chat initiation. Please try again.");
      return;
    }

    // Navigate to ChatRoomScreen with the determined chatId and participant details
    console.log("ChatListScreen: Preparing to navigate to ChatRoomScreen with params:", {
      chatId: targetChatId,
      otherParticipantName: finalOtherParticipantName,
      otherParticipantId: finalOtherParticipantId,
      otherParticipantPhoto: finalOtherParticipantPhoto,
    });

    router.push({
      pathname: `/home/screens/ChatRoomScreen`, // Adjust this path based on your expo-router file structure
      params: {
        chatId: targetChatId,
        otherParticipantName: finalOtherParticipantName,
        otherParticipantId: finalOtherParticipantId,
        otherParticipantPhoto: finalOtherParticipantPhoto,
      }
    });
    console.log("ChatListScreen: Navigation to ChatRoomScreen completed.");
  };

  // --- Conditional Rendering for Loading and Error States ---
  if (loading) {
    console.log("ChatListScreen: Rendering loading state.");
    return (
      <View style={[styles.container, styles.centerContent, { paddingTop: insets.top + 20 }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading chats...</Text>
      </View>
    );
  }

  if (error) {
    console.log("ChatListScreen: Rendering error state. Error:", error);
    return (
      <View style={[styles.container, styles.centerContent, { paddingTop: insets.top + 20 }]}>
        <Ionicons name="alert-circle-outline" size={50} color={theme.colors.error} />
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  // --- Main Render for Chat List ---
  console.log("ChatListScreen: Rendering main UI.");
  return (
    <View style={[styles.container, { paddingTop: insets.top + 20 }]}>
      <Text style={styles.headerTitle}>Your Chats</Text>
      {chats.length === 0 ? (
        <View style={[styles.emptyChatsContainer, styles.centerContent]}>
          <Ionicons name="chatbubbles-outline" size={60} color={theme.colors.textLight} />
          <Text style={styles.noChatsText}>No chats yet.</Text>
          <Text style={styles.noChatsSubText}>Start a conversation!</Text>
        </View>
      ) : (
        <FlatList
          data={chats}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.chatItem}
              onPress={() => {
                console.log(`ChatListScreen: Chat item clicked for conversation ID: ${item.id}`);
                navigateToChatRoom(item);
              }}
            >
              {item.otherParticipantPhoto ? (
                <Image source={{ uri: item.otherParticipantPhoto }} style={styles.avatar} />
              ) : (
                // If no photo, show initials for customers (users), else fallback to Ionicons for taskers
                (item.otherParticipantName === 'User' || item.otherParticipantName === 'Unknown User') ? (
                  <View style={[styles.avatarPlaceholder, { backgroundColor: stringToColor(item.otherParticipantName || 'U') }]}> 
                    <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 22 }}>
                      {getInitials(item.otherParticipantName || 'U')}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Ionicons name="person-circle-outline" size={50} color={theme.colors.textLight} />
                  </View>
                )
              )}
              <View style={styles.chatContent}>
                <Text style={styles.chatPartnerName}>{item.otherParticipantName}</Text>
                <Text style={styles.lastMessage} numberOfLines={1}>{item.lastMessage}</Text>
              </View>
              <View style={styles.chatMeta}>
                <Text style={styles.timestamp}>
                  {item.lastMessageTimestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
                {item.unreadCount > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadBadgeText}>{item.unreadCount}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
};

// Styles remain unchanged
const createStyles = createThemedStyles(theme => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginLeft: 20,
    marginBottom: 20,
  },
  loadingText: {
    color: theme.colors.textSecondary,
    marginTop: 10,
  },
  errorText: {
    color: theme.colors.error,
    textAlign: 'center',
    marginTop: 10,
    marginHorizontal: 20,
  },
  emptyChatsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 50,
  },
  noChatsText: {
    fontSize: 18,
    color: theme.colors.textLight,
    marginTop: 15,
    fontWeight: '600',
  },
  noChatsSubText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 5,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.card,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
    marginBottom: 2,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
    backgroundColor: theme.colors.background,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
  chatContent: {
    flex: 1,
  },
  chatPartnerName: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
  },
  lastMessage: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  chatMeta: {
    alignItems: 'flex-end',
    marginLeft: 10,
  },
  timestamp: {
    fontSize: 12,
    color: theme.colors.textLight,
  },
  unreadBadge: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 5,
    minWidth: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
}));

export default ChatListScreen;