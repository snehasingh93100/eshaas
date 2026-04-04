'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../config/firebase');

// Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: '7d'
  });
};

// User Registration
const register = async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Validation
    if (!email || !password || !name) {
      return res.status(400).json({ 
        error: 'Email, password, and name are required',
        status: 400 
      });
    }

    // Check if user exists
    const usersSnapshot = await db.ref('users').orderByChild('email').equalTo(email).once('value');
    if (usersSnapshot.exists()) {
      return res.status(409).json({ 
        error: 'User already exists with this email',
        status: 409 
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = Date.now().toString();

    // Create user
    await db.ref(`users/${userId}`).set({
      userId,
      email,
      password: hashedPassword,
      name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    const token = generateToken(userId);

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        userId,
        email,
        name
      },
      status: 201
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      error: error.message || 'Registration failed',
      status: 500 
    });
  }
};

// User Login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Email and password are required',
        status: 400 
      });
    }

    // Find user by email
    const usersSnapshot = await db.ref('users').orderByChild('email').equalTo(email).once('value');
    
    if (!usersSnapshot.exists()) {
      return res.status(401).json({ 
        error: 'Invalid email or password',
        status: 401 
      });
    }

    // Get user data
    const userData = usersSnapshot.val();
    const userId = Object.keys(userData)[0];
    const user = userData[userId];

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        error: 'Invalid email or password',
        status: 401 
      });
    }

    const token = generateToken(userId);

    res.json({
      message: 'Login successful',
      token,
      user: {
        userId,
        email: user.email,
        name: user.name
      },
      status: 200
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      error: error.message || 'Login failed',
      status: 500 
    });
  }
};

// Get User Profile
const getUserProfile = async (req, res) => {
  try {
    const { userId } = req.user;

    const userSnapshot = await db.ref(`users/${userId}`).once('value');
    if (!userSnapshot.exists()) {
      return res.status(404).json({ 
        error: 'User not found',
        status: 404 
      });
    }

    const user = userSnapshot.val();
    
    res.json({
      user: {
        userId: user.userId,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt
      },
      status: 200
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to retrieve profile',
      status: 500 
    });
  }
};

// Update User Profile
const updateUserProfile = async (req, res) => {
  try {
    const { userId } = req.user;
    const { name, email } = req.body;

    const updates = {
      updatedAt: new Date().toISOString()
    };

    if (name) updates.name = name;
    if (email) updates.email = email;

    await db.ref(`users/${userId}`).update(updates);

    res.json({
      message: 'Profile updated successfully',
      status: 200
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to update profile',
      status: 500 
    });
  }
};

module.exports = {
  register,
  login,
  getUserProfile,
  updateUserProfile
};
