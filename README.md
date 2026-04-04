# 🧠 Eshaas — Your Emotional Intelligence AI Companion

![Eshaas Banner](https://img.shields.io/badge/Eshaas-Emotional%20Intelligence%20AI-7C3AED?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTIgMkM2LjQ4IDIgMiA2LjQ4IDIgMTJzNC40OCAxMCAxMCAxMCAxMC00LjQ4IDEwLTEwUzE3LjUyIDIgMTIgMnoiIGZpbGw9IndoaXRlIi8+PC9zdmc+)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org)

> *"Your emotions are valid. Eshaas is here to listen."*

Eshaas is a full-stack web application that combines AI-powered emotional intelligence with a beautiful, compassionate interface. Share your thoughts through text or voice, receive empathetic responses, and track your emotional wellness journey over time.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 💬 **Text Chat** | Real-time AI conversations with empathetic responses |
| 🎙️ **Voice Input** | Web Speech API for hands-free conversation |
| 🔊 **Text-to-Speech** | AI reads responses aloud using SpeechSynthesis |
| 🎭 **Emotion Detection** | Detects Joy, Sadness, Anger, Fear, Surprise, and Neutral |
| 📊 **Session Dashboard** | Charts, history, and personal emotion analytics |
| 🔐 **Secure Auth** | JWT authentication with bcrypt password hashing |
| 🔥 **Firebase Backend** | Scalable Firestore database with in-memory fallback |
| 📱 **Responsive Design** | Mobile-first, works on all screen sizes |

---

## 🏗️ Project Structure

```
eshaas/
├── frontend/
│   ├── index.html          # Login / Sign-up page
│   ├── home.html           # Homepage with features & CTAs
│   ├── chat.html           # AI chat interface
│   ├── dashboard.html      # Session analytics dashboard
│   ├── css/
│   │   ├── style.css       # Global styles & CSS variables
│   │   ├── auth.css        # Auth page styles
│   │   ├── home.css        # Homepage styles
│   │   ├── chat.css        # Chat interface styles
│   │   └── dashboard.css   # Dashboard styles
│   └── js/
│       ├── utils.js        # Shared helper functions
│       ├── api.js          # Backend API client
│       ├── auth.js         # Login/signup logic
│       ├── chat.js         # Chat functionality
│       ├── voice.js        # Voice I/O (Web Speech API)
│       └── dashboard.js    # Analytics & session tracking
├── backend/
│   ├── server.js           # Express server entry point
│   ├── routes/
│   │   ├── auth.js         # Auth routes
│   │   ├── chat.js         # Chat routes
│   │   └── sessions.js     # Session routes
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── chatController.js
│   │   └── sessionController.js
│   ├── middleware/
│   │   └── auth.js         # JWT verification middleware
│   ├── models/
│   │   ├── User.js         # User model (Firebase + fallback)
│   │   ├── Session.js      # Session model
│   │   └── Message.js      # Message model
│   ├── config/
│   │   └── firebase.js     # Firebase Admin SDK init
│   ├── .env.example        # Environment variable template
│   └── package.json
├── .gitignore
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- (Optional) Firebase project with Firestore enabled
- (Optional) Hugging Face API key for advanced emotion detection

### 1. Clone the repository

```bash
git clone https://github.com/your-org/eshaas.git
cd eshaas
```

### 2. Set up the backend

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env` with your configuration:

```env
PORT=5000
JWT_SECRET=your_strong_secret_key_here

# Optional: Firebase (app works without it using in-memory storage)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n..."
FIREBASE_CLIENT_EMAIL=your@service-account.iam.gserviceaccount.com
FIREBASE_DATABASE_URL=https://your-project.firebaseio.com

# Optional: Hugging Face (falls back to keyword detection without it)
HUGGING_FACE_API_KEY=hf_your_api_key_here
```

### 3. Start the backend

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

The server starts at `http://localhost:5000`.

### 4. Open the frontend

Simply open `frontend/index.html` in your browser, or serve it with any static file server:

```bash
# Using Python
cd frontend && python3 -m http.server 3000

# Using Node.js npx
npx serve frontend

# Using VS Code Live Server extension
# Right-click index.html → "Open with Live Server"
```

---

## 🔌 API Reference

### Auth

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/auth/register` | ❌ | Register a new user |
| `POST` | `/api/auth/login` | ❌ | Login and get JWT |
| `GET` | `/api/auth/profile` | ✅ | Get user profile |

### Chat

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/chat/message` | ✅ | Send message, get AI response |
| `GET` | `/api/chat/messages/:sessionId` | ✅ | Get session messages |

### Sessions

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/sessions` | ✅ | Create new session |
| `GET` | `/api/sessions` | ✅ | Get all user sessions |
| `GET` | `/api/sessions/analytics` | ✅ | Get emotion analytics |
| `GET` | `/api/sessions/:id` | ✅ | Get session + messages |
| `PUT` | `/api/sessions/:id` | ✅ | Update session |
| `DELETE` | `/api/sessions/:id` | ✅ | Delete session |

### Health Check

```
GET /health → { status: "healthy", timestamp: "..." }
```

---

## 🎭 Emotion Detection

Eshaas uses a two-tier emotion detection system:

1. **Hugging Face API** (when configured): Uses `j-hartmann/emotion-english-distilroberta-base` model for accurate detection of 6+ emotions.
2. **Keyword Fallback**: Built-in keyword matching for offline/demo use.

Detected emotions:

| Emotion | Emoji | Trigger Keywords |
|---------|-------|------------------|
| Joy | 😊 | happy, excited, grateful, love... |
| Sadness | 😢 | sad, lonely, heartbroken, grief... |
| Anger | 😠 | angry, frustrated, furious, hate... |
| Fear | 😨 | scared, anxious, worried, panic... |
| Surprise | 😮 | shocked, unexpected, unbelievable... |
| Neutral | 😐 | (default fallback) |

---

## 🛡️ Security Features

- **Helmet.js** — HTTP security headers
- **Rate Limiting** — Auth (20/15min), Chat (30/min), Global (200/15min)
- **JWT** — Signed tokens with 7-day expiry
- **bcrypt** — Password hashing with 10 salt rounds
- **Input Validation** — express-validator on all routes
- **CORS** — Configurable allowed origins

---

## 🎨 Design System

### Colors

| Variable | Value | Usage |
|----------|-------|-------|
| `--color-primary` | `#7C3AED` | Primary purple |
| `--color-secondary` | `#3B82F6` | Accent blue |
| `--color-accent` | `#F97316` | Warm orange |
| `--color-success` | `#10B981` | Success green |

### Typography

- Font: **Inter** (Google Fonts)
- Scale: 0.75rem → 3rem

---

## 📝 License

MIT © 2024 Eshaas — Made with 💜 for emotional wellness.

---

*"The greatest thing about being heard is that it makes you feel less alone."*
