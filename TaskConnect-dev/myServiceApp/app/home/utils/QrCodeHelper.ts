// app/(tabs)/home/utils/QRCodeHelper.ts

import * as FileSystem from 'expo-file-system';

/**
 * Helper class for handling QR code generation.
 * Since Google Charts API doesn't always work in React Native,
 * this provides a more robust way to get a QR code image
 */
class QRCodeHelper {
  /**
   * Generate a QR code using QR Server API
   * 
   * @param content The content to encode in the QR code
   * @param size The size of the QR code in pixels
   * @returns A promise resolving to the local file URI of the QR code image
   */
  static async generateQRCode(content: string, size: number = 200): Promise<string> {
    try {
      // Clean and encode the content
      const encodedContent = encodeURIComponent(content);
      
      // Use QR Server API (alternative to Google Charts)
      const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodedContent}`;
      
      // Create a temporary file name
      const fileUri = FileSystem.cacheDirectory + 'temp_qrcode.png';
      
      // Download the QR code image
      const downloadResult = await FileSystem.downloadAsync(qrApiUrl, fileUri);
      
      if (downloadResult.status === 200) {
        return fileUri;
      } else {
        throw new Error(`Failed to download QR code: ${downloadResult.status}`);
      }
    } catch (error) {
      console.error('Error generating QR code:', error);
      
      // Return a fallback "failed" image URI if available
      // or just return empty string to handle in the UI
      return '';
    }
  }
  
  /**
   * Generate a TOTP (Time-based One-Time Password) auth URI
   * This URI format is compatible with Google Authenticator and similar apps
   * 
   * @param issuer The name of your app or service
   * @param email The user's email address
   * @param secret The TOTP secret key
   * @returns The TOTP auth URI
   */
  static generateTOTPUri(issuer: string, email: string, secret: string): string {
    // Clean the secret (remove any whitespace)
    const cleanSecret = secret.replace(/\s+/g, '');
    
    // Encode the components
    const encodedIssuer = encodeURIComponent(issuer);
    const encodedEmail = encodeURIComponent(email);
    
    // Build the TOTP URI
    return `otpauth://totp/${encodedIssuer}:${encodedEmail}?secret=${cleanSecret}&issuer=${encodedIssuer}`;
  }
}

export default QRCodeHelper;