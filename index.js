const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const AMADEUS_API = 'https://test.api.amadeus.com';

let accessToken = '';
let tokenExpiry = 0; // Timestamp in ms when token expires

// === Get a new token from Amadeus ===
async function getAccessToken() {
  console.log('🔑 Fetching new Amadeus access token...');
  const res = await axios.post(
    `${AMADEUS_API}/v1/security/oauth2/token`,
    new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: process.env.AMADEUS_API_KEY,
      client_secret: process.env.AMADEUS_API_SECRET
    })
  );
  accessToken = res.data.access_token;
  tokenExpiry = Date.now() + (res.data.expires_in - 60) * 1000; // minus 60s safety margin
  console.log('✅ New token acquired, expires in', res.data.expires_in, 'seconds');
}

// === Ensure token is valid before using it ===
async function ensureAccessToken() {
  if (!accessToken || Date.now() >= tokenExpiry) {
    await getAccessToken();
  }
}

// === Flight search route ===
app.post('/search', async (req, res) => {
  const { origin, destination, date, passengers } = req.body;

  if (!origin || !destination || !date || !passengers) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    await ensureAccessToken();

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
    console.error('❌ Error in /search:', err.response?.data || err.message);
    res.status(err.response?.status || 500).json({
      error: err.response?.data || 'Failed to fetch flight offers'
    });
  }
});

// === Health check route for Render ===
app.get('/_health', (req, res) => {
  res.status(200).send('ok');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server started on port ${PORT}`);
});
