/**
 * chat.js — Chat interface functionality for Eshaas
 */

// ===== STATE =====
let currentSessionId = null;
let messageCount = 0;
let sessionStartTime = null;
let timerInterval = null;
let timerSeconds = 0;
let emotionCounts = {};
let isWaitingForResponse = false;

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  if (!requireAuth()) return;

  setupUserInfo();
  setupEventListeners();
  initSession();
  startTimer();
});

function setupUserInfo() {
  const user = getUserData();
  if (!user) return;

  const userNameEl = document.getElementById('user-name');
  const userAvatarEl = document.getElementById('user-avatar');
  const sidebarUserEl = document.getElementById('sidebar-user-name');

  if (userNameEl) userNameEl.textContent = user.name || 'User';
  if (userAvatarEl) userAvatarEl.textContent = getInitials(user.name || 'U');
  if (sidebarUserEl) sidebarUserEl.textContent = user.name || 'User';
}

async function initSession() {
  // Check for an existing session in URL params or localStorage
  const params = new URLSearchParams(window.location.search);
  const existingSessionId = params.get('session') || localStorage.getItem('eshaas_active_session');

  if (existingSessionId) {
    currentSessionId = existingSessionId;
    await loadExistingSession(existingSessionId);
  } else {
    // Start fresh — session will be created on first message
    sessionStartTime = new Date();
    updateSessionUI();
  }
}

async function loadExistingSession(sessionId) {
  try {
    const data = await getSessionById(sessionId);
    if (data && data.session) {
      currentSessionId = sessionId;
      sessionStartTime = new Date(data.session.startTime || Date.now());
      updateSessionUI(data.session);
      if (data.messages && data.messages.length > 0) {
        hideWelcomeMessage();
        data.messages.forEach(msg => {
          displayMessage(msg.content, msg.sender, msg.emotion || 'neutral');
        });
        messageCount = data.messages.filter(m => m.sender === 'user').length;
        updateMessageCount();
      }
    }
  } catch (err) {
    console.error('Could not load session:', err);
  }
}

// ===== EVENT LISTENERS =====

function setupEventListeners() {
  // Send button
  const sendBtn = document.getElementById('send-btn');
  if (sendBtn) sendBtn.addEventListener('click', handleSendMessage);

  // Textarea — Enter to send, Shift+Enter for newline
  const textarea = document.getElementById('chat-textarea');
  if (textarea) {
    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    });
    textarea.addEventListener('input', () => {
      autoResizeTextarea(textarea);
      updateCharCount(textarea);
    });
  }

  // Voice button
  const voiceBtn = document.getElementById('voice-btn');
  if (voiceBtn) voiceBtn.addEventListener('click', toggleVoiceRecording);

  // Clear session button
  const clearBtn = document.getElementById('clear-session-btn');
  if (clearBtn) clearBtn.addEventListener('click', handleClearSession);

  // End session button
  const endBtn = document.getElementById('end-session-btn');
  if (endBtn) endBtn.addEventListener('click', handleEndSession);

  // Logout
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) logoutBtn.addEventListener('click', logout);

  // Sidebar toggle (mobile)
  const sidebarToggle = document.getElementById('sidebar-toggle');
  const sidebar = document.getElementById('chat-sidebar');
  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });
    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', (e) => {
      if (window.innerWidth < 768 &&
          sidebar.classList.contains('open') &&
          !sidebar.contains(e.target) &&
          !sidebarToggle.contains(e.target)) {
        sidebar.classList.remove('open');
      }
    });
  }

  // Suggestion chips
  document.querySelectorAll('.suggestion-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const textarea = document.getElementById('chat-textarea');
      if (textarea) {
        textarea.value = chip.textContent.trim();
        textarea.focus();
        autoResizeTextarea(textarea);
      }
    });
  });
}

// ===== SEND MESSAGE =====

