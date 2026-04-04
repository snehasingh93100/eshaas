/**
 * controllers/chatController.js — Chat and emotion detection logic
 */

'use strict';

const { randomInt } = require('crypto');
const axios = require('axios');
const Message = require('../models/Message');

// ===== EMOTION RESPONSE TEMPLATES =====

const EMOTION_RESPONSES = {
  joy: [
    "I can feel your joy radiating through your words! 😊 That's wonderful. What's been bringing you this happiness?",
    "It's so lovely to sense your happiness right now! 🌟 Tell me more about what's making you feel this way.",
    "Your positive energy is contagious! 🎉 I'm so glad you're experiencing joy. What's been going well for you?",
  ],
  sadness: [
    "I can hear the sadness in your words, and I want you to know that it's completely okay to feel this way. 💙 I'm here with you. Would you like to talk more about what's weighing on your heart?",
    "I'm so sorry you're feeling sad right now. 🫂 Your feelings are valid and important. Please know you're not alone in this.",
    "It sounds like you're going through something really difficult. 💜 I'm here to listen without judgment. Can you tell me more about what's happening?",
  ],
  anger: [
    "I can sense a lot of frustration and anger in what you've shared, and that's completely valid. 🔥 What's happened to make you feel this way? I want to understand.",
    "Your anger makes total sense given what you've described. Sometimes things are genuinely unfair. 💪 Let's talk through this — what's been bothering you most?",
    "I hear you — and your anger is a powerful signal that something important to you has been affected. 🎯 Let's explore that together.",
  ],
  fear: [
    "I can hear the fear and anxiety in your words. 💜 You're incredibly brave for sharing this. What feels most scary or uncertain to you right now?",
    "Feeling afraid can be overwhelming, and I want you to know you're not facing this alone. 🌙 Take a deep breath — I'm right here with you.",
    "Fear is one of the most powerful emotions we experience. 🤝 Thank you for trusting me with this. Can you tell me more about what's making you feel afraid?",
  ],
  surprise: [
    "Wow, it sounds like something really unexpected happened! 😮 How are you processing this surprise? Are you feeling more excited or unsettled by it?",
    "Life has a way of throwing curveballs when we least expect it! ✨ I'd love to hear more about what surprised you.",
    "That sounds quite unexpected! Sometimes surprises can shake us up, for better or worse. 🌀 How are you feeling about it?",
  ],
  neutral: [
    "Thank you for sharing that with me. 🤍 How are you feeling about the situation overall?",
    "I appreciate you opening up. Let's explore this together — what's been on your mind lately?",
    "I'm here to listen and support you. 💫 Can you tell me more about what's going on?",
  ],
};

// ===== HUGGING FACE EMOTION DETECTION =====

const EMOTION_LABELS = {
  'joy': 'joy',
  'sadness': 'sadness',
  'anger': 'anger',
  'fear': 'fear',
  'surprise': 'surprise',
  'disgust': 'anger',
  'love': 'joy',
  'neutral': 'neutral',
  'admiration': 'joy',
  'amusement': 'joy',
  'excitement': 'joy',
  'gratitude': 'joy',
  'pride': 'joy',
  'relief': 'joy',
  'caring': 'joy',
  'curiosity': 'neutral',
  'confusion': 'neutral',
  'realization': 'neutral',
  'annoyance': 'anger',
  'disapproval': 'anger',
  'embarrassment': 'fear',
  'nervousness': 'fear',
  'grief': 'sadness',
  'remorse': 'sadness',
  'disappointment': 'sadness',
  'desire': 'neutral',
  'optimism': 'joy',
};

/**
 * Detect emotion from text using Hugging Face API.
 * Falls back to keyword-based detection on failure.
 * @param {string} text
 * @returns {Promise<string>} emotion label
 */
async function detectEmotion(text) {
  const apiKey = process.env.HUGGING_FACE_API_KEY;

  if (apiKey && apiKey !== 'hf_your_hugging_face_api_key_here') {
    try {
      const response = await axios.post(
        'https://api-inference.huggingface.co/models/j-hartmann/emotion-english-distilroberta-base',
        { inputs: text },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 8000,
        }
      );

      const results = response.data?.[0];
      if (Array.isArray(results) && results.length > 0) {
        const top = results.sort((a, b) => b.score - a.score)[0];
        const label = (top.label || '').toLowerCase().replace(/[^a-z]/g, '');
        return EMOTION_LABELS[label] || 'neutral';
      }
    } catch (err) {
      console.warn('[Chat] Hugging Face API unavailable, using fallback:', err.message);
    }
  }

  // Keyword-based fallback
  return detectEmotionKeywords(text);
}

