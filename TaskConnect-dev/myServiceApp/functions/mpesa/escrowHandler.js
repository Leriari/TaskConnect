// functions/mpesa/escrowHandler.js
const admin = require('firebase-admin');
const axios = require('axios');
// WARNING: This is not the recommended way to handle secrets in production.
// This file should be in your .gitignore and NOT committed to version control.
const config = require('../runtimeconfig.json');

// Helper to get Daraja access_token for C2B (STK Push)
async function getC2BDarajaToken() {
    if (!config.c2b || !config.c2b.consumer_key || !config.c2b.consumer_secret) {
        throw new Error('C2B consumer_key or consumer_secret is not set in runtimeconfig.json.');
    }
    const creds = Buffer.from(`${config.c2b.consumer_key}:${config.c2b.consumer_secret}`).toString('base64');
    const authUrl = config.sandbox === 'true'
        ? 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'
        : 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials';

    const { data } = await axios.get(authUrl, { headers: { Authorization: `Basic ${creds}` } });
    return data.access_token;
}

// Helper to get Daraja access_token for B2C (payouts)
async function getB2CDarajaToken() {
    if (!config.b2c || !config.b2c.consumer_key || !config.b2c.consumer_secret) {
        throw new Error('B2C consumer_key or consumer_secret is not set in runtimeconfig.json.');
    }
    const creds = Buffer.from(`${config.b2c.consumer_key}:${config.b2c.consumer_secret}`).toString('base64');
    const authUrl = config.sandbox === 'true'
        ? 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'
        : 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials';

    const { data } = await axios.get(authUrl, { headers: { Authorization: `Basic ${creds}` } });
    return data.access_token;
}

// Legacy function for backward compatibility
async function getDarajaToken() {
    return getC2BDarajaToken();
}

