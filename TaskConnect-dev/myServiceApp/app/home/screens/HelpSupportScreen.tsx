import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Image, Animated, Keyboard, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/app/context/ThemeContext';
import { useThemedStyles, createThemedStyles } from '@/app/hooks/useThemedStyles';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from 'expo-router';

const BOT_NAME = 'Ella';
const BACKEND_URL = 'https://f7b4-197-237-175-62.ngrok-free.app/chat';

const cannedResponses = [
  { q: /your name|who are you|what is your name|who is this|who am i chatting with/i, a: 'My name is Ella, the official TaskConnect chat bot.' },
  { q: /help|support|problem|issue/i, a: 'How can I assist you? You can ask about booking, payments, or using TaskConnect.' },
  { q: /what is taskconnect|about/i, a: 'TaskConnect is a platform to connect you with trusted service providers for all your needs.' },
  { q: /how.*book/i, a: 'To book a service, search for what you need, select a provider, and follow the booking steps.' },
  { q: /payment|pay|mpesa/i, a: 'We support M-PESA, card, and cash payments. All payments are secure.' },
  { q: /contact|email|phone/i, a: 'You can reach our support team at support@taskconnect.com.' },
  { q: /.*/, a: 'Sorry, I am a simple bot for now. Please contact support@taskconnect.com for more help.' }
];

const HelpSupportScreen = () => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [messages, setMessages] = useState([
    { from: 'bot', text: 'Hi! I am Ella. How can I help you today?', timestamp: new Date() }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [inputHeight, setInputHeight] = useState(50);
  const keyboardAnimValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', (e) => {
      setKeyboardHeight(e.endCoordinates.height);
      setIsKeyboardVisible(true);
      Animated.timing(keyboardAnimValue, {
        toValue: 1,
        duration: 250,
        useNativeDriver: false,
      }).start();
      setTimeout(() => scrollToBottom(), 100);
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
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMessage = { 
      from: 'user', 
      text: input.trim(), 
      timestamp: new Date() 
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setInputHeight(50);
    setLoading(true);

    try {
      const res = await fetch(BACKEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage.text })
      });
      const data = await res.json();
      setMessages(prev => [...prev, { 
        from: 'bot', 
        text: data.reply, 
        timestamp: new Date() 
      }]);
    } catch (err) {
      setMessages(prev => [...prev, { 
        from: 'bot', 
        text: 'Sorry, I could not connect to support right now. Please try again later.', 
        timestamp: new Date() 
      }]);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timestamp: Date) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const TypingIndicator = () => (
    <View style={[styles.messageRow, styles.botRow]}>
      <View style={styles.botAvatarContainer}>
        <Image
          source={require('@/assets/images/Ella.jpg')}
          style={styles.botAvatar}
        />
      </View>
      <View style={[styles.messageBubble, styles.botBubble, styles.typingBubble]}>
        <View style={styles.typingIndicator}>
          <View style={styles.typingDot} />
          <View style={styles.typingDot} />
          <View style={styles.typingDot} />
        </View>
      </View>
    </View>
  );

  // Custom navigation bar at the top
  const CustomHeader = () => (
    <View style={styles.customHeader}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
      </TouchableOpacity>
      <View style={styles.avatarContainer}>
        <Image
          source={require('@/assets/images/Ella.jpg')}
          style={styles.avatar}
        />
        <View style={styles.onlineIndicator} />
      </View>
      <View style={styles.headerTextContainer}>
        <Text style={styles.headerTitle}>Ella</Text>
        <Text style={styles.headerSubtitle}>Online • Typically replies instantly</Text>
      </View>
    </View>
  );

  return (
    <>
      <CustomHeader />
      <SafeAreaView style={styles.container}>
        <View style={styles.chatWrapper}>
          <ScrollView
            ref={scrollViewRef}
            style={styles.chatContainer}
            contentContainerStyle={[styles.chatContent, { paddingBottom: 16 }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {messages.map((msg, idx) => (
              <View key={idx} style={[styles.messageRow, msg.from === 'user' ? styles.userRow : styles.botRow]}>
                {msg.from === 'bot' && (
                  <View style={styles.botAvatarContainer}>
                    <Image
                      source={require('@/assets/images/Ella.jpg')}
                      style={styles.botAvatar}
                    />
                  </View>
                )}
                <View style={styles.messageContainer}>
                  <View style={[styles.messageBubble, msg.from === 'user' ? styles.userBubble : styles.botBubble]}>
                    <Text style={[styles.messageText, msg.from === 'user' ? styles.userMessageText : styles.botMessageText]}>
                      {msg.text}
                    </Text>
                  </View>
                  <Text style={[styles.timestamp, msg.from === 'user' ? styles.userTimestamp : styles.botTimestamp]}>
                    {formatTime(msg.timestamp)}
                  </Text>
                </View>
              </View>
            ))}

            {loading && <TypingIndicator />}

            <Animated.View style={{ height: keyboardAnimValue.interpolate({
              inputRange: [0, 1],
              outputRange: [80, keyboardHeight + 80],
            }) }} />
          </ScrollView>

          <Animated.View 
            style={[
              styles.inputContainer,
              {
                transform: [{
                  translateY: keyboardAnimValue.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -keyboardHeight -10],
                  }),
                }],
              }
            ]}
          >
            <View style={[styles.inputWrapper, { minHeight: Math.max(50, inputHeight) }]}>
              <TextInput
                ref={inputRef}
                style={[styles.textInput, { height: Math.max(42, inputHeight - 8) }]}
                value={input}
                onChangeText={setInput}
                onContentSizeChange={(e) => {
                  const newHeight = Math.min(120, Math.max(50, e.nativeEvent.contentSize.height + 16));
                  setInputHeight(newHeight);
                }}
                placeholder="Type a message..."
                placeholderTextColor={theme.colors.textLight}
                multiline
                maxLength={1000}
                returnKeyType="send"
                onSubmitEditing={handleSend}
                blurOnSubmit={false}
                textAlignVertical="top"
              />
              <TouchableOpacity 
                style={[styles.sendButton, { opacity: input.trim() ? 1 : 0.5 }]} 
                onPress={handleSend} 
                disabled={loading || !input.trim()}
                activeOpacity={0.8}
              >
                <Ionicons name="send" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </SafeAreaView>
    </>
  );
};