/**
 * Simple keyword-based emotion detection fallback.
 * @param {string} text
 * @returns {string}
 */
function detectEmotionKeywords(text) {
  const lower = text.toLowerCase();

  const keywords = {
    joy: ['happy', 'joy', 'great', 'wonderful', 'excited', 'amazing', 'fantastic', 'love', 'glad', 'grateful', 'blessed', 'thrilled', 'delighted', '😊', '🎉', '🥳'],
    sadness: ['sad', 'cry', 'crying', 'depressed', 'unhappy', 'miserable', 'lonely', 'heartbroken', 'grief', 'loss', 'hopeless', 'despair', '😢', '😭', '💔'],
    anger: ['angry', 'furious', 'mad', 'hate', 'rage', 'frustrated', 'annoyed', 'irritated', 'fed up', 'unfair', '😠', '😡', '🤬'],
    fear: ['scared', 'afraid', 'fear', 'anxious', 'anxiety', 'worried', 'panic', 'terrified', 'nervous', 'stress', 'overwhelmed', '😨', '😰', '😱'],
    surprise: ['shocked', 'surprised', 'unexpected', 'unbelievable', 'wow', 'omg', 'amazing', 'sudden', '😮', '😲', '🤯'],
  };

  const scores = {};
  for (const [emotion, words] of Object.entries(keywords)) {
    scores[emotion] = words.filter(w => lower.includes(w)).length;
  }

  const top = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  return top[1] > 0 ? top[0] : 'neutral';
}

/**
 * Get a random AI response for a given emotion.
 * @param {string} emotion
 * @returns {string}
 */
function getAIResponse(emotion) {
  const responses = EMOTION_RESPONSES[emotion] || EMOTION_RESPONSES.neutral;
  return responses[randomInt(responses.length)];
}

// ===== CONTROLLER FUNCTIONS =====

/**
 * POST /api/chat/message
 * Send a user message and receive an AI response with emotion detection.
 */
async function sendMessage(req, res) {
  try {
    const { message, sessionId } = req.body;
    const userId = req.user.userId;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message cannot be empty.' });
    }

    if (message.length > 2000) {
      return res.status(400).json({ success: false, message: 'Message is too long (max 2000 characters).' });
    }

    // Get or create session
    let session;
    if (sessionId) {
      session = await Session.findById(sessionId);
      if (!session || session.userId !== userId) {
        return res.status(404).json({ success: false, message: 'Session not found.' });
      }
    } else {
      session = await Session.create(userId);
    }

    // Detect emotion
    const emotion = await detectEmotion(message.trim());

    // Save user message
    const userMsg = await Message.create(session.id, message.trim(), 'user', emotion);

    // Generate AI response
    const aiText = getAIResponse(emotion);

    // Save AI response
    const aiMsg = await Message.create(session.id, aiText, 'ai', emotion);

    // Update session stats
    await Session.updateEmotion(session.id, emotion);

    return res.status(200).json({
      success: true,
      sessionId: session.id,
      message: {
        id: userMsg.id,
        content: userMsg.content,
        sender: 'user',
        emotion,
        createdAt: userMsg.createdAt,
      },
      response: {
        id: aiMsg.id,
        content: aiMsg.content,
        sender: 'ai',
        emotion,
        createdAt: aiMsg.createdAt,
      },
      emotion,
    });
  } catch (err) {
    console.error('[Chat] SendMessage error:', err);
    return res.status(500).json({ success: false, message: 'Could not process message. Please try again.' });
  }
}

/**
 * GET /api/chat/messages/:sessionId
 * Get all messages for a session.
 */
async function getMessages(req, res) {
  try {
    const { sessionId } = req.params;
    const userId = req.user.userId;

    const session = await Session.findById(sessionId);
    if (!session || session.userId !== userId) {
      return res.status(404).json({ success: false, message: 'Session not found.' });
    }

    const messages = await Message.findBySessionId(sessionId);

    return res.status(200).json({ success: true, messages });
  } catch (err) {
    console.error('[Chat] GetMessages error:', err);
    return res.status(500).json({ success: false, message: 'Could not retrieve messages.' });
  }
}

module.exports = { sendMessage, getMessages };
