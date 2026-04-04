const axios = require('axios');
const { db } = require('../config/firebase');
const { v4: uuidv4 } = require('uuid');

const HUGGING_FACE_API = 'https://api-inference.huggingface.co/models';
const EMOTION_MODEL = 'j-hartmann/emotion-english-distilroberta-base';
const CHAT_MODEL = 'google/flan-t5-base';

// Detect emotion from text
exports.detectEmotion = async (text) => {
  try {
    const response = await axios.post(
      `${HUGGING_FACE_API}/${EMOTION_MODEL}`,
      { inputs: text },
      {
        headers: {
          Authorization: `Bearer ${process.env.HUGGING_FACE_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data && response.data[0]) {
      return response.data[0].reduce((prev, current) =>
        prev.score > current.score ? prev : current
      );
    }
    return { label: 'neutral', score: 0 };
  } catch (error) {
    console.error('Emotion detection error:', error.message);
    return { label: 'neutral', score: 0 };
  }
};

// Generate AI response
exports.generateResponse = async (userMessage) => {
  try {
    // Simple wellness-focused responses based on emotions
    const responses = {
      joy: "That's wonderful! 🌟 I'm so glad you're experiencing positive emotions. Keep nurturing these moments!",
      sadness: "I hear you, and it's okay to feel this way. 💙 Let's talk through this together. Remember, difficult emotions are temporary.",
      anger: "I understand your frustration. 🔥 Let's take a moment to process this. What's bothering you the most?",
      fear: "It's natural to feel anxious sometimes. 💚 Let's explore what's worrying you and work through it together.",
      neutral: "Thank you for sharing. Tell me more about what's on your mind. I'm here to listen.",
      surprise: "That's interesting! 😊 Tell me more about this experience.",
      disgust: "I sense some strong feelings here. Let's dig deeper into what's causing this reaction."
    };

    const randomResponse = responses[userMessage.label] || responses.neutral;
    
    return {
      text: randomResponse,
      emotion: userMessage.label,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Response generation error:', error);
    return {
      text: "I'm here to listen and support you. Could you tell me more about what you're feeling?",
      emotion: 'neutral',
      timestamp: new Date().toISOString()
    };
  }
};

// Send message
exports.sendMessage = async (req, res) => {
  try {
    const { sessionId, message } = req.body;
    const userId = req.user.userId;

    if (!message || !sessionId) {
      return res.status(400).json({ error: 'Message and sessionId are required' });
    }

    // Save user message
    const messageId = uuidv4();
    const userEmotion = await exports.detectEmotion(message);

    await db.ref(`messages/${sessionId}/${messageId}`).set({
      type: 'user',
      content: message,
      emotion: userEmotion,
      timestamp: new Date().toISOString(),
      userId
    });

    // Generate AI response
    const aiResponse = await exports.generateResponse(userEmotion);
    const aiMessageId = uuidv4();

    await db.ref(`messages/${sessionId}/${aiMessageId}`).set({
      type: 'assistant',
      content: aiResponse.text,
      emotion: aiResponse.emotion,
      timestamp: new Date().toISOString()
    });

    // Update session with message count and last emotion
    await db.ref(`sessions/${sessionId}`).update({
      messageCount: await getMessageCount(sessionId) + 2,
      lastEmotion: userEmotion.label,
      updatedAt: new Date().toISOString()
    });

    res.status(200).json({
      success: true,
      userMessage: {
        id: messageId,
        content: message,
        emotion: userEmotion,
        type: 'user'
      },
      aiMessage: {
        id: aiMessageId,
        content: aiResponse.text,
        emotion: aiResponse.emotion,
        type: 'assistant'
      }
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get chat history
exports.getChatHistory = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.userId;

    // Verify session belongs to user
    const sessionSnapshot = await db.ref(`sessions/${sessionId}`).once('value');
    if (!sessionSnapshot.exists() || sessionSnapshot.val().userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const messagesSnapshot = await db.ref(`messages/${sessionId}`).once('value');
    const messages = messagesSnapshot.exists() ? Object.values(messagesSnapshot.val()) : [];

    res.status(200).json({
      sessionId,
      messages: messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
    });
  } catch (error) {
    console.error('Get chat history error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Helper function
async function getMessageCount(sessionId) {
  const snapshot = await db.ref(`messages/${sessionId}`).once('value');
  return snapshot.exists() ? Object.keys(snapshot.val()).length : 0;
}