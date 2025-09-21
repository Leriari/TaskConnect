/**
 * ChatRoomScreen component displays a real-time chat interface between the current user and another participant.
 * 
 * Features:
 * - Real-time message updates using Firestore onSnapshot.
 * - Marks messages as read when the chat is opened.
 * - Fetches and displays participant details (name and photo) from 'taskers' or 'users' collections.
 * - Responsive UI with keyboard handling and safe area insets.
 * - Custom header with participant avatar and online status.
 * - Message bubbles with timestamps and read status indicators.
 * - Input area for sending text messages, with attachment and microphone buttons (UI only).
 * 
 * @component
 * @returns {React.FC} The chat room screen component.
 * 
 * @remarks
 * - Requires `ThemeContext` for theming.
 * - Uses Firebase Firestore for message and conversation data.
 * - Depends on `AuthContext` for current user information.
 * - Expects navigation params: `chatId`, `otherParticipantName`, `otherParticipantId`, `otherParticipantPhoto`.
 * 
 * @example
 * // Usage in navigation
 * <ChatRoomScreen />
 */
// app/home/screens/ChatRoomScreen.tsx

import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Image,
  TouchableWithoutFeedback,
  Keyboard,
  Animated,
  StatusBar,
  Dimensions,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/app/context/ThemeContext';
import { useThemedStyles, createThemedStyles } from '@/app/hooks/useThemedStyles';
import { useLocalSearchParams, router, useNavigation } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { db } from '@/firebase-config';
import { collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp, doc, updateDoc, getDocs, writeBatch, getDoc } from 'firebase/firestore';
import { useAuth } from '@/app/auth/AuthContext';

// Get screen dimensions for responsive design
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Define the structure for a static message object
interface StaticMessage {
  id: string;
  senderId: string;
  text: string;
  timestamp: string;
}


