// functions/index.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const mpesaRouter = require('./mpesa/routes');
const { onDocumentCreated, onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { logger } = require("firebase-functions");

// --- Initialize Firebase Admin ---
// This ensures we don't initialize the app more than once
if (!admin.apps.length) {
    admin.initializeApp();
}

const app = express();
app.use(express.json());
app.use('/mpesa', mpesaRouter);

exports.api = functions.https.onRequest(app);

// --- Firestore Triggers for Push Notifications ---

/**
 * Triggered when a new job is created.
 * Sends a notification to the tasker about the new request.
 */
exports.onJobCreated = onDocumentCreated("jobs/{jobId}", async (event) => {
    const snap = event.data;
    if (!snap) {
        logger.log("No data associated with the event");
        return;
    }
    const job = snap.data();
    if (!job || !job.taskerId) {
        logger.log("Job created with no taskerId. Exiting.");
        return;
    }

    // Get the tasker's push token
    const taskerRef = admin.firestore().collection("taskers").doc(job.taskerId);
    const taskerDoc = await taskerRef.get();
    const tasker = taskerDoc.data();

    if (!tasker || !tasker.pushToken) {
        logger.log(`Tasker ${job.taskerId} does not have a push token.`);
        return;
    }

    // Construct the notification message
    const message = {
        to: tasker.pushToken,
        sound: "default",
        title: "New Job Request! 💼",
        body: `You have a new service request waiting for your approval.`,
        data: { jobId: event.params.jobId },
    };

    try {
        logger.log("Sending notification to tasker:", message);
        // Using fetch is the modern way to make HTTP requests.
        // await fetch('https://api.expo.dev/v2/push/send', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify(message),
        // });
    } catch (error) {
        logger.error("Error sending push notification:", error);
    }
});

/**
 * Triggered when a job's status is updated.
 * Notifies the client about approval or rejection.
 */
exports.onJobUpdated = onDocumentUpdated("jobs/{jobId}", async (event) => {
    const snap = event.data;
    if (!snap) {
        logger.log("No data associated with the event");
        return;
    }
    const before = snap.before.data();
    const after = snap.after.data();

    // Check if the status has changed from 'pending_approval'
    if (before.status !== "pending_approval" || before.status === after.status) {
        logger.log("Job status not relevant for notification.");
        return;
    }

    // Get the client's push token
    const clientRef = admin.firestore().collection("users").doc(after.clientId);
    const clientDoc = await clientRef.get();
    const client = clientDoc.data();

    if (!client || !client.pushToken) {
        logger.log(`Client ${after.clientId} does not have a push token.`);
        return;
    }

    let title = "";
    let body = "";

    if (after.status === "in_progress") {
        title = "Booking Approved! ✅";
        body = "Your service request has been approved by the tasker. You can now proceed with payment.";
    } else if (after.status === "rejected") {
        title = "Booking Rejected ❌";
        body = "Unfortunately, your service request has been rejected by the tasker.";
    } else {
        return; // Don't notify for other status changes here
    }

    const message = {
        to: client.pushToken,
        sound: "default",
        title,
        body,
        data: { jobId: event.params.jobId },
    };

    try {
        logger.log("Sending notification to client:", message);
        // Use fetch to send to Expo's push service
    } catch (error) {
        logger.error("Error sending push notification:", error);
    }
});

// import * as functions from 'firebase-functions';
// import * as admin from 'firebase-admin';
// const config = require('./runtimeconfig.json');  // adjust path if needed
// import axios from 'axios';

// admin.initializeApp();

// // helper to get Daraja access_token
// async function getDarajaToken() {
//   const creds = Buffer.from(`${config.consumer_key}:${config.consumer_secret}`).toString('base64');
//   const { data } = await axios.get(
//     config.sandbox
//       ? 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'
//       : 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
//     { headers: { Authorization: `Basic ${creds}` } }
//   );
//   return data.access_token;
// }

// // STK push endpoint
// export const stkPush = functions.https.onRequest(async (req, res) => {
//   const { amount, phoneNumber, accountReference, transactionDesc } = req.body;
//   try {
//     const token = await getDarajaToken();
//     const timestamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
//     const password = Buffer.from(
//       config.shortcode + config.passkey + timestamp
//     ).toString('base64');
//     const url = config.sandbox
//       ? 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest'
//       : 'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest';

//     const { data } = await axios.post(url, {
//       BusinessShortCode: config.shortcode,
//       Password: password,
//       Timestamp: timestamp,
//       TransactionType: 'CustomerPayBillOnline',
//       Amount: amount,
//       PartyA: phoneNumber,
//       PartyB: config.shortcode,
//       PhoneNumber: phoneNumber,
//       CallBackURL: config.callback_url,
//       AccountReference: accountReference,
//       TransactionDesc: transactionDesc
//     }, {
//       headers: { Authorization: `Bearer ${token}` }
//     });

//     res.json({ checkoutRequestId: data.CheckoutRequestID });
//   } catch (e) {
//     console.error('STK Push error', e.response?.data || e);
//     res.status(500).send('Daraja STK failed');
//   }
// });

// // (Add your callback handler, B2C, etc., similarly importing `config`.)
