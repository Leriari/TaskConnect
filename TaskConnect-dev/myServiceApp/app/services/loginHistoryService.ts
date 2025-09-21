import { collection, addDoc, query, where, orderBy, getDocs, limit } from 'firebase/firestore';
import { db } from '@/firebase-config';
import { LoginRecord } from '../types/firebase'; // Adjust the import path as necessary
import * as Device from 'expo-device';
import * as Network from 'expo-network';

// Collection reference
const COLLECTION_NAME = 'loginHistory';

// Helper function to get IP and location information
const getIpAndLocationInfo = async (): Promise<{ ip: string, location: string }> => {
  try {
    // Get network info using Expo's Network module
    const ip = await Network.getIpAddressAsync();
    
    // For location, you would typically use Expo's Location module
    // This requires additional permissions and setup
    // For now, we'll just use a placeholder
    const location = 'Unknown';
    
    return { ip, location };
  } catch (error) {
    console.error('Error getting IP/location:', error);
    return { ip: 'Unknown', location: 'Unknown' };
  }
};

// Add a new login record
export const addLoginRecord = async (
  userId: string, 
  successful: boolean, 
  method: LoginRecord['method']
): Promise<string> => {
  try {
    // Get device information using Expo's Device module
    const device = Device.modelName || 'Unknown Device';
    
    // Get IP and location info
    const { ip, location } = await getIpAndLocationInfo();

    const loginData: Omit<LoginRecord, 'id'> = {
      userId,
      timestamp: Date.now(),
      device,
      ipAddress: ip,
      location,
      successful,
      method
    };
    
    const docRef = await addDoc(collection(db, COLLECTION_NAME), loginData);
    return docRef.id;
  } catch (error) {
    console.error('Error adding login record:', error);
    throw error;
  }
};

// Get login history for a specific user
export const getUserLoginHistory = async (userId: string, limitCount = 50): Promise<LoginRecord[]> => {
  try {
    const loginQuery = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );
    
    const snapshot = await getDocs(loginQuery);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as LoginRecord));
  } catch (error) {
    console.error('Error fetching login history:', error);
    throw error;
  }
};