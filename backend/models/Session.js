/**
 * models/Session.js — Firebase-based Session model with in-memory fallback
 */

'use strict';

const { db, getMockStore, isFirebaseAvailable } = require('../config/firebase');

const COLLECTION = 'sessions';

const Session = {
  /**
   * Create a new chat session for a user.
   * @param {string} userId
   * @returns {Promise<object>}
   */
  async create(userId) {
    const now = new Date().toISOString();
    const sessionDoc = {
      userId,
      status: 'active',
      startTime: now,
      endTime: null,
      duration: 0,
      messageCount: 0,
      topEmotion: 'neutral',
      emotionCounts: {},
      createdAt: now,
      updatedAt: now,
    };

    if (isFirebaseAvailable()) {
      const ref = await db.collection(COLLECTION).add(sessionDoc);
      return { id: ref.id, ...sessionDoc };
    }

    // In-memory fallback
    const store = getMockStore();
    const id = `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const session = { id, ...sessionDoc };
    store.sessions.set(id, session);
    return session;
  },

  /**
   * Get all sessions for a user, sorted by createdAt descending.
   * @param {string} userId
   * @returns {Promise<Array>}
   */
  async findByUserId(userId) {
    if (isFirebaseAvailable()) {
      const snapshot = await db
        .collection(COLLECTION)
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    // In-memory fallback
    const store = getMockStore();
    const sessions = [];
    for (const session of store.sessions.values()) {
      if (session.userId === userId) sessions.push(session);
    }
    return sessions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  /**
   * Find a session by ID.
   * @param {string} sessionId
   * @returns {Promise<object|null>}
   */
  async findById(sessionId) {
    if (isFirebaseAvailable()) {
      const doc = await db.collection(COLLECTION).doc(sessionId).get();
      if (!doc.exists) return null;
      return { id: doc.id, ...doc.data() };
    }

    // In-memory fallback
    const store = getMockStore();
    return store.sessions.get(sessionId) || null;
  },

  /**
   * Update session fields.
   * @param {string} sessionId
   * @param {object} data
   * @returns {Promise<object>}
   */
  async update(sessionId, data) {
    const updates = { ...data, updatedAt: new Date().toISOString() };

    if (isFirebaseAvailable()) {
      await db.collection(COLLECTION).doc(sessionId).update(updates);
      return Session.findById(sessionId);
    }

    // In-memory fallback
    const store = getMockStore();
    const session = store.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');
    Object.assign(session, updates);
    return session;
  },

  /**
   * Delete a session by ID.
   * @param {string} sessionId
   * @returns {Promise<void>}
   */
  async delete(sessionId) {
    if (isFirebaseAvailable()) {
      await db.collection(COLLECTION).doc(sessionId).delete();
      return;
    }

    // In-memory fallback
    const store = getMockStore();
    store.sessions.delete(sessionId);
  },

  /**
   * Update emotion counts and top emotion after a new message.
   * @param {string} sessionId
   * @param {string} emotion
   * @returns {Promise<object>}
   */
  async updateEmotion(sessionId, emotion) {
    const session = await Session.findById(sessionId);
    if (!session) throw new Error('Session not found');

    const counts = { ...(session.emotionCounts || {}), [emotion]: (session.emotionCounts?.[emotion] || 0) + 1 };
    const topEmotion = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];

    return Session.update(sessionId, {
      emotionCounts: counts,
      topEmotion,
      messageCount: (session.messageCount || 0) + 1,
    });
  },
};

module.exports = Session;
