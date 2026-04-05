# Eshaas – Emotional Intelligence AI Platform

An AI-powered emotional wellness chat platform with real-time emotion detection and session management.

---

## 🚀 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) v16 or higher
- A Firebase project (Realtime Database)
- A Hugging Face API key

### 1. Install dependencies

```bash
cd backend
npm install
```

### 2. Create your `.env` file

Inside the `backend` folder, create a file named `.env` (copy from `.env.example`):

```env
PORT=5000
NODE_ENV=development
JWT_SECRET=your_strong_secret_here

# Paste the entire Firebase service account JSON as a single line:
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}
FIREBASE_DATABASE_URL=https://your-project-default-rtdb.firebaseio.com

HUGGING_FACE_API_KEY=hf_your_key_here
FRONTEND_URL=http://localhost:3000
```

> **Note:** If you skip the Firebase credentials the server will still start but auth/chat/session endpoints will return `503 Database unavailable`.

### 3. Start the server

```bash
# From inside the backend folder:
node server.js

# Or with auto-reload:
npm run dev

# Or from the repo root:
npm start
```

You should see:
```
🌟 Eshaas Backend Server running on port 5000
Environment: development
```

### 4. Verify it's running

Open your browser or run:
```bash
curl http://localhost:5000/api/health
```

Expected response:
```json
{"status":"Server is running","timestamp":"..."}
```

---

## 📋 API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/health` | No | Health check |
| POST | `/api/auth/register` | No | Register new user |
| POST | `/api/auth/login` | No | Login |
| GET | `/api/auth/profile` | JWT | Get profile |
| PUT | `/api/auth/profile` | JWT | Update profile |
| POST | `/api/chat/send` | JWT | Send message |
| GET | `/api/chat/history/:sessionId` | JWT | Get chat history |
| POST | `/api/sessions/create` | JWT | Create session |
| POST | `/api/sessions/end/:sessionId` | JWT | End session |
| GET | `/api/sessions/list` | JWT | List sessions |

---

## 🔧 Troubleshooting

**`Cannot find module 'express'` or similar** → Run `npm install` inside the `backend` folder.

**`nodemon is not recognized`** → Use `node server.js` instead of `npm run dev`, or run `npm install` first to install nodemon locally.

**`Error: Cannot find module './routes/chat'`** → Make sure you're using the latest code from this repository. Pull the latest changes with `git pull`.

**Firebase errors** → Make sure `FIREBASE_SERVICE_ACCOUNT` in your `.env` is a single-line JSON string. See `.env.example` for the format.