const ChatRoomScreen: React.FC = () => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const { currentUser } = useAuth();
  const navigation = useNavigation();

  const { chatId, otherParticipantName, otherParticipantId, otherParticipantPhoto } = useLocalSearchParams<{
    chatId: string;
    otherParticipantName: string;
    otherParticipantId: string;
    otherParticipantPhoto: string;
  }>();

  const [messageText, setMessageText] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [inputHeight, setInputHeight] = useState(50);
  const keyboardAnimValue = useRef(new Animated.Value(0)).current;
  const inputRef = useRef<TextInput>(null);
  const flatListRef = useRef<FlatList<StaticMessage>>(null);
  const animatedValue = useRef(new Animated.Value(0)).current;
  const [messages, setMessages] = useState<any[]>([]);
  const [participantName, setParticipantName] = useState('');
  const [participantPhoto, setParticipantPhoto] = useState('');

  // Real-time Firestore listener for messages in this conversation
  useEffect(() => {
    if (!chatId) return;
    const q = query(
      collection(db, 'messages'),
      where('conversationId', '==', chatId),
      orderBy('timestamp', 'asc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
    });
    return unsubscribe;
  }, [chatId]);

  // Enhanced keyboard handling
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', (e) => {
      setKeyboardHeight(e.endCoordinates.height);
      setIsKeyboardVisible(true);
      Animated.timing(keyboardAnimValue, {
        toValue: 1,
        duration: 250,
        useNativeDriver: false,
      }).start();
      setTimeout(() => {
        if (messages.length > 0) {
          flatListRef.current?.scrollToEnd({ animated: true });
        }
      }, 100);
    });

    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
      setIsKeyboardVisible(false);
      Animated.timing(keyboardAnimValue, {
        toValue: 0,
        duration: 250,
        useNativeDriver: false,
      }).start();
    });

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, [messages.length]);

  // Mark all messages sent to the current user as read when chat is opened
  useEffect(() => {
    if (!chatId || !currentUser) return;
    const markAsRead = async () => {
      const q = query(
        collection(db, 'messages'),
        where('conversationId', '==', chatId),
        where('receiverId', '==', currentUser.uid),
        where('read', '==', false)
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const batch = writeBatch(db);
        snapshot.forEach(docSnap => {
          batch.update(doc(db, 'messages', docSnap.id), { read: true });
        });
        await batch.commit();
        // Update the parent conversation to trigger onSnapshot in ChatListScreen
        await updateDoc(doc(db, 'conversations', chatId), {
          lastReadAt: serverTimestamp(),
        });
      }
    };
    markAsRead();
  }, [chatId, currentUser]);

  // Fetch participant details on mount or when otherParticipantId changes
  useEffect(() => {
    const fetchParticipantDetails = async () => {
      if (!otherParticipantId) return;
      // Try 'taskers' first
      const taskerDocRef = doc(db, 'taskers', otherParticipantId);
      try {
        const taskerDocSnap = await getDoc(taskerDocRef);
        if (taskerDocSnap.exists()) {
          const taskerData = taskerDocSnap.data();
          let name = `${taskerData.firstName || ''} ${taskerData.lastName || ''}`.trim();
          if (!name) name = 'Tasker';
          setParticipantName(name);
          if (taskerData.profileImageBase64) {
            setParticipantPhoto(`data:image/jpeg;base64,${taskerData.profileImageBase64}`);
          }
          return;
        }
      } catch {}
      // If not found, try 'users'
      const userDocRef = doc(db, 'users', otherParticipantId);
      try {
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          setParticipantName(userData.name || userData.displayName || 'User');
          if (userData.photoURL) {
            setParticipantPhoto(userData.photoURL);
          }
          return;
        }
      } catch {}
      // Fallback
      setParticipantName('Unknown User');
      setParticipantPhoto('');
    };
    fetchParticipantDetails();
  }, [otherParticipantId]);

  // Send message to Firestore
  const handleSendMessage = async () => {
    if (!messageText.trim() || !currentUser) return;
    await addDoc(collection(db, 'messages'), {
      conversationId: chatId,
      senderId: currentUser.uid,
      receiverId: otherParticipantId,
      text: messageText.trim(),
      timestamp: serverTimestamp(),
      read: false,
      attachments: { name: '', type: '', url: '', content: '' }
    });
    // Update the conversation document with the latest message, timestamp, and sender ID
    await updateDoc(doc(db, 'conversations', chatId), {
      lastMessage: messageText.trim(),
      lastMessageTimestamp: serverTimestamp(),
      lastMessageSenderId: currentUser.uid,
    });
    setMessageText('');
  };

  // Render message bubble
  const renderMessage = ({ item, index }: { item: any; index: number }) => {
    const isMyMessage = item.senderId === (currentUser ? currentUser.uid : '');
    const isLastMessage = index === messages.length - 1;
    return (
      <Animated.View
        style={[
          styles.messageContainer,
          { marginBottom: isLastMessage ? 10 : 8 }
        ]}
      >
        <View style={[
          styles.messageBubble,
          isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble,
        ]}>
          <Text style={isMyMessage ? styles.myMessageText : styles.otherMessageText}>
            {item.text}
          </Text>
          <View style={styles.timestampAndStatus}>
            <Text style={[
              styles.messageTimestamp,
              isMyMessage ? styles.myMessageTimestamp : styles.otherMessageTimestamp
            ]}>
              {item.timestamp && item.timestamp.toDate ? new Date(item.timestamp.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
            </Text>
            {isMyMessage && (
              <Ionicons
                name="checkmark-done"
                size={12}
                color={item.read ? "#2196F3" : "rgba(255,255,255,0.8)"}
                style={styles.sentIcon}
              />
            )}
          </View>
        </View>
      </Animated.View>
    );
  };

  const handleGoBackPress = () => {
    router.back();
  };

  const inputPaddingBottom = isKeyboardVisible ? 0 : insets.bottom;
  const inputMarginBottom = 0;
  console.log('Keyboard:', isKeyboardVisible, 'paddingBottom:', inputPaddingBottom, 'marginBottom:', inputMarginBottom);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.chatWrapper}>
        <StatusBar 
          barStyle={theme.dark ? 'light-content' : 'dark-content'} 
          backgroundColor={theme.colors.card}
          translucent={false}
        />
        {/* Custom Header */}
        <View style={[
          styles.header,
          {
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 8,
            height: 56,
            backgroundColor: theme.colors.card,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border,
            elevation: 2,
            marginTop: insets.top, // Add safe area margin
          },
        ]}>
          <TouchableOpacity style={styles.backButton} onPress={handleGoBackPress}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <View style={styles.headerProfile}>
            <View style={styles.avatarContainer}>
              {participantPhoto ? (
                <Image source={{ uri: participantPhoto }} style={styles.headerAvatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person" size={20} color={theme.colors.textLight} />
                </View>
              )}
            </View>
            <View style={styles.headerInfo}>
              <Text style={styles.headerTitle} numberOfLines={1}>{participantName}</Text>
              <Text style={styles.headerSubtitle}>Online</Text>
            </View>
          </View>
        </View>
        {/* Messages Container */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={[styles.messagesListContainer, { paddingBottom: 16 }]}
          ListFooterComponent={
            <Animated.View style={{ height: keyboardAnimValue.interpolate({
              inputRange: [0, 1],
              outputRange: [80 + insets.bottom, keyboardHeight + 80 + insets.bottom],
            }) }} />
          }
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => {
            if (messages.length > 0) {
              flatListRef.current?.scrollToEnd({ animated: true });
            }
          }}
          onLayout={() => {
            if (messages.length > 0) {
              flatListRef.current?.scrollToEnd({ animated: true });
            }
          }}
          style={{ flex: 1 }}
        />
        {/* Enhanced Input Container */}
        <Animated.View
          style={[
            styles.inputContainer,
            {
              paddingBottom: 12 + insets.bottom,
              transform: [{
                translateY: keyboardAnimValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -keyboardHeight - 10],
                }),
              }],
            },
          ]}
        >
          <View style={[styles.inputWrapper, { minHeight: Math.max(50, inputHeight) }]}> 
            <TextInput
              ref={inputRef}
              style={[styles.textInput, { height: Math.max(42, inputHeight - 8) }]}
              value={messageText}
              onChangeText={setMessageText}
              onContentSizeChange={(e) => {
                const newHeight = Math.min(120, Math.max(50, e.nativeEvent.contentSize.height + 16));
                setInputHeight(newHeight);
              }}
              placeholder="Type a message..."
              placeholderTextColor={theme.colors.textLight}
              multiline
              maxLength={1000}
              returnKeyType="send"
              onSubmitEditing={handleSendMessage}
              blurOnSubmit={false}
              textAlignVertical="top"
            />
            <TouchableOpacity 
              style={[styles.sendButton, { opacity: messageText.trim() ? 1 : 0.5 }]} 
              onPress={handleSendMessage} 
              disabled={!messageText.trim()}
              activeOpacity={0.8}
            >
              <Ionicons name="send" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
};

