/**
 * models/User.js — Firebase-based User model with in-memory fallback
 */

'use strict';

const bcrypt = require('bcryptjs');
const { db, getMockStore, isFirebaseAvailable } = require('../config/firebase');

const COLLECTION = 'users';
const SALT_ROUNDS = 10;

const User = {
  /**
   * Create a new user.
   * @param {{ name: string, email: string, password: string }} userData
   * @returns {Promise<object>} Created user (without password)
   */
  async create(userData) {
    const { name, email, password } = userData;
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const now = new Date().toISOString();

    const userDoc = {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      createdAt: now,
      updatedAt: now,
    };

    if (isFirebaseAvailable()) {
      const ref = await db.collection(COLLECTION).add(userDoc);
      const created = { id: ref.id, ...userDoc };
      delete created.password;
      return created;
    }

    // In-memory fallback
    const store = getMockStore();
    const id = `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const user = { id, ...userDoc };
    store.users.set(id, user);
    const safe = { ...user };
    delete safe.password;
    return safe;
  },

  /**
   * Find a user by email.
   * @param {string} email
   * @returns {Promise<object|null>} User doc (includes password hash)
   */
  async findByEmail(email) {
    const normalEmail = email.toLowerCase().trim();

    if (isFirebaseAvailable()) {
      const snapshot = await db
        .collection(COLLECTION)
        .where('email', '==', normalEmail)
        .limit(1)
        .get();
      if (snapshot.empty) return null;
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() };
    }

    // In-memory fallback
    const store = getMockStore();
    for (const user of store.users.values()) {
      if (user.email === normalEmail) return user;
    }
    return null;
  },

  /**
   * Find a user by ID.
   * @param {string} userId
   * @returns {Promise<object|null>} User doc (without password)
   */
  async findById(userId) {
    if (isFirebaseAvailable()) {
      const doc = await db.collection(COLLECTION).doc(userId).get();
      if (!doc.exists) return null;
      const data = { id: doc.id, ...doc.data() };
      delete data.password;
      return data;
    }

    // In-memory fallback
    const store = getMockStore();
    const user = store.users.get(userId);
    if (!user) return null;
    const safe = { ...user };
    delete safe.password;
    return safe;
  },

  /**
   * Update user fields.
   * @param {string} userId
   * @param {object} data
   * @returns {Promise<object>}
   */
  async update(userId, data) {
    const updates = { ...data, updatedAt: new Date().toISOString() };

    if (isFirebaseAvailable()) {
      await db.collection(COLLECTION).doc(userId).update(updates);
      return User.findById(userId);
    }

    // In-memory fallback
    const store = getMockStore();
    const user = store.users.get(userId);
    if (!user) throw new Error('User not found');
    Object.assign(user, updates);
    const safe = { ...user };
    delete safe.password;
    return safe;
  },

  /**
   * Verify a plain password against a hash.
   * @param {string} plain
   * @param {string} hash
   * @returns {Promise<boolean>}
   */
  async verifyPassword(plain, hash) {
    return bcrypt.compare(plain, hash);
  },
};

module.exports = User;