async function handleSendMessage() {
  const textarea = document.getElementById('chat-textarea');
  if (!textarea) return;

  const message = textarea.value.trim();
  if (!message || isWaitingForResponse) return;

  // Display user message immediately
  hideWelcomeMessage();
  displayMessage(message, 'user', null);
  textarea.value = '';
  autoResizeTextarea(textarea);
  updateCharCount(textarea);
  messageCount++;
  updateMessageCount();

  // Show typing indicator
  showTypingIndicator();
  isWaitingForResponse = true;
  updateSendButton(true);

  try {
    const response = await sendMessage(currentSessionId, message);

    hideTypingIndicator();
    isWaitingForResponse = false;
    updateSendButton(false);

    if (response) {
      // Store session ID from first message
      if (!currentSessionId && response.sessionId) {
        currentSessionId = response.sessionId;
        localStorage.setItem('eshaas_active_session', currentSessionId);
        updateSessionUI();
      }

      // Display AI response
      const aiMessage = response.response || response.message;
      const emotion = response.emotion || 'neutral';

      if (aiMessage) {
        displayMessage(
          typeof aiMessage === 'string' ? aiMessage : aiMessage.content,
          'ai',
          emotion
        );
        updateEmotionCounts(emotion);

        // Optionally speak AI response
        if (window.eshaasVoice && window.eshaasVoice.ttsEnabled) {
          window.eshaasVoice.speakText(
            typeof aiMessage === 'string' ? aiMessage : aiMessage.content
          );
        }
      }
    }
  } catch (err) {
    hideTypingIndicator();
    isWaitingForResponse = false;
    updateSendButton(false);

    const errMsg = err.message.includes('connect')
      ? 'Could not reach the server. Please check your connection and make sure the backend is running.'
      : 'Something went wrong. Please try again.';

    displayMessage(errMsg, 'ai', 'neutral', true);
  }

  scrollToBottom();
}

// ===== DISPLAY MESSAGE =====

/**
 * Display a message in the chat area.
 * @param {string} content
 * @param {'user'|'ai'} sender
 * @param {string|null} emotion
 * @param {boolean} isError
 */
function displayMessage(content, sender, emotion = null, isError = false) {
  const messagesEl = document.getElementById('chat-messages');
  if (!messagesEl) return;

  const user = getUserData();
  const isUser = sender === 'user';

  const wrapper = document.createElement('div');
  wrapper.className = `message-wrapper ${isUser ? 'user' : 'ai'}`;

  const avatar = document.createElement('div');
  avatar.className = `message-avatar ${isUser ? 'user' : 'ai'}`;
  avatar.textContent = isUser ? getInitials(user?.name || 'U') : '🧠';

  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';

  const bubble = document.createElement('div');
  bubble.className = `message-bubble ${isUser ? 'user' : 'ai'}${isError ? ' error-bubble' : ''}`;
  if (isError) {
    bubble.style.background = 'rgba(239,68,68,0.08)';
    bubble.style.color = '#DC2626';
    bubble.style.border = '1px solid rgba(239,68,68,0.2)';
  }
  bubble.textContent = content;

  contentDiv.appendChild(bubble);

  // Message meta (time + emotion badge)
  const meta = document.createElement('div');
  meta.className = 'message-meta';

  const time = document.createElement('span');
  time.className = 'message-time';
  time.textContent = formatTime(new Date());
  meta.appendChild(time);

  if (!isUser && emotion && emotion !== 'neutral') {
    const badge = document.createElement('span');
    badge.innerHTML = buildEmotionBadge(emotion);
    meta.appendChild(badge.firstChild);
  }

  contentDiv.appendChild(meta);

  wrapper.appendChild(avatar);
  wrapper.appendChild(contentDiv);

  messagesEl.appendChild(wrapper);
  scrollToBottom();
}

// ===== TYPING INDICATOR =====

function showTypingIndicator() {
  const messagesEl = document.getElementById('chat-messages');
  if (!messagesEl || document.getElementById('typing-indicator')) return;

  const typing = document.createElement('div');
  typing.id = 'typing-indicator';
  typing.className = 'typing-indicator';
  typing.innerHTML = `
    <div class="message-avatar ai">🧠</div>
    <div class="typing-bubble">
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
    </div>
  `;
  messagesEl.appendChild(typing);
  scrollToBottom();
}

function hideTypingIndicator() {
  const typing = document.getElementById('typing-indicator');
  if (typing) typing.remove();
}

// ===== SESSION TIMER =====

function startTimer() {
  timerInterval = setInterval(updateTimer, 1000);
}

function updateTimer() {
  timerSeconds++;
  const timerEl = document.getElementById('timer-display');
  if (timerEl) timerEl.textContent = formatTimerDisplay(timerSeconds);
}

function stopTimer() {
  clearInterval(timerInterval);
}

// ===== SESSION MANAGEMENT =====

async function handleClearSession() {
  if (!confirm('Start a new conversation? This will clear the current messages from view.')) return;

  // End existing session if any
  if (currentSessionId) {
    try {
      await endSession(currentSessionId);
    } catch {}
    localStorage.removeItem('eshaas_active_session');
  }

  // Reset state
  currentSessionId = null;
  messageCount = 0;
  timerSeconds = 0;
  emotionCounts = {};
  isWaitingForResponse = false;

  // Clear messages area
  const messagesEl = document.getElementById('chat-messages');
  if (messagesEl) messagesEl.innerHTML = buildWelcomeMessage();

  // Reset session info
  updateSessionUI();
  updateMessageCount();
  updateEmotionSummary();

  showNotification('New conversation started!', 'success');
}

