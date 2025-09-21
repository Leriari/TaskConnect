const admin = require('firebase-admin');

// Path to your service account key JSON file
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Replace this with your user's UID
const uid = 'LLzTRqDJ9rSoYHUKHAHOTXeiag72';

admin.auth().setCustomUserClaims(uid, { admin: true })
  .then(() => {
    console.log(`Admin claim set for user: ${uid}`);
    process.exit();
  })
  .catch(error => {
    console.error('Error setting admin claim:', error);
    process.exit(1);
  }); 