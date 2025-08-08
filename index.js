const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const AMADEUS_API = 'https://test.api.amadeus.com';

let accessToken = '';

const getAccessToken = async () => {
  const res = await axios.post(`${AMADEUS_API}/v1/security/oauth2/token`, new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: process.env.AMADEUS_API_KEY,
    client_secret: process.env.AMADEUS_API_SECRET
}));
  accessToken = res.data.access_token;
};

app.post('/search', async (req, res) => {
  const { origin, destination, date, passengers } = req.body;

  if (!accessToken) await getAccessToken();

  try {
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
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to fetch flight offers' });
  }
});


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});