// Enhanced Stylesheet
const createStyles = createThemedStyles(theme => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    backgroundColor: theme.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    height: 56,
  },
  backButton: {
    marginRight: 8,
    padding: 4,
  },
  headerProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginLeft: 8,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.border,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: theme.colors.card,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: theme.colors.textLight,
    fontWeight: '400',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesWrapper: {
    flex: 1,
  },
  messagesListContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  messageContainer: {
    width: '100%',
  },
  messageBubble: {
    maxWidth: '85%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  myMessageBubble: {
    alignSelf: 'flex-end',
    backgroundColor: theme.colors.primary,
    borderBottomRightRadius: 4,
    marginLeft: '15%',
  },
  otherMessageBubble: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.card,
    borderBottomLeftRadius: 4,
    marginRight: '15%',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  myMessageText: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '400',
  },
  otherMessageText: {
    color: theme.colors.text,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '400',
  },
  timestampAndStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 6,
  },
  messageTimestamp: {
    fontSize: 11,
    fontWeight: '400',
  },
  myMessageTimestamp: {
    color: 'rgba(255,255,255,0.7)',
  },
  otherMessageTimestamp: {
    color: theme.colors.textLight,
  },
  sentIcon: {
    marginLeft: 4,
  },
  inputContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: theme.colors.card,
    borderRadius: 25,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: theme.colors.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  attachButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
  },
  textInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: theme.colors.text,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  micButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
  },
  chatWrapper: {
    flex: 1,
    position: 'relative',
  },
}));

export const getHeaderTitle = ({ route }: { route: any }) => {
  const { otherParticipantName, otherParticipantPhoto } = route.params || {};
  return {
    headerTitle: () => (
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {otherParticipantPhoto ? (
          <Image source={{ uri: otherParticipantPhoto }} style={{ width: 36, height: 36, borderRadius: 18, marginRight: 10 }} />
        ) : (
          <Ionicons name="person-circle-outline" size={36} color="#ccc" style={{ marginRight: 10 }} />
        )}
        <Text style={{ fontSize: 18, fontWeight: 'bold' }}>{otherParticipantName}</Text>
      </View>
    ),
    headerStyle: { backgroundColor: '#fff', elevation: 2 },
    headerTitleAlign: 'left',
  };
};

export default ChatRoomScreen;