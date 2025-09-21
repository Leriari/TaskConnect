// Fixed TOTP implementation for the TwoFactorAuthScreen.tsx

import crypto from 'crypto-js';
import base32 from 'hi-base32';

// Improved TOTP (Time-based One-Time Password) implementation for 2FA
class TOTPService {
  // Generate a shorter random secret key for TOTP (80 bits instead of 160)
  static generateSecret() {
    const randomBytes = new Uint8Array(10); // 80 bits = 10 bytes
    for (let i = 0; i < randomBytes.length; i++) {
      randomBytes[i] = Math.floor(Math.random() * 256);
    }
    // Generate base32 string and remove padding
    return base32.encode(randomBytes).replace(/=/g, '');
  }

  // Generate QR code URL for Google Authenticator
  static getQRCodeUrl(email: string, secret: string, issuer: string = 'YourApp') {
    const encodedIssuer = encodeURIComponent(issuer);
    const encodedEmail = encodeURIComponent(email);
    // Make sure to remove any whitespace from the secret
    const cleanSecret = secret.replace(/\s+/g, '');
    return `https://chart.googleapis.com/chart?chs=200x200&chld=M|0&cht=qr&chl=otpauth://totp/${encodedIssuer}:${encodedEmail}?secret=${cleanSecret}&issuer=${encodedIssuer}`;
  }

  // Generate random recovery codes
  static generateRecoveryCodes(count = 8) {
    const codes = [];
    const charset = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    
    for (let i = 0; i < count; i++) {
      let code = '';
      // Format: XXXX-XXXX (shorter format)
      for (let j = 0; j < 2; j++) {
        for (let k = 0; k < 4; k++) {
          code += charset.charAt(Math.floor(Math.random() * charset.length));
        }
        if (j < 1) code += '-';
      }
      codes.push(code);
    }
    
    return codes;
  }
  
  // Verify a TOTP code
  static verifyTOTP(secret: string, token: string): boolean {
    try {
      // Clean the secret (remove any whitespace)
      const cleanSecret = secret.replace(/\s+/g, '');
      
      // Get current time window (30 seconds)
      const timeWindow = Math.floor(Date.now() / 1000 / 30);
      
      // Check current time window and adjacent windows for clock skew
      for (let i = -1; i <= 1; i++) {
        const calculatedToken = this.generateTOTP(cleanSecret, timeWindow + i);
        if (calculatedToken === token) {
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error('Error verifying TOTP:', error);
      return false;
    }
  }
  
  // Generate TOTP for a specific time window
  static generateTOTP(secret: string, timeWindow: number): string {
    try {
      // Clean the secret (remove any whitespace)
      const cleanSecret = secret.replace(/\s+/g, '');
      
      // Use asBytes for byte array instead of UTF-8 string
      const key = base32.decode.asBytes(cleanSecret);
      
      // Convert key to WordArray
      const keyWords = [];
      for (let i = 0; i < key.length; i += 4) {
        keyWords.push(
          ((key[i] || 0) << 24) |
          ((key[i + 1] || 0) << 16) |
          ((key[i + 2] || 0) << 8) |
          (key[i + 3] || 0)
        );
      }
      const keyWordArray = crypto.lib.WordArray.create(keyWords);
      
      // Convert time to byte array (8 bytes, big endian)
      const timeBytes = new Uint8Array(8);
      let value = timeWindow;
      for (let i = 7; i >= 0; i--) {
        timeBytes[i] = value & 0xff;
        value = value >> 8;
      }
      
      // Convert timeBytes to WordArray
      const timeWords = [];
      for (let i = 0; i < timeBytes.length; i += 4) {
        timeWords.push(
          ((timeBytes[i] || 0) << 24) |
          ((timeBytes[i + 1] || 0) << 16) |
          ((timeBytes[i + 2] || 0) << 8) |
          (timeBytes[i + 3] || 0)
        );
      }
      const timeWordArray = crypto.lib.WordArray.create(timeWords);
      
      // Calculate HMAC-SHA1
      const hmac = crypto.HmacSHA1(timeWordArray, keyWordArray);
      
      // Convert hmac to byte array
      const hmacHex = hmac.toString();
      const hmacBytes = new Uint8Array(hmacHex.length / 2);
      for (let i = 0; i < hmacHex.length; i += 2) {
        hmacBytes[i / 2] = parseInt(hmacHex.substring(i, i + 2), 16);
      }
      
      // Get offset (last 4 bits of the hash)
      const offset = hmacBytes[hmacBytes.length - 1] & 0x0f;
      
      // Calculate binary code (31 bits)
      const binary = 
        ((hmacBytes[offset] & 0x7f) << 24) |
        (hmacBytes[offset + 1] << 16) |
        (hmacBytes[offset + 2] << 8) |
        hmacBytes[offset + 3];
      
      // Calculate 6-digit code
      const token = binary % 1000000;
      
      // Zero pad if necessary
      return token.toString().padStart(6, '0');
    } catch (error) {
      console.error('Error generating TOTP:', error);
      return '000000';
    }
  }
}

export default TOTPService;