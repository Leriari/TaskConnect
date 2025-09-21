// firebase-config.js
import { initializeApp } from 'firebase/app';
import { 
  initializeAuth,
  getReactNativePersistence,
  GoogleAuthProvider,
  signInWithCredential 
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyApYZBGEalBlKLuG9Csk-2nhSSHVQB9BYc",
  authDomain: "taskconnect-30e07.firebaseapp.com",
  projectId: "taskconnect-30e07",
  storageBucket: "taskconnect-30e07.firebasestorage.app",
  messagingSenderId: "249705110811",
  appId: "1:249705110811:web:f50b732132894e0e1b87be",
  measurementId: "G-JEJ52055JP",
  databaseURL: "https://taskconnect-30e07-default-rtdb.firebaseio.com"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth with React Native persistence
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

// Initialize Firestore
const db = getFirestore(app);

// Export what you need
export {
  auth,
  db,
  app,
  GoogleAuthProvider,
  signInWithCredential,
  firebaseConfig
};