const createStyles = createThemedStyles(theme => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  chatWrapper: {
    flex: 1,
    position: 'relative',
  },
  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    zIndex: 10,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eee',
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
  headerTextContainer: {
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
    opacity: 0.8,
  },
  chatContainer: {
    flex: 1,
  },
  chatContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  botRow: {
    justifyContent: 'flex-start',
  },
  botAvatarContainer: {
    marginRight: 8,
    alignSelf: 'flex-end',
  },
  botAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#eee',
  },
  messageContainer: {
    maxWidth: '75%',
  },
  messageBubble: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 4,
  },
  userBubble: {
    backgroundColor: theme.colors.primary,
    borderBottomRightRadius: 6,
    alignSelf: 'flex-end',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  botBubble: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderBottomLeftRadius: 6,
    alignSelf: 'flex-start',
  },
  typingBubble: {
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userMessageText: {
    color: '#fff',
  },
  botMessageText: {
    color: theme.colors.text,
  },
  timestamp: {
    fontSize: 11,
    opacity: 0.6,
    marginHorizontal: 4,
  },
  userTimestamp: {
    color: theme.colors.text,
    textAlign: 'right',
  },
  botTimestamp: {
    color: theme.colors.textLight,
    textAlign: 'left',
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.textLight,
    marginHorizontal: 2,
    opacity: 0.4,
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
}));

export default HelpSupportScreen;