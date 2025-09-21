import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Platform, 
  Alert, 
  TextInput, 
  View, 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  ActivityIndicator,
  AppState 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { auth, GoogleAuthProvider, signInWithCredential } from '../../firebase-config';
import { router } from 'expo-router';
import Constants from 'expo-constants';

// This is needed for token exchange even though we're using a manual flow
WebBrowser.maybeCompleteAuthSession({
  skipRedirectCheck: true,
});

export default function useGoogleSignIn() {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState(null);
  const [authUser, setAuthUser] = useState(null);
  const [waitingForManualReturn, setWaitingForManualReturn] = useState(false);
  const [authCode, setAuthCode] = useState('');
  const [showCodeInput, setShowCodeInput] = useState(false);
  // Store auth parameters for PKCE flow
  const [authParams, setAuthParams] = useState(null);
  
  // Keep track of browser session state
  const browserOpenRef = useRef(false);
  
  // Add a counter to force re-renders
  const [renderCounter, setRenderCounter] = useState(0);
  
  // Function to force a re-render
  const forceRerender = useCallback(() => {
    setRenderCounter(prev => prev + 1);
  }, []);
  
  // AppState listener for detecting app focus
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
     
      
      // When app becomes active again and browser was open
      if (nextAppState === 'active' && browserOpenRef.current) {
       
        
        // Ensure code input is shown if we were signing in
        if (isSigningIn) {
       
          setWaitingForManualReturn(true);
          setShowCodeInput(true);
          
          // Force a re-render after a short delay
          setTimeout(() => {
           
            forceRerender();
            
            // Double-check state after a short delay and show alert if needed
            setTimeout(() => {
              if (isSigningIn) {
                
                Alert.alert(
                  "Enter Authentication Code",
                  "Please enter the code shown in the browser to complete sign-in.",
                  [{ text: "OK", onPress: () => {
                    // Force state updates again
                    setWaitingForManualReturn(true);
                    setShowCodeInput(true);
                    forceRerender();
                  }}]
                );
              }
            }, 500);
          }, 100);
          
          // Reset browser open state
          browserOpenRef.current = false;
        }
      }
    });
    
    return () => {
      subscription.remove();
    };
  }, [isSigningIn, forceRerender]);
  
  // Get platform-specific client ID
  const getClientId = () => {
    if (Platform.OS === 'ios') {
      return '249705110811-b5h6c9rb8i79uqug3tt5ficghcfk9o0d.apps.googleusercontent.com'; // Replace with your iOS client ID
    } else if (Platform.OS === 'android') {
      return '249705110811-b5h6c9rb8i79uqug3tt5ficghcfk9o0d.apps.googleusercontent.com'; // Android client ID
    } else {
      return '249705110811-b5h6c9rb8i79uqug3tt5ficghcfk9o0d.apps.googleusercontent.com'; // Web client ID
    }
  };

  // Use ngrok redirect URI for all platforms
  const ngrokRedirectUri = 'https://c200-197-237-175-62.ngrok-free.app/oauth2callback';
  const serverBaseUrl = 'https://c200-197-237-175-62.ngrok-free.app';
  
  // Function to log current auth status
  const logAuthStatus = useCallback(() => {
  
    return auth.currentUser;
  }, []);

  // Log environment info once
  useEffect(() => {
 
    
    // Log initial auth state
    logAuthStatus();
    
    // Check if user is already authenticated on startup
    const unsubscribe = auth.onAuthStateChanged((firebaseUser) => {
   
      
      if (firebaseUser) {
        setAuthUser(firebaseUser);
        setWaitingForManualReturn(false);
        setShowCodeInput(false);
        
        // If already signed in and not on home route, redirect to home
        if (router.pathname !== '/home') {
         
          router.replace('/home');
        }
      } else {
       
        setAuthUser(null);
      }
      
      // Re-log complete auth status after change
      setTimeout(logAuthStatus, 500);
    });
    
    // Set interval to periodically log auth state
    const intervalId = setInterval(logAuthStatus, 10000);
    
    // Clean up listeners
    return () => {
      unsubscribe();
      clearInterval(intervalId);
     
    };
  }, [logAuthStatus]);

  // Function to initialize the PKCE flow by getting a state and code challenge
  const initializePKCEFlow = useCallback(async () => {
    try {
      
      
      const response = await fetch(`${serverBaseUrl}/init-auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
     
      
      setAuthParams(data);
      return data;
    } catch (error) {
     
      setError(`Failed to initialize authentication: ${error.message}`);
      throw error;
    }
  }, [serverBaseUrl]);

  // Function to handle Firebase sign-in
  const handleFirebaseSignIn = useCallback(async (idToken) => {
    try {
  
      
      const credential = GoogleAuthProvider.credential(idToken);
      
 
      
      const userCredential = await signInWithCredential(auth, credential);
      const { user } = userCredential;
      

      setAuthUser(user);
      setWaitingForManualReturn(false);
      setShowCodeInput(false);
      
      
      // Log auth state after short delay to ensure it's updated
      setTimeout(logAuthStatus, 500);
      
      router.replace('/home');
      return true;
    } catch (error) {
      setError(`Firebase sign-in failed: ${error.message}`);
      setWaitingForManualReturn(false);
      return false;
    } finally {
      setIsSigningIn(false);
    }
  }, [logAuthStatus]);
  
  // Function to retrieve tokens using the state code
  const retrieveTokensWithCode = useCallback(async (code) => {
    try {
     
      
      const response = await fetch(`${serverBaseUrl}/get-tokens`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ state: code }),
      });
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.id_token) {
       
        await handleFirebaseSignIn(data.id_token);
        return true;
      } else {
        throw new Error(data.error || 'Failed to retrieve tokens');
      }
    } catch (error) {
      setError(`Failed to retrieve tokens: ${error.message}`);
      return false;
    }
  }, [handleFirebaseSignIn, serverBaseUrl]);

  // Trigger sign-in function with PKCE flow - IMPROVED
  const triggerSignIn = useCallback(async () => {
    try {
      if (isSigningIn) {
        return;
      }
      
     
      setIsSigningIn(true);
      setError(null);
      
      // Reset any previous state
      setWaitingForManualReturn(false);
      setShowCodeInput(false);
      setAuthCode('');
      
      // First, initialize the PKCE flow to get state and code challenge
      const authParams = await initializePKCEFlow();
 
      // Construct the authorization URL manually with PKCE parameters
      const clientId = getClientId();
      const scopes = encodeURIComponent('email profile openid');
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(ngrokRedirectUri)}&response_type=code&scope=${scopes}&state=${authParams.state}&code_challenge=${authParams.codeChallenge}&code_challenge_method=${authParams.codeChallengeMethod}&prompt=consent`;
      
     
      
      // Show information alert before opening browser
      Alert.alert(
        "Google Sign-In",
        "You will be redirected to Google login. After completion, you'll see a code. Return to the app and enter that code.",
        [{ text: "Continue", onPress: async () => {
          // Set browser open state to true BEFORE opening browser
          browserOpenRef.current = true;
          
          // Open the URL in the browser AFTER alert is dismissed
         
          
          try {
            const result = await WebBrowser.openAuthSessionAsync(
              authUrl,
              null,
              {
                createTask: true,
                showInRecents: true,
                preferEphemeralSession: false,
              }
            );
            
           
            
            // Show code input UI right after browser closes, regardless of result
         
            setWaitingForManualReturn(true);
            setShowCodeInput(true);
            forceRerender(); // Force re-render after state changes
            
            // Reset browser open state
            browserOpenRef.current = false;
            
            // Immediate alert to ensure the user knows what to do
            Alert.alert(
              "Authentication Code Required",
              "Please enter the code shown in the browser to complete sign-in.",
              [{ text: "OK", onPress: () => {
               
                setWaitingForManualReturn(true);
                setShowCodeInput(true);
                forceRerender(); // Force re-render again
              }}]
            );
          } catch (err) {
          
            browserOpenRef.current = false;
            setIsSigningIn(false);
          }
        }}]
      );
    } catch (err) {
     
      setError(`Failed to start sign-in: ${err.message}`);
      setIsSigningIn(false);
      setWaitingForManualReturn(false);
      setShowCodeInput(false);
      browserOpenRef.current = false;
    }
  }, [initializePKCEFlow, getClientId, ngrokRedirectUri, isSigningIn, forceRerender]);
  
  // Handle manual code submission
  const handleCodeSubmit = useCallback(async () => {
    if (!authCode || authCode.trim() === '') {
      setError('Please enter the authentication code');
      return;
    }
    
    setIsSigningIn(true);
    setError(null);
    
    try {
      const success = await retrieveTokensWithCode(authCode.trim());
      if (!success) {
        setError('Failed to validate authentication code. Please try again.');
      }
    } catch (err) {
     
      setError(`Code submission failed: ${err.message}`);
    } finally {
      setIsSigningIn(false);
    }
  }, [authCode, retrieveTokensWithCode]);
  
  // Sign out function
  const signOut = useCallback(async () => {
    try {
     
      await auth.signOut();
      
      setAuthUser(null);
      
      // Navigate to login page
      router.replace('/');
      return true;
    } catch (err) {
      return false;
    }
  }, []);
  
  // Render code input component when needed
  const CodeInputComponent = useCallback(() => {
    return (
      <View style={styles.codeInputContainer}>
        <Text style={styles.codeInputTitle}>Enter Authentication Code</Text>
        <Text style={styles.codeInputInstructions}>
          After signing in with Google, you'll receive a code in the browser. 
          Please copy and paste that code below.
        </Text>
        
        <TextInput
          style={styles.codeInput}
          value={authCode}
          onChangeText={setAuthCode}
          placeholder="Enter code from browser"
          placeholderTextColor="#999"
          autoCapitalize="none"
          autoComplete="off"
          autoCorrect={false}
        />
        
        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleCodeSubmit}
          disabled={isSigningIn}
        >
          <LinearGradient
            colors={['#5CBD6A', '#3C9D4E']}
            start={[0, 0]}
            end={[1, 0]}
            style={styles.submitButtonGradient}
          >
            {isSigningIn ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.submitButtonText}>Complete Sign-In</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
        
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>
    );
  }, [authCode, handleCodeSubmit, isSigningIn, error]);
  
  // Force code input display - can be called externally if needed
  const forceShowCodeInput = useCallback(() => {
   
    setWaitingForManualReturn(true);
    setShowCodeInput(true);
    forceRerender(); // Force re-render to ensure UI updates
    
    // Show alert to confirm
    Alert.alert(
      "Authentication Code Mode",
      "Code input mode has been activated. Please enter the authentication code from Google.",
      [{ text: "OK" }]
    );
  }, [forceRerender]);
  
  // Debug function to check current state
  const debugState = useCallback(() => {
   
    // Show debug alert with key state
    if (__DEV__) {
      Alert.alert(
        "Debug State",
        `isSigningIn: ${isSigningIn}\nwaitingForManualReturn: ${waitingForManualReturn}\nshowCodeInput: ${showCodeInput}\nbrowserOpen: ${browserOpenRef.current}\nrenderCount: ${renderCounter}`,
        [{ text: "OK" }]
      );
    }
  }, [isSigningIn, waitingForManualReturn, showCodeInput, error, authParams, authCode, authUser, renderCounter]);
  
  return {
    isSigningIn,
    error,
    user: authUser,
    isAuthenticated: !!authUser,
    signIn: triggerSignIn,
    signOut,
    checkAuthStatus: logAuthStatus,
    waitingForManualReturn,
    CodeInputComponent,
    handleCodeSubmit,
    setAuthCode,
    authCode,
    forceShowCodeInput,
    debugState,
    renderTrigger: renderCounter, // Export this to help trigger re-renders
    promptAsync: triggerSignIn  // Ensure promptAsync is exported for compatibility
  };
}

// Styles for the code input component
const styles = StyleSheet.create({
  codeInputContainer: {
    marginVertical: 20,
    padding: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  codeInputTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
    color: '#fff',
  },
  codeInputInstructions: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 20,
  },
  codeInput: {
    height: 60,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    letterSpacing: 1.5,
  },
  submitButton: {
    marginTop: 5,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  submitButtonGradient: {
    height: 55,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorText: {
    color: '#ff6b6b',
    marginTop: 15,
    textAlign: 'center',
    fontSize: 14,
  }
});