/**
 * firebase.js — Firebase Admin SDK initialization
 */

'use strict';

const admin = require('firebase-admin');

let db = null;
let isInitialized = false;

function initFirebase() {
  if (isInitialized) return db;

  try {
    // Build service account from environment variables
    const serviceAccount = {
      type: process.env.FIREBASE_TYPE || 'service_account',
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY
        ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        : undefined,
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: process.env.FIREBASE_AUTH_URI || 'https://accounts.google.com/o/oauth2/auth',
      token_uri: process.env.FIREBASE_TOKEN_URI || 'https://oauth2.googleapis.com/token',
    };

    // Validate required fields
    const required = ['project_id', 'private_key', 'client_email'];
    const missing = required.filter(k => !serviceAccount[k]);
    if (missing.length) {
      console.warn(`[Firebase] Missing config fields: ${missing.join(', ')}. Running in mock mode.`);
      return null;
    }

    // Prevent re-initialization
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: process.env.FIREBASE_DATABASE_URL,
      });
    }

    db = admin.firestore();
    isInitialized = true;
    console.log('[Firebase] Firestore connected successfully.');
    return db;
  } catch (err) {
    console.error('[Firebase] Initialization failed:', err.message);
    console.warn('[Firebase] Running in mock/in-memory mode.');
    return null;
  }
}

// ===== IN-MEMORY FALLBACK =====
// When Firebase is not configured, use an in-memory store for development.

const mockStore = {
  users: new Map(),
  sessions: new Map(),
  messages: new Map(),
};

function getMockStore() {
  return mockStore;
}

// Initialize on module load
const firebaseDb = initFirebase();

module.exports = {
  db: firebaseDb,
  admin,
  mockStore,
  getMockStore,
  isFirebaseAvailable: () => !!firebaseDb,
};
