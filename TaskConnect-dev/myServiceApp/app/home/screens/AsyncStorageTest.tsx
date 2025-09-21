// app/(tabs)/home/screens/AsyncStorageTest.tsx

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@/app/context/ThemeContext';

const AsyncStorageTest = () => {
  const { theme } = useTheme();
  const [testKey, setTestKey] = useState('test_key');
  const [testValue, setTestValue] = useState('test_value');
  const [retrievedValue, setRetrievedValue] = useState<string | null>(null);
  const [allKeys, setAllKeys] = useState<string[]>([]);
  const [allValues, setAllValues] = useState<{[key: string]: string | null}>({});
  
  // Test saving a value
  const saveValue = async () => {
    try {
     
      await AsyncStorage.setItem(testKey, testValue);
      
      Alert.alert('Success', `Saved "${testValue}" to key "${testKey}"`);
      getAllKeys(); // Refresh keys list
    } catch (error) {
     
      Alert.alert('Error', 'Failed to save to AsyncStorage');
    }
  };
  
  // Test retrieving a value
  const retrieveValue = async () => {
    try {
     
      const value = await AsyncStorage.getItem(testKey);
      
      setRetrievedValue(value);
      if (value === null) {
        Alert.alert('Not Found', `No value found for key "${testKey}"`);
      }
    } catch (error) {
     
      Alert.alert('Error', 'Failed to retrieve from AsyncStorage');
    }
  };
  
  // Get all keys in AsyncStorage
  const getAllKeys = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      
      setAllKeys([...keys]);
      
      // Also get all values
      const valuePromises = keys.map(async (key) => {
        const value = await AsyncStorage.getItem(key);
        return { key, value };
      });
      
      const keyValuePairs = await Promise.all(valuePromises);
      const valueMap: {[key: string]: string | null} = {};
      keyValuePairs.forEach(({ key, value }) => {
        valueMap[key] = value;
      });
      
      setAllValues(valueMap);
    } catch (error) {
     
      Alert.alert('Error', 'Failed to get all keys from AsyncStorage');
    }
  };
  
  // Clear all AsyncStorage
  const clearAll = async () => {
    try {
      await AsyncStorage.clear();
    
      Alert.alert('Success', 'AsyncStorage has been cleared');
      getAllKeys(); // Refresh keys list
      setRetrievedValue(null);
    } catch (error) {
     
      Alert.alert('Error', 'Failed to clear AsyncStorage');
    }
  };
  
  // Try to enable app lock directly
  const enableAppLock = async () => {
    try {
      await AsyncStorage.setItem('app_lock_enabled', 'true');
    
      Alert.alert('Success', 'Set app_lock_enabled to true');
      getAllKeys(); // Refresh keys list
    } catch (error) {
      
      Alert.alert('Error', 'Failed to enable app lock');
    }
  };
  
  // Load all keys on first render
  useEffect(() => {
    getAllKeys();
  }, []);
  
  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text style={[styles.title, { color: theme.colors.text }]}>AsyncStorage Test Tool</Text>
      
      <View style={styles.inputContainer}>
        <Text style={[styles.label, { color: theme.colors.text }]}>Key:</Text>
        <TextInput
          style={[styles.input, { 
            color: theme.colors.text,
            backgroundColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
            borderColor: theme.dark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'
          }]}
          value={testKey}
          onChangeText={setTestKey}
          placeholder="Enter key"
          placeholderTextColor={theme.colors.textSecondary}
        />
      </View>
      
      <View style={styles.inputContainer}>
        <Text style={[styles.label, { color: theme.colors.text }]}>Value:</Text>
        <TextInput
          style={[styles.input, { 
            color: theme.colors.text,
            backgroundColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
            borderColor: theme.dark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'
          }]}
          value={testValue}
          onChangeText={setTestValue}
          placeholder="Enter value"
          placeholderTextColor={theme.colors.textSecondary}
        />
      </View>
      
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.colors.primary }]}
          onPress={saveValue}
        >
          <Text style={styles.buttonText}>Save</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.colors.primary }]}
          onPress={retrieveValue}
        >
          <Text style={styles.buttonText}>Retrieve</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.colors.primary }]}
          onPress={getAllKeys}
        >
          <Text style={styles.buttonText}>Refresh Keys</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.colors.error }]}
          onPress={clearAll}
        >
          <Text style={styles.buttonText}>Clear All</Text>
        </TouchableOpacity>
      </View>
      
      <TouchableOpacity
        style={[styles.fullButton, { backgroundColor: theme.colors.success }]}
        onPress={enableAppLock}
      >
        <Text style={styles.buttonText}>Set app_lock_enabled = true</Text>
      </TouchableOpacity>
      
      {retrievedValue !== null && (
        <View style={[styles.resultContainer, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.resultLabel, { color: theme.colors.text }]}>Retrieved Value:</Text>
          <Text style={[styles.resultValue, { color: theme.colors.text }]}>{retrievedValue}</Text>
        </View>
      )}
      
      <View style={[styles.keysContainer, { backgroundColor: theme.colors.card }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          All AsyncStorage Keys ({allKeys.length})
        </Text>
        {allKeys.length === 0 ? (
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            No keys found in AsyncStorage
          </Text>
        ) : (
          allKeys.map((key) => (
            <View key={key} style={styles.keyValuePair}>
              <Text style={[styles.keyText, { color: theme.colors.text }]}>{key}:</Text>
              <Text style={[styles.valueText, { color: theme.colors.textSecondary }]}>
                {allValues[key] || '(null)'}
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  button: {
    flex: 1,
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  fullButton: {
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  resultContainer: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  resultLabel: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: '600',
  },
  resultValue: {
    fontSize: 16,
  },
  keysContainer: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  keyValuePair: {
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
    paddingBottom: 8,
  },
  keyText: {
    fontSize: 16,
    fontWeight: '600',
  },
  valueText: {
    fontSize: 14,
  },
});

export default AsyncStorageTest;