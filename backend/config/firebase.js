// backend/config/firebase.js

const admin = require('firebase-admin');
require('dotenv').config();

let db = null;

try {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    console.warn('Warning: FIREBASE_SERVICE_ACCOUNT env variable is not set. Firebase features will be unavailable.');
  } else {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL
    });

    db = admin.database();
  }
} catch (error) {
  console.error('Firebase initialization error:', error.message);
}

module.exports = { db };