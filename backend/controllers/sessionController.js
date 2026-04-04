/**
 * controllers/sessionController.js — Session management and analytics
 */

'use strict';

const Session = require('../models/Session');
const Message = require('../models/Message');

/**
 * POST /api/sessions
 * Create a new session for the authenticated user.
 */
async function createSession(req, res) {
  try {
    const session = await Session.create(req.user.userId);
    return res.status(201).json({ success: true, session });
  } catch (err) {
    console.error('[Sessions] CreateSession error:', err);
    return res.status(500).json({ success: false, message: 'Could not create session.' });
  }
}

/**
 * GET /api/sessions
 * Get all sessions for the authenticated user.
 */
async function getSessions(req, res) {
  try {
    const sessions = await Session.findByUserId(req.user.userId);
    return res.status(200).json({ success: true, sessions });
  } catch (err) {
    console.error('[Sessions] GetSessions error:', err);
    return res.status(500).json({ success: false, message: 'Could not retrieve sessions.' });
  }
}

/**
 * GET /api/sessions/analytics
 * Aggregated emotion and usage analytics for the user.
 */
async function getAnalytics(req, res) {
  try {
    const sessions = await Session.findByUserId(req.user.userId);

    // Aggregate emotion distribution
    const emotionDistribution = {};
    let totalDuration = 0;
    let totalMessages = 0;

    sessions.forEach(session => {
      totalDuration += session.duration || 0;
      totalMessages += session.messageCount || 0;

      if (session.emotionCounts) {
        Object.entries(session.emotionCounts).forEach(([emotion, count]) => {
          emotionDistribution[emotion] = (emotionDistribution[emotion] || 0) + count;
        });
      } else if (session.topEmotion) {
        emotionDistribution[session.topEmotion] =
          (emotionDistribution[session.topEmotion] || 0) + (session.messageCount || 1);
      }
    });

    // Most common emotion
    const topEmotion = Object.entries(emotionDistribution)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'neutral';

    // Sessions per day (last 14 days)
    const sessionTimeline = buildTimeline(sessions, 14);

    return res.status(200).json({
      success: true,
      analytics: {
        totalSessions: sessions.length,
        totalMessages,
        totalDuration,
        averageDuration: sessions.length ? Math.round(totalDuration / sessions.length) : 0,
        emotionDistribution,
        topEmotion,
        sessionTimeline,
      },
      // Flatten analytics at top level for easy frontend access
      emotionDistribution,
      topEmotion,
    });
  } catch (err) {
    console.error('[Sessions] GetAnalytics error:', err);
    return res.status(500).json({ success: false, message: 'Could not retrieve analytics.' });
  }
}

/**
 * GET /api/sessions/:id
 * Get a single session with its messages.
 */
async function getSession(req, res) {
  try {
    const session = await Session.findById(req.params.id);
    if (!session || session.userId !== req.user.userId) {
      return res.status(404).json({ success: false, message: 'Session not found.' });
    }

    const messages = await Message.findBySessionId(req.params.id);
    return res.status(200).json({ success: true, session, messages });
  } catch (err) {
    console.error('[Sessions] GetSession error:', err);
    return res.status(500).json({ success: false, message: 'Could not retrieve session.' });
  }
}

/**
 * PUT /api/sessions/:id
 * Update session data (e.g., end session, add notes).
 */
async function updateSession(req, res) {
  try {
    const session = await Session.findById(req.params.id);
    if (!session || session.userId !== req.user.userId) {
      return res.status(404).json({ success: false, message: 'Session not found.' });
    }

    // If ending session, calculate duration
    const updates = { ...req.body };
    if (updates.status === 'ended' && !session.endTime) {
      updates.endTime = updates.endTime || new Date().toISOString();
      const start = new Date(session.startTime).getTime();
      const end = new Date(updates.endTime).getTime();
      updates.duration = Math.round((end - start) / 1000);
    }

    // Strip fields that shouldn't be updated directly
    delete updates.userId;
    delete updates.createdAt;

    const updated = await Session.update(req.params.id, updates);
    return res.status(200).json({ success: true, session: updated });
  } catch (err) {
    console.error('[Sessions] UpdateSession error:', err);
    return res.status(500).json({ success: false, message: 'Could not update session.' });
  }
}

/**
 * DELETE /api/sessions/:id
 * Delete a session and its messages.
 */
async function deleteSession(req, res) {
  try {
    const session = await Session.findById(req.params.id);
    if (!session || session.userId !== req.user.userId) {
      return res.status(404).json({ success: false, message: 'Session not found.' });
    }

    // Delete messages first
    await Message.deleteBySessionId(req.params.id);
    await Session.delete(req.params.id);

    return res.status(200).json({ success: true, message: 'Session deleted.' });
  } catch (err) {
    console.error('[Sessions] DeleteSession error:', err);
    return res.status(500).json({ success: false, message: 'Could not delete session.' });
  }
}

/**
 * Mark a session as ended and calculate duration.
 */
async function endSession(req, res) {
  try {
    const session = await Session.findById(req.params.id);
    if (!session || session.userId !== req.user.userId) {
      return res.status(404).json({ success: false, message: 'Session not found.' });
    }

    const endTime = new Date().toISOString();
    const start = new Date(session.startTime).getTime();
    const end = new Date(endTime).getTime();
    const duration = Math.round((end - start) / 1000);

    const updated = await Session.update(req.params.id, {
      status: 'ended',
      endTime,
      duration,
    });

    return res.status(200).json({ success: true, session: updated });
  } catch (err) {
    console.error('[Sessions] EndSession error:', err);
    return res.status(500).json({ success: false, message: 'Could not end session.' });
  }
}

// ===== HELPERS =====

function buildTimeline(sessions, days) {
  const now = new Date();
  const timeline = [];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const dayStart = new Date(d.setHours(0, 0, 0, 0)).getTime();
    const dayEnd = dayStart + 86400000;

    const count = sessions.filter(s => {
      const t = new Date(s.startTime || s.createdAt).getTime();
      return t >= dayStart && t < dayEnd;
    }).length;

    timeline.push({ label, count });
  }

  return timeline;
}

module.exports = {
  createSession,
  getSessions,
  getAnalytics,
  getSession,
  updateSession,
  deleteSession,
  endSession,
};
