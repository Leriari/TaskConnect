const express = require('express');
const cors = require('cors');
const axios = require('axios');
const qs = require('querystring');
const crypto = require('crypto');
const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for all routes
app.use(cors());

// Parse URL-encoded bodies and JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Store tokens and PKCE verifiers temporarily (in-memory storage - would use a database in production)
const authSessions = {};
const pendingRequests = {}; // Store code_verifier for each state

// Function to generate a random string for PKCE
function generateRandomString(length) {
  return crypto.randomBytes(length).toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
    .substring(0, length);
}

// Function to create code challenge from verifier (S256 method)
async function generateCodeChallenge(codeVerifier) {
  const digest = crypto.createHash('sha256')
    .update(codeVerifier)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  return digest;
}

// Add route to verify server is running
app.get('/', (req, res) => {
  res.send('OAuth callback server is running');
});

// Add endpoint to initiate the OAuth flow with PKCE
app.post('/init-auth', async (req, res) => {
  try {
    const state = generateRandomString(12);
    const codeVerifier = generateRandomString(64);
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    
    // Store code verifier for later use
    pendingRequests[state] = {
      codeVerifier,
      timestamp: Date.now()
    };
    
    console.log(`Initiated auth flow with state: ${state}`);
    console.log(`Stored code_verifier (length: ${codeVerifier.length})`);
    
    // Return the auth parameters to the client
    res.json({
      state,
      codeChallenge,
      codeChallengeMethod: 'S256'
    });
  } catch (error) {
    console.error('Error initializing auth:', error);
    res.status(500).json({ error: 'Failed to initialize authentication' });
  }
});

