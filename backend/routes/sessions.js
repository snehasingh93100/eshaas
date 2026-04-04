/**
 * routes/sessions.js
 */

'use strict';

const express = require('express');
const router = express.Router();

const sessionController = require('../controllers/sessionController');
const authenticate = require('../middleware/auth');

// All session routes require authentication

// GET /api/sessions/analytics — Must be before /:id to avoid conflict
router.get('/analytics', authenticate, sessionController.getAnalytics);

// POST /api/sessions — Create session
router.post('/', authenticate, sessionController.createSession);

// GET /api/sessions — Get all user sessions
router.get('/', authenticate, sessionController.getSessions);

// GET /api/sessions/:id — Get single session with messages
router.get('/:id', authenticate, sessionController.getSession);

// PUT /api/sessions/:id — Update session
router.put('/:id', authenticate, sessionController.updateSession);

// DELETE /api/sessions/:id — Delete session
router.delete('/:id', authenticate, sessionController.deleteSession);

module.exports = router;
