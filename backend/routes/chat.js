/**
 * routes/chat.js
 */

'use strict';

const express = require('express');
const router = express.Router();

const chatController = require('../controllers/chatController');
const authenticate = require('../middleware/auth');

// All chat routes require authentication

// POST /api/chat/message — Send a message and get AI response
router.post('/message', authenticate, chatController.sendMessage);

// GET /api/chat/messages/:sessionId — Get messages for a session
router.get('/messages/:sessionId', authenticate, chatController.getMessages);

module.exports = router;