async function handleEndSession() {
  if (!currentSessionId) {
    showNotification('No active session to end.', 'info');
    return;
  }

  if (!confirm('End this session and go to dashboard?')) return;

  try {
    await endSession(currentSessionId);
    localStorage.removeItem('eshaas_active_session');
    showNotification('Session ended successfully.', 'success');
    setTimeout(() => { window.location.href = 'dashboard.html'; }, 800);
  } catch (err) {
    showNotification('Could not end session: ' + err.message, 'error');
  }
}

// ===== UI UPDATES =====

function updateSessionUI(session = null) {
  const sessionIdEl = document.getElementById('sidebar-session-id');
  const sessionStartEl = document.getElementById('session-start-time');

  if (sessionIdEl) {
    sessionIdEl.textContent = currentSessionId
      ? `#${currentSessionId.slice(-8).toUpperCase()}`
      : '#NEW';
  }
  if (sessionStartEl) {
    sessionStartEl.textContent = sessionStartTime
      ? formatTime(sessionStartTime)
      : formatTime(new Date());
  }
}

function updateMessageCount() {
  const countEl = document.getElementById('message-count');
  if (countEl) countEl.textContent = messageCount;
}

function updateSendButton(disabled) {
  const sendBtn = document.getElementById('send-btn');
  if (sendBtn) sendBtn.disabled = disabled;
}

function updateCharCount(textarea) {
  const countEl = document.getElementById('char-count');
  if (!countEl) return;
  const len = textarea.value.length;
  const max = 1000;
  countEl.textContent = `${len}/${max}`;
  countEl.className = `input-char-count${len > max * 0.9 ? ' warning' : ''}`;
}

function updateEmotionCounts(emotion) {
  if (!emotion) return;
  const key = emotion.toLowerCase();
  emotionCounts[key] = (emotionCounts[key] || 0) + 1;
  updateEmotionSummary();

  // Update most common emotion
  const topEmotion = Object.entries(emotionCounts)
    .sort((a, b) => b[1] - a[1])[0];

  const topEl = document.getElementById('top-emotion');
  if (topEl && topEmotion) {
    const cfg = getEmotionConfig(topEmotion[0]);
    topEl.textContent = `${cfg.emoji} ${cfg.label}`;
  }
}

function updateEmotionSummary() {
  const listEl = document.getElementById('emotion-list');
  if (!listEl) return;

  const total = Object.values(emotionCounts).reduce((a, b) => a + b, 0);

  if (total === 0) {
    listEl.innerHTML = '<p style="font-size:0.75rem;color:var(--color-gray-400);text-align:center;">No emotions detected yet</p>';
    return;
  }

  listEl.innerHTML = Object.entries(emotionCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([emotion, count]) => {
      const cfg = getEmotionConfig(emotion);
      const pct = Math.round((count / total) * 100);
      return `
        <div class="emotion-item">
          <span class="emotion-item-label">${cfg.emoji} ${cfg.label}</span>
          <div class="emotion-bar-wrap">
            <div class="emotion-bar" style="width:${pct}%"></div>
          </div>
          <span class="emotion-count">${count}</span>
        </div>
      `;
    }).join('');
}

function hideWelcomeMessage() {
  const welcome = document.getElementById('welcome-message');
  if (welcome) welcome.style.display = 'none';
}

function buildWelcomeMessage() {
  return `
    <div id="welcome-message" class="welcome-message">
      <div class="welcome-icon">🧠</div>
      <h3 class="welcome-title">Hi, I'm Eshaas!</h3>
      <p class="welcome-text">I'm your emotional intelligence companion. Share what's on your mind — I'm here to listen and support you.</p>
      <div class="welcome-suggestions">
        <button class="suggestion-chip">I'm feeling anxious today</button>
        <button class="suggestion-chip">I need to talk about something</button>
        <button class="suggestion-chip">Help me process my emotions</button>
        <button class="suggestion-chip">I'm having a great day!</button>
      </div>
    </div>
  `;
}

// ===== UTILITIES =====

function autoResizeTextarea(textarea) {
  textarea.style.height = 'auto';
  textarea.style.height = Math.min(textarea.scrollHeight, 160) + 'px';
}

function scrollToBottom() {
  const messagesEl = document.getElementById('chat-messages');
  if (messagesEl) {
    requestAnimationFrame(() => {
      messagesEl.scrollTop = messagesEl.scrollHeight;
    });
  }
}

// ===== VOICE INTEGRATION =====
// Voice button delegates to voice.js
function toggleVoiceRecording() {
  if (window.eshaasVoice) {
    window.eshaasVoice.toggle();
  } else {
    showNotification('Voice recognition is not available in this browser.', 'warning');
  }
}