// 1️⃣ STK Push
exports.initiateStkPush = async (req, res) => {
    const { amount, phoneNumber, accountReference, transactionDesc } = req.body;

    console.log('STK Push request received:', { amount, phoneNumber, accountReference, transactionDesc });

    if (!amount || !phoneNumber || !accountReference || !transactionDesc) {
        console.error('Missing required parameters:', { amount, phoneNumber, accountReference, transactionDesc });
        return res.status(400).send('Missing required parameters: amount, phoneNumber, accountReference, transactionDesc.');
    }

    try {
        const token = await getC2BDarajaToken();
        console.log('C2B Daraja token obtained successfully');

        const timestamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
        const password = Buffer.from(config.c2b.shortcode + config.c2b.passkey + timestamp).toString('base64');
        const url = config.sandbox === 'true'
            ? 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest'
            : 'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest';

        const payload = {
            BusinessShortCode: config.c2b.shortcode,
            Password: password,
            Timestamp: timestamp,
            TransactionType: 'CustomerPayBillOnline',
            Amount: amount,
            PartyA: phoneNumber,
            PartyB: config.c2b.shortcode,
            PhoneNumber: phoneNumber,
            CallBackURL: config.c2b.callback_url,
            AccountReference: accountReference,
            TransactionDesc: transactionDesc
        };

        console.log('STK Push payload:', JSON.stringify(payload, null, 2));
        console.log('STK Push URL:', url);

        const { data } = await axios.post(url, payload, {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log('STK Push response:', JSON.stringify(data, null, 2));

        if (data.ResponseCode === '0') {
            return res.json({ checkoutRequestId: data.CheckoutRequestID });
        } else {
            console.error('STK Push failed with response:', data);
            return res.status(400).json({
                error: 'STK Push failed',
                responseCode: data.ResponseCode,
                responseDescription: data.ResponseDescription
            });
        }
    } catch (err) {
        console.error('STK Push failed', err.response?.data || err.message);
        return res.status(500).json({
            error: 'STK Push failed',
            details: err.response?.data || err.message
        });
    }
};

// 2️⃣ STK Callback
exports.handleStkCallback = async (req, res) => {
    console.log('🏦 STK Callback received');
    console.log('Raw callback payload:', JSON.stringify(req.body, null, 2));

    // Acknowledge the request from Safaricom immediately to prevent timeouts
    res.sendStatus(200);

    // Use optional chaining for safety
    const stkCallback = req.body?.Body?.stkCallback;

    // Validate callback structure
    if (!stkCallback || !stkCallback.CheckoutRequestID) {
        console.error('Invalid STK callback format or missing CheckoutRequestID:', req.body);
        return;
    }

    const { CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = stkCallback;

    console.log(`Processing callback for CheckoutRequestID: ${CheckoutRequestID}, ResultCode: ${ResultCode}`);

    try {
        const db = admin.firestore();
        const jobsRef = db.collection('jobs');

        // Add retry logic for race conditions
        let jobDoc = null;
        let retryCount = 0;
        const maxRetries = 3;

        while (retryCount < maxRetries) {
            const querySnapshot = await jobsRef.where('checkoutRequestId', '==', CheckoutRequestID).get();

            if (!querySnapshot.empty) {
                jobDoc = querySnapshot.docs[0];
                break;
            }

            console.log(`No job found with checkoutRequestId: ${CheckoutRequestID}. Retry ${retryCount + 1}/${maxRetries}`);
            retryCount++;

            if (retryCount < maxRetries) {
                // Wait 1 second before retrying
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        if (!jobDoc) {
            console.error(`No job found with checkoutRequestId: ${CheckoutRequestID} after ${maxRetries} retries. This may happen if the callback arrives before the initial STK push function completes its Firestore write. Or it could be an unknown ID.`);
            return;
        }

        const jobId = jobDoc.id;

        console.log(`Found job: ${jobId}. Current status: ${jobDoc.data().status}`);

        if (ResultCode === 0) {
            // Payment was successful
            console.log(`Payment successful for job: ${jobId}`);

            // Safely extract receipt number and other metadata
            const metadata = CallbackMetadata?.Item || [];
            const mpesaReceiptNumber = metadata.find(item => item.Name === 'MpesaReceiptNumber')?.Value;
            const amount = metadata.find(item => item.Name === 'Amount')?.Value;
            const phoneNumber = metadata.find(item => item.Name === 'PhoneNumber')?.Value;

            console.log(`Updating job ${jobId} with receipt: ${mpesaReceiptNumber}, amount: ${amount}`);

            await jobDoc.ref.update({
                status: 'in_escrow', // Update status to show payment is held
                paymentStatus: 'paid',
                mpesaReceipt: mpesaReceiptNumber || null,
                // Store the entire callback from Safaricom for auditing
                paymentDetails: { ...stkCallback },
            });
            console.log(`Successfully updated job ${jobId} to 'in_escrow'.`);
        } else {
            // Payment failed or was cancelled by the user
            console.log(`Payment failed for job: ${jobId}. Reason: ${ResultDesc}`);
            await jobDoc.ref.update({
                status: 'payment_failed',
                paymentStatus: 'failed',
                // Store the entire callback for debugging
                paymentDetails: { ...stkCallback },
            });
            console.log(`Successfully updated job ${jobId} to 'payment_failed'.`);
        }
    } catch (error) {
        console.error(`Error processing STK callback for ${CheckoutRequestID}:`, error);
    }
};

// 3️⃣ B2C Disbursement
exports.initiateB2C = async (req, res) => {
    const { jobId, taskerPhone, amount } = req.body;
    if (!jobId || !taskerPhone || !amount) {
        return res.status(400).send('Missing required parameters: jobId, taskerPhone, amount.');
    }

    try {
        // Format phone number for Safaricom B2C
        let formattedPhone = taskerPhone;

        // Remove any non-digit characters
        formattedPhone = formattedPhone.replace(/\D/g, '');

        // Ensure it starts with 254 for Kenya
        if (formattedPhone.startsWith('0')) {
            formattedPhone = '254' + formattedPhone.substring(1);
        } else if (formattedPhone.startsWith('+')) {
            formattedPhone = formattedPhone.substring(1);
        } else if (!formattedPhone.startsWith('254')) {
            formattedPhone = '254' + formattedPhone;
        }

        // For sandbox testing, use a valid test number if the provided number fails
        // Safaricom sandbox has specific test numbers that work
        const sandboxTestNumbers = [
            '254708374149', // Test number 1
            '254700000000', // Test number 2
            '254711111111', // Test number 3
            '254722222222', // Test number 4
        ];

        // If we're in sandbox and the number isn't a known test number, use a default
        if (config.sandbox === 'true' && !sandboxTestNumbers.includes(formattedPhone)) {
            console.log(`Using sandbox test number instead of: ${formattedPhone}`);
            formattedPhone = '254708374149'; // Use a known working sandbox number
        }

        console.log(`Original phone: ${taskerPhone}, Formatted phone: ${formattedPhone}`);

        const token = await getB2CDarajaToken();
        const url = config.sandbox === 'true'
            ? 'https://sandbox.safaricom.co.ke/mpesa/b2c/v1/paymentrequest'
            : 'https://api.safaricom.co.ke/mpesa/b2c/v1/paymentrequest';

        // For sandbox, use the plain text security credential
        // For production, this should be encrypted
        const securityCredential = config.sandbox === 'true'
            ? config.b2c.security_credential
            : config.b2c.security_credential; // In production, this should be encrypted

        const payload = {
            InitiatorName: config.b2c.initiator_name,
            SecurityCredential: securityCredential,
            CommandID: 'BusinessPayment',
            Amount: amount,
            PartyA: config.b2c.shortcode,
            PartyB: formattedPhone,
            Remarks: `Payout for job ${jobId}`,
            QueueTimeOutURL: config.b2c.timeout_url,
            ResultURL: config.b2c.result_url,
            Occasion: jobId
        };

        console.log('B2C payload:', JSON.stringify(payload, null, 2));
        console.log('B2C URL:', url);
        console.log('Initiator Name:', config.b2c.initiator_name);
        console.log('Security Credential (first 10 chars):', securityCredential.substring(0, 10) + '...');

        const { data } = await axios.post(url, payload, {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log(`B2C initiated for job ${jobId}. Response:`, data);

        // Check if Safaricom accepted the request
        if (data.ResponseCode === '0') {
            // Update job status to 'processing_payment' immediately
            await admin.firestore().collection('jobs').doc(jobId).update({
                status: 'processing_payment',
                b2cConversationId: data.ConversationID,
                b2cOriginatorConversationId: data.OriginatorConversationID,
                b2cPhoneUsed: formattedPhone, // Store the phone number used for debugging
            });
            return res.status(200).json({
                success: true,
                message: 'Payout to tasker initiated successfully.',
                phoneUsed: formattedPhone
            });
        } else {
            // Safaricom rejected the request
            console.error('B2C request rejected:', data);
            return res.status(400).json({
                success: false,
                message: data.ResponseDescription || 'The B2C request was rejected by the provider.',
                responseCode: data.ResponseCode
            });
        }
    } catch (err) {
        console.error('B2C failed', err.response?.data || err.message);
        // Add job status update here to reflect failure if needed
        return res.status(500).json({ success: false, message: 'B2C disbursement failed. Check function logs.' });
    }
};

/**
 * Handles the B2C Result callback from Safaricom.
 * This is where the final status of the payout is confirmed.
 */
exports.handleB2cResult = async (req, res) => {
    console.log('✅ B2C Result Callback received');
    console.log('Raw B2C result:', JSON.stringify(req.body, null, 2));
    res.sendStatus(200);

    const result = req.body?.Result;
    if (!result) {
        console.error('Invalid B2C result format. Missing "Result" object.');
        return;
    }

    // Destructure for easier access and logging
    const { ConversationID, ResultCode, ResultDesc, OriginatorConversationID } = result;
    console.log(`Processing B2C Result for ConversationID: ${ConversationID}, ResultCode: ${ResultCode}, Desc: ${ResultDesc}`);

    try {
        const db = admin.firestore();
        const jobsRef = db.collection('jobs');
        // Find the job using the ConversationID we saved earlier
        const q = jobsRef.where('b2cConversationId', '==', ConversationID);
        const querySnapshot = await q.get();

        if (querySnapshot.empty) {
            console.error(`No job found for B2C ConversationID: ${ConversationID}. This might also be identified by OriginatorID: ${OriginatorConversationID}`);
            return;
        }

        const jobDoc = querySnapshot.docs[0];
        const jobId = jobDoc.id;
        console.log(`Found job ${jobId} for B2C callback.`);

        const updatePayload = {
            b2cResult: { ...result } // Store the entire result for auditing
        };

        // Handle ResultCode as string (Safaricom returns it as string)
        if (ResultCode === '0' || ResultCode === 0) {
            console.log(`B2C payout SUCCESSFUL for job ${jobId}.`);
            updatePayload.status = 'completed';
            updatePayload.paymentStatus = 'completed';
        } else {
            console.error(`B2C payout FAILED for job ${jobId}. ResultCode: ${ResultCode}, Reason: ${ResultDesc}`);
            updatePayload.status = 'payout_failed';
            updatePayload.failureReason = `B2C failed: ${ResultDesc} (Code: ${ResultCode})`;
        }

        console.log(`Updating job ${jobId} with payload:`, JSON.stringify(updatePayload, null, 2));
        await jobDoc.ref.update(updatePayload);
        console.log(`Job ${jobId} updated successfully with final B2C status.`);

    } catch (error) {
        console.error(`FATAL: Error processing B2C result for ${ConversationID}:`, error);
    }
};

/**
 * Handles B2C timeout callbacks from Safaricom.
 * This is called when a B2C request times out.
 */
exports.handleB2cTimeout = async (req, res) => {
    console.log('⏰ B2C Timeout Callback received');
    console.log('Raw B2C timeout:', JSON.stringify(req.body, null, 2));
    res.sendStatus(200);

    const result = req.body?.Result;
    if (!result) {
        console.error('Invalid B2C timeout format. Missing "Result" object.');
        return;
    }

    const { ConversationID, ResultCode, ResultDesc, OriginatorConversationID } = result;
    console.log(`Processing B2C Timeout for ConversationID: ${ConversationID}, ResultCode: ${ResultCode}, Desc: ${ResultDesc}`);

    try {
        const db = admin.firestore();
        const jobsRef = db.collection('jobs');
        const q = jobsRef.where('b2cConversationId', '==', ConversationID);
        const querySnapshot = await q.get();

        if (querySnapshot.empty) {
            console.error(`No job found for B2C Timeout ConversationID: ${ConversationID}`);
            return;
        }

        const jobDoc = querySnapshot.docs[0];
        const jobId = jobDoc.id;
        console.log(`Found job ${jobId} for B2C timeout.`);

        await jobDoc.ref.update({
            status: 'payout_failed',
            b2cTimeout: { ...result },
            failureReason: `B2C request timed out: ${ResultDesc} (Code: ${ResultCode})`
        });

        console.log(`Job ${jobId} updated with timeout status.`);

    } catch (error) {
        console.error(`FATAL: Error processing B2C timeout for ${ConversationID}:`, error);
    }
};

/**
 * Test B2C configuration to verify initiator credentials
 */
exports.testB2CConfig = async (req, res) => {
    try {
        console.log('Testing B2C configuration...');
        console.log('Initiator Name:', config.b2c_initiator);
        console.log('Security Credential:', config.b2c_security_cred);
        console.log('B2C Shortcode:', config.b2c_shortcode);
        console.log('Sandbox Mode:', config.sandbox);

        const token = await getDarajaToken();
        console.log('Daraja token obtained successfully');

        // Test with a minimal amount and known test number
        const testPayload = {
            InitiatorName: config.b2c_initiator,
            SecurityCredential: config.b2c_security_cred,
            CommandID: 'BusinessPayment',
            Amount: 1,
            PartyA: config.b2c_shortcode,
            PartyB: '254708374149', // Known sandbox test number
            Remarks: 'B2C Configuration Test',
            QueueTimeOutURL: config.b2c_timeout_url,
            ResultURL: config.b2c_result_url,
            Occasion: 'TEST_CONFIG'
        };

        const url = config.sandbox === 'true'
            ? 'https://sandbox.safaricom.co.ke/mpesa/b2c/v1/paymentrequest'
            : 'https://api.safaricom.co.ke/mpesa/b2c/v1/paymentrequest';

        console.log('Test B2C payload:', JSON.stringify(testPayload, null, 2));

        const { data } = await axios.post(url, testPayload, {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log('B2C test response:', data);

        return res.json({
            success: true,
            message: 'B2C configuration test completed',
            response: data,
            config: {
                initiator: config.b2c_initiator,
                shortcode: config.b2c_shortcode,
                sandbox: config.sandbox
            }
        });

    } catch (err) {
        console.error('B2C configuration test failed:', err.response?.data || err.message);
        return res.status(500).json({
            success: false,
            error: 'B2C configuration test failed',
            details: err.response?.data || err.message
        });
    }
};

/**
 * Test multiple B2C credentials to find the working one
 */
exports.testB2CCredentials = async (req, res) => {
    try {
        console.log('Testing multiple B2C credentials...');

        if (!config.b2c || !config.b2c.consumer_key || !config.b2c.consumer_secret) {
            return res.status(400).json({
                success: false,
                error: 'B2C credentials not configured. Please add B2C app credentials to runtimeconfig.json'
            });
        }

        const testCredentials = [
            // Common initiator names
            { initiator: 'testapi', securityCred: 'Safaricom123!!' },
            { initiator: 'testapi', securityCred: 'Safaricom@123' },
            { initiator: 'testapi', securityCred: 'Safaricom@2023' },
            { initiator: 'testapi', securityCred: 'Safaricom999!*!' },

            // Alternative initiator names
            { initiator: 'apitest', securityCred: 'Safaricom123!!' },
            { initiator: 'apitest', securityCred: 'Safaricom@123' },
            { initiator: 'apitest', securityCred: 'Safaricom@2023' },

            // More alternatives
            { initiator: 'api', securityCred: 'Safaricom123!!' },
            { initiator: 'api', securityCred: 'Safaricom@123' },
            { initiator: 'api', securityCred: 'Safaricom@2023' },

            // Default sandbox credentials
            { initiator: 'testapi', securityCred: 'Safaricom@2024' },
            { initiator: 'testapi', securityCred: 'Safaricom@2025' }
        ];

        const token = await getB2CDarajaToken();
        const url = 'https://sandbox.safaricom.co.ke/mpesa/b2c/v1/paymentrequest';

        const results = [];

        for (const cred of testCredentials) {
            try {
                console.log(`Testing credentials: ${cred.initiator} / ${cred.securityCred}`);

                const testPayload = {
                    InitiatorName: cred.initiator,
                    SecurityCredential: cred.securityCred,
                    CommandID: 'BusinessPayment',
                    Amount: 1,
                    PartyA: config.b2c.shortcode,
                    PartyB: '254708374149',
                    Remarks: 'B2C Credential Test',
                    QueueTimeOutURL: config.b2c.timeout_url,
                    ResultURL: config.b2c.result_url,
                    Occasion: 'TEST_CREDS'
                };

                const { data } = await axios.post(url, testPayload, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                const result = {
                    credentials: cred,
                    response: data,
                    success: data.ResponseCode === '0',
                    error: data.ResponseCode !== '0' ? data.ResponseDescription : null
                };

                results.push(result);
                console.log(`Result for ${cred.initiator}/${cred.securityCred}:`, result);

                // If this credential works, log it
                if (data.ResponseCode === '0') {
                    console.log(`✅ Working credentials found: ${cred.initiator} / ${cred.securityCred}`);
                }

            } catch (error) {
                console.error(`Error testing credentials ${cred.initiator}/${cred.securityCred}:`, error.response?.data || error.message);
                results.push({
                    credentials: cred,
                    error: error.response?.data || error.message,
                    success: false
                });
            }
        }

        return res.json({
            success: true,
            message: 'B2C credential testing completed',
            results: results,
            workingCredentials: results.find(r => r.success)?.credentials || null,
            currentConfig: {
                shortcode: config.b2c.shortcode,
                initiator_name: config.b2c.initiator_name
            }
        });

    } catch (err) {
        console.error('B2C credential testing failed:', err.response?.data || err.message);
        return res.status(500).json({
            success: false,
            error: 'B2C credential testing failed',
            details: err.response?.data || err.message
        });
    }
};