// Handle OAuth callback
app.get('/oauth2callback', async (req, res) => {
  console.log('Received OAuth callback with query params:', req.query);
  console.log('Headers:', req.headers);
  
  try {
    // Extract the authorization code from the request
    const { code, state } = req.query;
    
    if (!code) {
      console.error('No authorization code received');
      return res.status(400).send('No authorization code received');
    }
    
    // Check if we have a stored code verifier for this state
    if (!state || !pendingRequests[state]) {
      console.error(`No pending request found for state: ${state}`);
      return res.status(400).send('Invalid or expired state parameter');
    }
    
    // Retrieve the code verifier
    const { codeVerifier } = pendingRequests[state];
    
    if (!codeVerifier) {
      console.error('No code verifier found for this state');
      return res.status(400).send('No code verifier found');
    }
    
    console.log(`Found code_verifier for state ${state} (length: ${codeVerifier.length})`);
    
    // Exchange the code for tokens
    const clientId = '249705110811-b5h6c9rb8i79uqug3tt5ficghcfk9o0d.apps.googleusercontent.com'; // Your Android client ID
    const clientSecret = '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'; // Your client secret
    const redirectUri = 'https://c200-197-237-175-62.ngrok-free.app/oauth2callback';
    
    console.log('Exchanging code for tokens with params:');
    console.log('- clientId:', clientId);
    console.log('- redirectUri:', redirectUri);
    console.log('- code length:', code.length);
    console.log('- code_verifier length:', codeVerifier.length);
    
    // IMPORTANT: Google OAuth requires form-urlencoded format, not JSON
    const tokenData = {
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      code_verifier: codeVerifier // This is the key addition
    };
    
    // Make the token exchange request with proper format
    const tokenResponse = await axios.post(
      'https://oauth2.googleapis.com/token',
      qs.stringify(tokenData),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    // Extract the tokens
    const { id_token, access_token } = tokenResponse.data;
    
    console.log('Token exchange successful!');
    console.log('- id_token length:', id_token ? id_token.length : 'N/A');
    console.log('- access_token length:', access_token ? access_token.length : 'N/A');
    
    // Store the tokens with the state as the key
    authSessions[state] = {
      id_token,
      access_token,
      timestamp: Date.now()
    };
    
    // Clean up the pending request
    delete pendingRequests[state];
    
    console.log(`Tokens stored with state: ${state}`);
    
    // Return a success page with the state parameter that the user can use
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Sign-In Successful</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            text-align: center;
            padding: 20px;
            color: #333;
            background-color: #f9f9f9;
            max-width: 100%;
            margin: 0 auto;
          }
          .container {
            max-width: 500px;
            margin: 40px auto;
            padding: 30px;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            background-color: white;
          }
          .success-icon {
            width: 80px;
            height: 80px;
            margin: 0 auto 20px;
            background-color: #4CAF50;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .checkmark {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: block;
            stroke-width: 4;
            stroke: #fff;
            stroke-miterlimit: 10;
          }
          h1 {
            color: #4CAF50;
            font-size: 24px;
            margin-bottom: 15px;
          }
          p {
            font-size: 16px;
            line-height: 1.5;
            margin-bottom: 25px;
          }
          .return-message {
            font-weight: bold;
            font-size: 18px;
            margin-top: 30px;
          }
          .status-received {
            font-size: 12px;
            color: #777;
            margin-top: 20px;
          }
          .session-code {
            font-family: monospace;
            background: #f5f5f5;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 16px;
            display: inline-block;
            margin: 10px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="success-icon">
            <svg class="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
              <path fill="none" d="M14,27 L22,35 L38,15" stroke="white" stroke-width="4" />
            </svg>
          </div>
          <h1>Authentication Successful!</h1>
          <p>You have successfully signed in with Google.</p>
          
          <p>Your authentication code is:</p>
          <div class="session-code">${state}</div>
          <p class="return-message">Return to the app and enter this code to complete sign-in.</p>
          
          <p class="status-received">The authentication server has received your information.</p>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('Error exchanging code for tokens:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    res.status(500).send(`
      <html>
        <head>
          <title>Authentication Error</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              text-align: center;
              padding: 20px;
              color: #333;
              max-width: 500px;
              margin: 40px auto;
            }
            h1 {
              color: #d32f2f;
            }
            .error-container {
              background-color: white;
              border-radius: 12px;
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
              padding: 30px;
            }
            .error-details {
              background: #f5f5f5;
              border-radius: 4px;
              padding: 10px;
              margin-top: 20px;
              font-family: monospace;
              text-align: left;
              overflow-wrap: break-word;
            }
          </style>
        </head>
        <body>
          <div class="error-container">
            <h1>Authentication Error</h1>
            <p>There was a problem processing your sign in.</p>
            <p>Please close this window and try again.</p>
            <div class="error-details">
              <strong>Error details:</strong><br>
              ${error.message}<br>
              ${error.response ? JSON.stringify(error.response.data, null, 2) : ''}
            </div>
          </div>
        </body>
      </html>
    `);
  }
});

// Endpoint for the app to retrieve tokens using the state parameter
app.post('/get-tokens', (req, res) => {
  const { state } = req.body;
  
  console.log(`Received token retrieval request for state: ${state}`);
  
  if (!state || !authSessions[state]) {
    console.log(`No session found for state: ${state}`);
    console.log(`Available sessions: ${Object.keys(authSessions).join(', ')}`);
    return res.status(404).json({ 
      success: false, 
      error: 'No authentication session found with this state' 
    });
  }
  
  // Get the tokens
  const tokens = authSessions[state];
  
  // Delete the session after retrieving (one-time use)
  delete authSessions[state];
  
  console.log(`Returning tokens for state: ${state}`);
  
  // Return the tokens to the app
  res.json({
    success: true,
    id_token: tokens.id_token,
    access_token: tokens.access_token
  });
});

// Add a cleanup job to remove old sessions and pending requests
setInterval(() => {
  const now = Date.now();
  const expiryTime = 15 * 60 * 1000; // 15 minutes
  
  Object.keys(authSessions).forEach(state => {
    if (now - authSessions[state].timestamp > expiryTime) {
      console.log(`Removing expired session: ${state}`);
      delete authSessions[state];
    }
  });
  
  Object.keys(pendingRequests).forEach(state => {
    if (now - pendingRequests[state].timestamp > expiryTime) {
      console.log(`Removing expired pending request: ${state}`);
      delete pendingRequests[state];
    }
  });
}, 5 * 60 * 1000); // Run every 5 minutes

// Start server
app.listen(PORT, () => {
  console.log(`OAuth callback server running on port ${PORT}`);
  console.log(`Callback URL should be configured as:  https://c200-197-237-175-62.ngrok-free.app/oauth2callback`);
});