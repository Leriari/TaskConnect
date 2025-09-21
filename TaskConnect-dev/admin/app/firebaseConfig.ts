// Firebase config for admin dashboard (copied from myServiceApp)
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

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

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);

export { app, db }; 