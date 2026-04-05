const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const verifyToken = require('../middleware/auth');
const { sendMessage, getChatHistory } = require('../controllers/chatController');

const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Too many requests, please try again later.' }
});

// Send a message
router.post('/send', chatLimiter, verifyToken, sendMessage);

// Get chat history
router.get('/history/:sessionId', chatLimiter, verifyToken, getChatHistory);

module.exports = router;
