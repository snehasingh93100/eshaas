// sessionController.js

const { v4: uuidv4 } = require('uuid');
const { db } = require('../config/firebase');

/**
 * Create a new session for the user.
 */
const createSession = async (req, res) => {
  try {
    const { userId } = req.user;

    if (!db) {
      return res.status(503).json({ error: 'Database unavailable', status: 503 });
    }

    const sessionId = uuidv4();
    const session = {
      sessionId,
      userId,
      status: 'active',
      messageCount: 0,
      lastEmotion: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await db.ref(`sessions/${sessionId}`).set(session);

    res.status(201).json({
      message: 'Session created successfully',
      session,
      status: 201
    });
  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({ error: error.message || 'Failed to create session', status: 500 });
  }
};

/**
 * End the current session for the user.
 */
const endSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { userId } = req.user;

    if (!db) {
      return res.status(503).json({ error: 'Database unavailable', status: 503 });
    }

    const sessionSnapshot = await db.ref(`sessions/${sessionId}`).once('value');
    if (!sessionSnapshot.exists()) {
      return res.status(404).json({ error: 'Session not found', status: 404 });
    }

    const session = sessionSnapshot.val();
    if (session.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized', status: 403 });
    }

    await db.ref(`sessions/${sessionId}`).update({
      status: 'ended',
      endedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    res.json({
      message: 'Session ended successfully',
      sessionId,
      status: 200
    });
  } catch (error) {
    console.error('End session error:', error);
    res.status(500).json({ error: error.message || 'Failed to end session', status: 500 });
  }
};

/**
 * Get all sessions for a user.
 */
const getUserSessions = async (req, res) => {
  try {
    const { userId } = req.user;

    if (!db) {
      return res.status(503).json({ error: 'Database unavailable', status: 503 });
    }

    const sessionsSnapshot = await db.ref('sessions').orderByChild('userId').equalTo(userId).once('value');
    const sessions = sessionsSnapshot.exists() ? Object.values(sessionsSnapshot.val()) : [];

    sessions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      sessions,
      total: sessions.length,
      status: 200
    });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ error: error.message || 'Failed to retrieve sessions', status: 500 });
  }
};

/**
 * Get analytics data for sessions.
 */
const getAnalytics = async (req, res) => {
  try {
    const { userId } = req.user;

    if (!db) {
      return res.status(503).json({ error: 'Database unavailable', status: 503 });
    }

    const sessionsSnapshot = await db.ref('sessions').orderByChild('userId').equalTo(userId).once('value');
    const sessions = sessionsSnapshot.exists() ? Object.values(sessionsSnapshot.val()) : [];

    const analytics = {
      totalSessions: sessions.length,
      activeSessions: sessions.filter(s => s.status === 'active').length,
      totalMessages: sessions.reduce((sum, s) => sum + (s.messageCount || 0), 0),
      emotionBreakdown: sessions.reduce((acc, s) => {
        if (s.lastEmotion) {
          acc[s.lastEmotion] = (acc[s.lastEmotion] || 0) + 1;
        }
        return acc;
      }, {})
    };

    res.json({ analytics, status: 200 });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ error: error.message || 'Failed to retrieve analytics', status: 500 });
  }
};

/**
 * Export session data for analysis.
 */
const exportSessionData = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { userId } = req.user;

    if (!db) {
      return res.status(503).json({ error: 'Database unavailable', status: 503 });
    }

    const sessionSnapshot = await db.ref(`sessions/${sessionId}`).once('value');
    if (!sessionSnapshot.exists()) {
      return res.status(404).json({ error: 'Session not found', status: 404 });
    }

    const session = sessionSnapshot.val();
    if (session.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized', status: 403 });
    }

    const messagesSnapshot = await db.ref(`messages/${sessionId}`).once('value');
    const messages = messagesSnapshot.exists() ? Object.values(messagesSnapshot.val()) : [];

    res.json({
      session,
      messages: messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)),
      exportedAt: new Date().toISOString(),
      status: 200
    });
  } catch (error) {
    console.error('Export session data error:', error);
    res.status(500).json({ error: error.message || 'Failed to export session data', status: 500 });
  }
};

module.exports = { createSession, endSession, getUserSessions, getAnalytics, exportSessionData };