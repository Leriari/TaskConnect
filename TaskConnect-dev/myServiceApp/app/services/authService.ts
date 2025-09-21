import { 
    signInWithEmailAndPassword, 
    signInWithPopup, 
    GoogleAuthProvider,
    FacebookAuthProvider,
    OAuthProvider
  } from 'firebase/auth';
  import { auth, db } from '@/firebase-config';
  import { addLoginRecord } from './loginHistoryService';
  import { doc, updateDoc } from 'firebase/firestore';
  
  // Email/password authentication with login tracking
  export const signInWithEmail = async (email: string, password: string) => {
    try {
      // Perform the authentication
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Record the successful login
      await addLoginRecord(userCredential.user.uid, true, 'password');
      
      // Update the lastLoginDate in your users table
      await updateDoc(doc(db, 'users', userCredential.user.uid), {
        lastLoginDate: Date.now()
      });
      
      return userCredential.user;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };
  
  // Google authentication with login tracking
  export const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      
      // Record the successful login
      await addLoginRecord(userCredential.user.uid, true, 'google');
      
      // Update the lastLoginDate in your users table
      await updateDoc(doc(db, 'users', userCredential.user.uid), {
        lastLoginDate: Date.now()
      });
      
      return userCredential.user;
    } catch (error) {
      console.error('Google login failed:', error);
      throw error;
    }
  };
  
  // Facebook authentication with login tracking
  export const signInWithFacebook = async () => {
    try {
      const provider = new FacebookAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      
      // Record the successful login
      await addLoginRecord(userCredential.user.uid, true, 'facebook');
      
      // Update the lastLoginDate in your users table
      await updateDoc(doc(db, 'users', userCredential.user.uid), {
        lastLoginDate: Date.now()
      });
      
      return userCredential.user;
    } catch (error) {
      console.error('Facebook login failed:', error);
      throw error;
    }
  };
  
  // Apple authentication with login tracking
  export const signInWithApple = async () => {
    try {
      const provider = new OAuthProvider('apple.com');
      const userCredential = await signInWithPopup(auth, provider);
      
      // Record the successful login
      await addLoginRecord(userCredential.user.uid, true, 'apple');
      
      // Update the lastLoginDate in your users table
      await updateDoc(doc(db, 'users', userCredential.user.uid), {
        lastLoginDate: Date.now()
      });
      
      return userCredential.user;
    } catch (error) {
      console.error('Apple login failed:', error);
      throw error;
    }
  };
  
  // Record biometric login
  export const recordBiometricLogin = async (userId: string) => {
    try {
      // Record the successful login
      await addLoginRecord(userId, true, 'biometric');
      
      // Update the lastLoginDate in your users table
      await updateDoc(doc(db, 'users', userId), {
        lastLoginDate: Date.now()
      });
    } catch (error) {
      console.error('Error recording biometric login:', error);
      throw error;
    }
  };