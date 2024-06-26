
import express from 'express';
import { kv } from "@vercel/kv";

await kv.set("user_1_session", "session_token_value");

const session = await kv.get("user_1_session");



const { RateLimiterRedis } = require('rate-limiter-flexible');

const app = express();
app.use(express.json());

// Initialize Redis client
const redis = new Redis({
  url: process.env.VERCEL_KV_URL,
  token: process.env.VERCEL_KV_TOKEN,
});

// Configure rate limiter
const rateLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'ratelimit',
  points: 100, // Number of requests
  duration: 60, // Per 60 seconds
});

// Middleware for rate limiting
const rateLimiterMiddleware = async (req, res, next) => {
  try {
    await rateLimiter.consume(req.ip);
    next();
  } catch (error) {
    res.status(429).json({ error: 'Too Many Requests' });
  }
};

// Apply rate limiting to all routes
app.use(rateLimiterMiddleware);

// Endpoint to handle checkbox interactions
app.post('/check', async (req, res) => {
  const { checkboxId } = req.body;

  if (!checkboxId) {
    return res.status(400).json({ error: 'Missing checkboxId' });
  }

  try {
    // Here you would implement your logic to handle the checkbox interaction
    // For demonstration, we'll just acknowledge the request
    res.json({ message: `Checkbox ${checkboxId} checked successfully` });
  } catch (error) {
    console.error('Error handling checkbox:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});