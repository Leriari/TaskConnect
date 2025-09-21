// app/(tabs)/home/screens/MessagesScreen.tsx

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const MessagesScreen = () => {
  return (
    <View style={styles.center}>
      <Text>Messages</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FD',
  },
});

export default MessagesScreen;