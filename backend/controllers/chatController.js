const axios = require('axios');
const { db } = require('../config/firebase');

// Emotion detection using Hugging Face API
const detectEmotion = async (text) => {
  try {
    const response = await axios.post(
      'https://api-inference.huggingface.co/models/j-hartmann/emotion-english-distilroberta-base',
      { inputs: text },
      {
        headers: {
          Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`
        }
      }
    );

    if (response.data && response.data[0]) {
      const emotions = response.data[0];
      // Sort by score and return top emotion
      const topEmotion = emotions.sort((a, b) => b.score - a.score)[0];
      return {
        emotion: topEmotion.label,
        confidence: (topEmotion.score * 100).toFixed(2),
        allEmotions: emotions
      };
    }
    return { emotion: 'neutral', confidence: 50 };
  } catch (error) {
    console.error('Emotion detection error:', error);
    return { emotion: 'neutral', confidence: 50 };
  }
};

// Generate AI response based on emotion
const generateAIResponse = (userMessage, emotion) => {
  const emotionalResponses = {
    joy: [
      "That's wonderful! Your joy is contagious. Tell me more about what makes you happy.",
      "I love your positive energy! What brought this happiness to you?",
      "Your happiness lights up the conversation! Keep sharing those beautiful moments."
    ],
    sadness: [
      "I sense some sadness in your words. I'm here to listen. Would you like to talk about it?",
      "It's okay to feel sad. Sometimes our emotions guide us to important realizations.",
      "I'm here for you. Your feelings matter, and I'm listening with compassion."
    ],
    anger: [
      "I can feel the intensity in your words. Let's take a moment to understand what's bothering you.",
      "Your anger is valid. Let's explore what triggered these feelings together.",
      "Sometimes anger is a sign we need to address something important. I'm here to help."
    ],
    fear: [
      "I notice some concern in your message. Remember, you're not alone in this.",
      "Fear is a natural emotion. Let's talk through what's worrying you.",
      "It's okay to feel afraid. Sharing your worries can help lighten the load."
    ],
    surprise: [
      "That's quite surprising! Tell me more about this unexpected turn of events.",
      "I love the energy of surprise! What happened that caught you off guard?",
      "Something surprising caught your attention! Let's explore that together."
    ],
    disgust: [
      "I sense some strong feelings about this. What's making you feel this way?",
      "Your perspective matters. Let's talk about what's bothering you.",
      "I'm here to understand your concerns. What's on your mind?"
    ],
    neutral: [
      "I'm here to support you. What's on your mind today?",
      "I'm listening. Feel free to share anything you'd like to talk about.",
      "Let's have a meaningful conversation. What would you like to discuss?"
    ]
  };

  const responses = emotionalResponses[emotion] || emotionalResponses.neutral;
  return responses[Math.floor(Math.random() * responses.length)];
};

// Send Message
const sendMessage = async (req, res) => {
  try {
    const { userId } = req.user;
    const { message, sessionId } = req.body;

    if (!message || !sessionId) {
      return res.status(400).json({ 
        error: 'Message and session ID are required',
        status: 400 
      });
    }

    // Detect emotion in user message
    const emotionData = await detectEmotion(message);

    // Generate AI response
    const aiResponse = generateAIResponse(message, emotionData.emotion);

    // Store user message
    const userMessageId = Date.now().toString();
    await db.ref(`sessions/${sessionId}/messages/${userMessageId}`).set({
      type: 'user',
      content: message,
      emotion: emotionData.emotion,
      emotionConfidence: emotionData.confidence,
      timestamp: new Date().toISOString(),
      allEmotions: emotionData.allEmotions
    });

    // Store AI response
    const aiMessageId = (Date.now() + 1).toString();
    await db.ref(`sessions/${sessionId}/messages/${aiMessageId}`).set({
      type: 'ai',
      content: aiResponse,
      emotion: emotionData.emotion,
      timestamp: new Date().toISOString()
    });

    // Update session metadata
    const sessionRef = db.ref(`sessions/${sessionId}`);
    const sessionSnapshot = await sessionRef.once('value');
    const session = sessionSnapshot.val();

    await sessionRef.update({
      messageCount: (session.messageCount || 0) + 1,
      lastMessage: message,
      lastMessageTime: new Date().toISOString(),
      dominantEmotion: emotionData.emotion,
      lastDetectedEmotions: emotionData.allEmotions
    });

    res.json({
      message: 'Message processed successfully',
      userMessage: {
        id: userMessageId,
        content: message,
        emotion: emotionData.emotion,
        confidence: emotionData.confidence
      },
      aiMessage: {
        id: aiMessageId,
        content: aiResponse
      },
      status: 200
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to send message',
      status: 500 
    });
  }
};

// Get Message History
const getMessageHistory = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { userId } = req.user;

    const messagesSnapshot = await db.ref(`sessions/${sessionId}/messages`).once('value');
    const messages = messagesSnapshot.val() || {};

    const messageArray = Object.entries(messages).map(([id, msg]) => ({
      id,
      ...msg
    })).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    res.json({
      messages: messageArray,
      count: messageArray.length,
      status: 200
    });
  } catch (error) {
    console.error('Get message history error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to retrieve message history',
      status: 500 
    });
  }
};

module.exports = {
  sendMessage,
  getMessageHistory,
  detectEmotion
};