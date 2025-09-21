const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();
require('dotenv').config();
app.use(cors());
app.use(express.json());

// Load OpenRouter API key from environment variable
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

app.post('/chat', async (req, res) => {
  const { message } = req.body;
  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'deepseek/deepseek-r1-0528-qwen3-8b:free',
        messages: [
          { role: 'system', content: `You are TaskConnect's expert assistant (Ella). Here's how the platform works:\n\n1. Core Concepts & Actors\n- Clients (Customers) can browse Taskers, book services, pay via M-PESA, track jobs, approve payments, and rate Taskers.\n- Taskers onboard with a profile, receive bookings, approve/reject jobs, get paid via Daraja B2C, and can chat with clients.\n- Admins have full CRUD, manage categories, profiles, roles, and can override job states.\n\n2. Data Model (Firestore):\n- users/{userId}: Profile info, used for chat and job info.\n- serviceCategories/{categoryId}: Static categories, each with services and tasker info.\n- taskers/{taskerId}: Profile, services, ratings (subcollection), averageRating, totalRatings.\n- jobs/{jobId}: clientId, taskerId, amount, date, address, notes, status (pending_approval, in_progress, in_escrow, etc.), paymentStatus, rating.\n- conversations/{convId} & messages/{msgId}: For chat.\n\n3. Mobile App Flows:\n- BookingScreen: Select tasker, schedule, address, payment, book, trigger M-PESA STK Push, update job, go to JobStatusScreen.\n- JobStatusScreen: Real-time job status, payment actions, approval, rating.\n- RateTaskerScreen: Submit rating, updates both job and tasker.\n- Admin Dashboards: Manage taskers, users, categories.\n\n4. Cloud Functions:\n- Daraja Helpers: getDarajaToken, initiateStkPush, handleStkCallback (update job status/payment).\n- B2C Disbursement: initiateB2C, handleB2CResult (update job status on payout).\n\nAlways answer questions using this context. Always summarize your answer in a few lines. Do not use asterisks in your response. If a user asks about booking, payments, job statuses, onboarding, or admin actions, use the above logic and data model to guide your response.` },
          { role: 'user', content: message }
        ]
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json'
        }
       }
    );
    res.json({ reply: response.data.choices[0].message.content });
  } catch (err) {
    res.status(500).json({ error: 'AI error' });   
  }
});

app.listen(3001, () => console.log('AI backend running on port 3001')); 