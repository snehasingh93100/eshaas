/**
 * server.js — Eshaas Express Backend
 */

'use strict';

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');
const sessionRoutes = require('./routes/sessions');

const app = express();
const PORT = process.env.PORT || 5000;

// ===== SECURITY MIDDLEWARE =====

app.use(helmet({
  crossOriginEmbedderPolicy: false,
  // CSP is configured for API-only responses (no HTML served by this server)
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'none'"],
    },
  },
}));

// ===== CORS =====

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5000',
  'http://127.0.0.1:5500',
  'http://localhost:5500',
  'null', // For file:// origin during development
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('CORS policy violation'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// ===== BODY PARSING =====

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ===== RATE LIMITING =====

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP. Please try again in 15 minutes.',
  },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again later.',
  },
});

const chatLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Message rate limit exceeded. Please slow down.',
  },
});

app.use(globalLimiter);

// ===== REQUEST LOGGING (development) =====

if (process.env.NODE_ENV !== 'production') {
  app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
}

// ===== HEALTH CHECK =====

app.get('/health', (_req, res) => {
  res.status(200).json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  });
});

// ===== API ROUTES =====

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/chat', chatLimiter, chatRoutes);
app.use('/api/sessions', sessionRoutes);

// ===== 404 HANDLER =====

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found.`,
  });
});

// ===== GLOBAL ERROR HANDLER =====

app.use((err, req, res, _next) => {
  console.error('[Server] Unhandled error:', err);

  // CORS error
  if (err.message === 'CORS policy violation') {
    return res.status(403).json({ success: false, message: 'CORS not allowed.' });
  }

  // JSON parse error
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'Invalid JSON in request body.' });
  }

  const status = err.statusCode || err.status || 500;
  const message = process.env.NODE_ENV === 'production'
    ? 'An internal server error occurred.'
    : err.message || 'Internal server error.';

  return res.status(status).json({ success: false, message });
});

// ===== START SERVER =====

app.listen(PORT, () => {
  console.log('\n╔═══════════════════════════════════════╗');
  console.log('║         Eshaas Backend Server          ║');
  console.log('╚═══════════════════════════════════════╝');
  console.log(`\n✅  Server running at http://localhost:${PORT}`);
  console.log(`🔑  Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`❤️   Health check: http://localhost:${PORT}/health`);
  console.log('\n  Routes:');
  console.log(`    POST  /api/auth/register`);
  console.log(`    POST  /api/auth/login`);
  console.log(`    GET   /api/auth/profile`);
  console.log(`    POST  /api/chat/message`);
  console.log(`    GET   /api/chat/messages/:sessionId`);
  console.log(`    POST  /api/sessions`);
  console.log(`    GET   /api/sessions`);
  console.log(`    GET   /api/sessions/analytics`);
  console.log(`    GET   /api/sessions/:id`);
  console.log(`    PUT   /api/sessions/:id`);
  console.log(`    DELETE /api/sessions/:id`);
  console.log('');
});

module.exports = app;
