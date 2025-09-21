// app/services/userDatabaseService.ts

import { auth, db } from '@/firebase-config';
import { 
  doc, 
  getDoc, 
  setDoc,
  updateDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';

// Interface definitions
export interface UserProfile {
  displayName: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phoneNumber?: string;
  photoURL?: string;
  userType?: string;
  lastLoginAt?: any; // Firestore Timestamp
  createdAt?: any; // Firestore Timestamp
  isActive?: boolean;
  fcmToken?: string;
  notificationPreference?: {
    email: string;
    push: string;
    sms: string;
  };
  location?: {
    latitude: number;
    longitude: number;
  };
  addresses?: Address[];
}

export interface Address {
  id: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault?: boolean;
}

// Get the current user's profile from Firestore
export const getUserProfile = async (): Promise<UserProfile | null> => {
  try {
    const user = auth.currentUser;
    if (!user) return null;
    
    const userRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      return userDoc.data() as UserProfile;
    } else {
      // If user doesn't exist in Firestore yet, create basic profile
      const newUserProfile: UserProfile = {
        displayName: user.displayName || '',
        email: user.email || '',
        phoneNumber: user.phoneNumber || '',
        photoURL: user.photoURL || '',
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
        isActive: true,
        userType: '',
        addresses: []
      };
      
      // Create the user document
      await setDoc(userRef, newUserProfile);
      return newUserProfile;
    }
  } catch (error) {
    console.error("Error getting user profile:", error);
    throw error;
  }
};

// Update both Firebase Auth and Firestore user profile
export const updateUserProfile = async (profileData: Partial<UserProfile>): Promise<void> => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("No authenticated user found");
    
    // Update Firebase Auth profile if we have relevant fields
    if (profileData.displayName || profileData.photoURL) {
      await updateProfile(user, {
        displayName: profileData.displayName,
        photoURL: profileData.photoURL
      });
    }
    
    // Update Firestore profile
    const userRef = doc(db, "users", user.uid);
    
    // Add timestamp for the update
    const updatedData = {
      ...profileData,
      lastLoginAt: serverTimestamp()
    };
    
    await updateDoc(userRef, updatedData);
  } catch (error) {
    console.error("Error updating user profile:", error);
    throw error;
  }
};

// Get user's saved addresses
export const getUserAddresses = async (): Promise<Address[]> => {
  try {
    const userProfile = await getUserProfile();
    return userProfile?.addresses || [];
  } catch (error) {
    console.error("Error getting user addresses:", error);
    throw error;
  }
};

// Add a new address
export const addUserAddress = async (address: Address): Promise<void> => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("No authenticated user found");
    
    const addresses = await getUserAddresses();
    
    // If this is the first address or marked as default
    if (addresses.length === 0 || address.isDefault) {
      // If this address is marked as default, unmark all others
      addresses.forEach(addr => addr.isDefault = false);
      address.isDefault = true;
    }
    
    const updatedAddresses = [...addresses, address];
    
    const userRef = doc(db, "users", user.uid);
    await updateDoc(userRef, { addresses: updatedAddresses });
  } catch (error) {
    console.error("Error adding user address:", error);
    throw error;
  }
};

// Update an existing address
export const updateUserAddress = async (updatedAddress: Address): Promise<void> => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("No authenticated user found");
    
    const addresses = await getUserAddresses();
    
    // Find and update the address
    const updatedAddresses = addresses.map(addr => 
      addr.id === updatedAddress.id ? updatedAddress : addr
    );
    
    // If this address is marked as default, unmark all others
    if (updatedAddress.isDefault) {
      updatedAddresses.forEach(addr => {
        if (addr.id !== updatedAddress.id) {
          addr.isDefault = false;
        }
      });
    }
    
    const userRef = doc(db, "users", user.uid);
    await updateDoc(userRef, { addresses: updatedAddresses });
  } catch (error) {
    console.error("Error updating user address:", error);
    throw error;
  }
};

// Delete an address
export const deleteUserAddress = async (addressId: string): Promise<void> => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("No authenticated user found");
    
    const addresses = await getUserAddresses();
    const addressToDelete = addresses.find(addr => addr.id === addressId);
    
    // Remove the address
    const updatedAddresses = addresses.filter(addr => addr.id !== addressId);
    
    // If we deleted the default address and there are other addresses, make the first one default
    if (addressToDelete?.isDefault && updatedAddresses.length > 0) {
      updatedAddresses[0].isDefault = true;
    }
    
    const userRef = doc(db, "users", user.uid);
    await updateDoc(userRef, { addresses: updatedAddresses });
  } catch (error) {
    console.error("Error deleting user address:", error);
    throw error;
  }
};

// Set an address as default
export const setDefaultAddress = async (addressId: string): Promise<void> => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("No authenticated user found");
    
    const addresses = await getUserAddresses();
    
    // Update all addresses: set the chosen one as default, all others as non-default
    const updatedAddresses = addresses.map(addr => ({
      ...addr,
      isDefault: addr.id === addressId
    }));
    
    const userRef = doc(db, "users", user.uid);
    await updateDoc(userRef, { addresses: updatedAddresses });
  } catch (error) {
    console.error("Error setting default address:", error);
    throw error;
  }
};