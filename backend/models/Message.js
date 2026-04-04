/**
 * models/Message.js — Firebase-based Message model with in-memory fallback
 */

'use strict';

const { db, getMockStore, isFirebaseAvailable } = require('../config/firebase');

const COLLECTION = 'messages';

const Message = {
  /**
   * Save a new message.
   * @param {string} sessionId
   * @param {string} content
   * @param {'user'|'ai'} sender
   * @param {string} emotion
   * @returns {Promise<object>}
   */
  async create(sessionId, content, sender, emotion = 'neutral') {
    const now = new Date().toISOString();
    const messageDoc = {
      sessionId,
      content,
      sender,
      emotion,
      createdAt: now,
    };

    if (isFirebaseAvailable()) {
      const ref = await db.collection(COLLECTION).add(messageDoc);
      return { id: ref.id, ...messageDoc };
    }

    // In-memory fallback
    const store = getMockStore();
    const id = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const message = { id, ...messageDoc };

    // Group messages by sessionId
    if (!store.messages.has(sessionId)) {
      store.messages.set(sessionId, []);
    }
    store.messages.get(sessionId).push(message);
    return message;
  },

  /**
   * Get all messages for a session, sorted chronologically.
   * @param {string} sessionId
   * @returns {Promise<Array>}
   */
  async findBySessionId(sessionId) {
    if (isFirebaseAvailable()) {
      const snapshot = await db
        .collection(COLLECTION)
        .where('sessionId', '==', sessionId)
        .orderBy('createdAt', 'asc')
        .get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    // In-memory fallback
    const store = getMockStore();
    const messages = store.messages.get(sessionId) || [];
    return [...messages].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  },

  /**
   * Count messages in a session.
   * @param {string} sessionId
   * @returns {Promise<number>}
   */
  async countBySessionId(sessionId) {
    if (isFirebaseAvailable()) {
      const snapshot = await db
        .collection(COLLECTION)
        .where('sessionId', '==', sessionId)
        .count()
        .get();
      return snapshot.data().count;
    }

    // In-memory fallback
    const store = getMockStore();
    return (store.messages.get(sessionId) || []).length;
  },

  /**
   * Delete all messages for a session.
   * @param {string} sessionId
   * @returns {Promise<void>}
   */
  async deleteBySessionId(sessionId) {
    if (isFirebaseAvailable()) {
      const snapshot = await db
        .collection(COLLECTION)
        .where('sessionId', '==', sessionId)
        .get();
      const batch = db.batch();
      snapshot.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
      return;
    }

    // In-memory fallback
    const store = getMockStore();
    store.messages.delete(sessionId);
  },
};

module.exports = Message;
