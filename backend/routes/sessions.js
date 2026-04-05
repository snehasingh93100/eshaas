const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const verifyToken = require('../middleware/auth');
const { createSession, endSession, getUserSessions } = require('../controllers/sessionController');

const sessionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { error: 'Too many requests, please try again later.' }
});

// Create a new session
router.post('/create', sessionLimiter, verifyToken, createSession);

// End a session
router.post('/end/:sessionId', sessionLimiter, verifyToken, endSession);

// Get all sessions for the logged-in user
router.get('/list', sessionLimiter, verifyToken, getUserSessions);

module.exports = router;
