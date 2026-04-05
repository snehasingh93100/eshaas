const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const verifyToken = require('../middleware/auth');
const { register, login, getUserProfile, updateUserProfile } = require('../controllers/authController');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many requests, please try again later.' }
});

// Register new user
router.post('/register', authLimiter, register);

// Login user
router.post('/login', authLimiter, login);

// Get user profile (protected)
router.get('/profile', verifyToken, getUserProfile);

// Update user profile (protected)
router.put('/profile', verifyToken, updateUserProfile);

module.exports = router;