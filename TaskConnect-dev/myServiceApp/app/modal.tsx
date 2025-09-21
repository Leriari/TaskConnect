import { Platform, StyleSheet, TouchableOpacity, Alert, Button, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

// Import your seeding function
import { seedCategories } from '../app/home/utils/seedCategories'; // Adjust this path if needed

export default function ModalScreen() {
  const router = useRouter();

  const handleSeedPress = async () => {
    Alert.alert(
      "Seed Data?",
      "This will add mock categories to Firestore. This action is irreversible if you don't manually delete them. Are you sure?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Yes, Seed Categories",
          onPress: async () => {
            try {
              await seedCategories();
              Alert.alert("Success", "Categories seeded successfully!");
            } catch (error) {
              console.error("Seeding failed:", error);
              Alert.alert("Error", "Failed to seed categories. Check console for details.");
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header with close button */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => router.back()}
        >
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <Text style={styles.title}>Development Seeding Tool</Text>
      <Text style={styles.subtitle}>
        Tap the button below to add mock categories to your Firestore.
      </Text>

      {/* --- DEVELOPMENT TOOL --- */}
      {/* This section will only appear in development builds */}
      {/* REMOVE THIS ENTIRE SECTION BEFORE DEPLOYING TO PRODUCTION */}
      {__DEV__ && (
        <View style={styles.buttonContainer}>
          <Button
            title="Seed Categories to Firestore"
            onPress={handleSeedPress}
            color="#FF6347" // A distinctive color for dev buttons
          />
        </View>
      )}
      {/* --- END DEVELOPMENT TOOL --- */}

      {/* Use a light status bar for better visibility against dark background */}
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a', // A dark background
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  header: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 40 : 15,
    right: 20,
    backgroundColor: 'transparent',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 40,
    textAlign: 'center',
  },
  buttonContainer: {
    marginTop: 20,
    width: '80%', // Make the button container responsive
  },
});