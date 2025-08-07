const express = require('express');
const axios = require('axios');
const cors = require('cors');
const serverless = require('serverless-http');

const app = express();
app.use(cors());
app.use(express.json());

const AMADEUS_API = 'https://test.api.amadeus.com';

let accessToken = '';
let tokenExpiresAt = 0;

const getAccessToken = async () => {
  try {
    const res = await axios.post(`${AMADEUS_API}/v1/security/oauth2/token`, new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: process.env.AMADEUS_API_KEY,
      client_secret: process.env.AMADEUS_API_SECRET
    }));

    accessToken = res.data.access_token;
    tokenExpiresAt = Date.now() + (res.data.expires_in - 60) * 1000; // Refresh 60 seconds before expiration
    console.log('✅ Access token obtained');
  } catch (err) {
    console.error('❌ Failed to get token:', err.response?.data || err.message);
  }
};

const ensureTokenValid = async () => {
  if (!accessToken || Date.now() >= tokenExpiresAt) {
    await getAccessToken();
  }
};

app.post('/search', async (req, res) => {
  const { origin, destination, date, passengers } = req.body;

  if (!origin || !destination || !date || !passengers) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    await ensureTokenValid();

    const response = await axios.get(`${AMADEUS_API}/v2/shopping/flight-offers`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: {
        originLocationCode: origin,
        destinationLocationCode: destination,
        departureDate: date,
        adults: passengers,
        max: 10
      }
    });

    res.json(response.data);
  } catch (err) {
    console.error('❌ Amadeus API error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to fetch flight offers' });
  }
});

// 🔥 This is required for Vercel
module.exports = serverless(app);
