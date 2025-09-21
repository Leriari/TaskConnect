// app/types/FirestoreSchema.ts

/**
 * This file defines TypeScript interfaces for your Firestore database schema
 * including the newly added Two-Factor Authentication data structure
 */

export interface UserDocument {
    uid: string;
    email: string;
    displayName?: string;
    photoURL?: string;
    createdAt: string;
    updatedAt: string;
    lastLoginAt?: string;
    
    // User profile data
    profile?: {
      firstName?: string;
      lastName?: string;
      phoneNumber?: string;
      dateOfBirth?: string;
      gender?: string;
    };
    
    // Addresses
    addresses?: {
      [id: string]: AddressData;
    };
    
    // Two-Factor Authentication data
    twoFactorAuth?: TwoFactorAuthData;
  }
  
  export interface AddressData {
    label: string;
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    isDefault: boolean;
    createdAt: string;
    updatedAt: string;
  }
  
  /**
   * Two-Factor Authentication data structure
   */
  export interface TwoFactorAuthData {
    // The secret key used for generating TOTP codes
    secret: string;
    
    // Recovery codes for backup access
    recoveryCodes: string[];
    
    // Whether 2FA is currently enabled
    enabled: boolean;
    
    // Whether setup has been started but not completed
    setupPending: boolean;
    
    // Timestamps
    createdAt: string;
    enabledAt?: string;
  }
  
  /**
   * Interface for the TOTP (Time-based One-Time Password) Service
   * This defines the structure of the TOTPService class in your app
   */
  export interface TOTPServiceInterface {
    // Generate a random secret key for TOTP
    generateSecret(): string;
    
    // Generate a QR code URL for authentication apps
    getQRCodeUrl(email: string, secret: string, issuer?: string): string;
    
    // Generate recovery codes
    generateRecoveryCodes(count?: number): string[];
    
    // Verify a TOTP code
    verifyTOTP(secret: string, token: string): boolean;
    
    // Generate a TOTP code for a specific time window
    generateTOTP(secret: string, timeWindow: number): string;
  }