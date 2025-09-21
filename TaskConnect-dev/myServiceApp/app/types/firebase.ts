// Define the interface for login records

export interface LoginRecord {
    id?: string;         // Auto-generated Firestore ID
    userId: string;      // The UID of the authenticated user
    timestamp: number;   // timestamp in milliseconds
    device: string;      // Device information 
    ipAddress: string;   // IP address
    location: string;    // Location info (e.g., "New York, USA")
    successful: boolean; // Whether login was successful
    method: 'password' | 'biometric' | 'google' | 'facebook' | 'apple';
  }