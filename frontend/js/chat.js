/**
 * Eshaas - Chat JS
 */

let sessionId = null;

document.addEventListener('DOMContentLoaded', async () => {
  sessionId = 'session_' + Date.now();

  // Load existing messages if any
  document.getElementById('messageInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') sendMessage();
  });
});

async function sendMessage() {
  const input = document.getElementById('messageInput');
  const message = input.value.trim();

  if (!message) return;

  displayMessage(message, 'user');
  input.value = '';

  try {
    const res = await API.sendMessage(sessionId, message);
    const aiMsg = (res.aiMessage && res.aiMessage.content) ? res.aiMessage.content : 'I\'m here for you. 💚';
    displayMessage(aiMsg, 'ai');
  } catch (error) {
    displayMessage('I\'m having trouble connecting right now. Please try again. 💙', 'ai');
    console.error('Chat error:', error);
  }
}

function displayMessage(text, type) {
  const messagesDiv = document.getElementById('messages');
  const messageEl = document.createElement('div');
  messageEl.className = 'message ' + type;
  messageEl.textContent = text;
  messagesDiv.appendChild(messageEl);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}
