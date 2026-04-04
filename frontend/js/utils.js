/**
 * utils.js — Helper functions for Eshaas
 */

// ===== DATE & TIME FORMATTERS =====

/**
 * Format a date string or timestamp to a readable date.
 * @param {string|number|Date} date
 * @returns {string}
 */
function formatDate(date) {
  if (!date) return 'N/A';
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'N/A';
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format a date string or timestamp to a readable date + time.
 * @param {string|number|Date} date
 * @returns {string}
 */
function formatDateTime(date) {
  if (!date) return 'N/A';
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'N/A';
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format a duration in seconds to a human-readable string.
 * @param {number} seconds
 * @returns {string}
 */
function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return '0s';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

/**
 * Format a time from a Date object to HH:MM AM/PM.
 * @param {string|number|Date} date
 * @returns {string}
 */
function formatTime(date) {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Format seconds into MM:SS display for timer.
 * @param {number} totalSeconds
 * @returns {string}
 */
function formatTimerDisplay(totalSeconds) {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/**
 * Returns a relative time string, e.g. "2 hours ago", "just now".
 * @param {string|number|Date} date
 * @returns {string}
 */
function timeAgo(date) {
  if (!date) return '';
  const now = Date.now();
  const diff = now - new Date(date).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(date);
}

// ===== NOTIFICATION SYSTEM =====

/**
 * Show a toast notification.
 * @param {string} message
 * @param {'success'|'error'|'warning'|'info'} type
 * @param {number} duration ms
 */
function showNotification(message, type = 'info', duration = 4000) {
  let container = document.getElementById('notifications-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'notifications-container';
    document.body.appendChild(container);
  }

  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
  };

  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.innerHTML = `
    <span class="notification-icon">${icons[type] || icons.info}</span>
    <span class="notification-text">${escapeHtml(message)}</span>
    <button class="notification-close" aria-label="Close notification">&times;</button>
  `;

  container.appendChild(notification);

  const closeBtn = notification.querySelector('.notification-close');
  const dismiss = () => {
    notification.style.opacity = '0';
    notification.style.transform = 'translateX(100%)';
    notification.style.transition = 'all 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  };

  closeBtn.addEventListener('click', dismiss);
  if (duration > 0) setTimeout(dismiss, duration);
}

// ===== AUTH TOKEN HELPERS =====

const TOKEN_KEY = 'eshaas_token';
const USER_KEY = 'eshaas_user';

function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function setAuthToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

function removeAuthToken() {
  localStorage.removeItem(TOKEN_KEY);
}

function getUserData() {
  try {
    const data = localStorage.getItem(USER_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

function setUserData(user) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function removeUserData() {
  localStorage.removeItem(USER_KEY);
}

/**
 * Clear all auth data and redirect to login.
 */
function logout() {
  removeAuthToken();
  removeUserData();
  window.location.href = 'index.html';
}

/**
 * Redirect to login if user is not authenticated.
 */
function requireAuth() {
  if (!getAuthToken()) {
    window.location.href = 'index.html';
    return false;
  }
  return true;
}

/**
 * Redirect to home if user is already authenticated.
 */
function redirectIfAuthed() {
  if (getAuthToken()) {
    window.location.href = 'home.html';
  }
}

// ===== STRING HELPERS =====

/**
 * Truncate a string to a max length.
 * @param {string} str
 * @param {number} maxLen
 * @param {string} suffix
 * @returns {string}
 */
function truncateText(str, maxLen = 80, suffix = '...') {
  if (!str) return '';
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - suffix.length).trimEnd() + suffix;
}

/**
 * Escape HTML special characters.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Capitalize the first letter of a string.
 * @param {string} str
 * @returns {string}
 */
function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Get user's initials from name.
 * @param {string} name
 * @returns {string}
 */
function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

// ===== FUNCTION HELPERS =====

/**
 * Debounce a function call.
 * @param {Function} func
 * @param {number} wait ms
 * @returns {Function}
 */
function debounce(func, wait = 300) {
  let timeoutId = null;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), wait);
  };
}

/**
 * Throttle a function call.
 * @param {Function} func
 * @param {number} limit ms
 * @returns {Function}
 */
function throttle(func, limit = 300) {
  let inThrottle = false;
  return function (...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => { inThrottle = false; }, limit);
    }
  };
}

/**
 * Generate a random ID string using crypto.getRandomValues when available.
 * @param {number} length
 * @returns {string}
 */
function generateId(length = 12) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const arr = new Uint8Array(length);
    crypto.getRandomValues(arr);
    return Array.from(arr, b => chars[b % chars.length]).join('');
  }
  // Legacy fallback (non-security-critical client utility)
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// ===== DOM HELPERS =====

/**
 * Show a loading state on a button.
 * @param {HTMLButtonElement} btn
 * @param {string} loadingText
 */
function setButtonLoading(btn, loadingText = 'Loading...') {
  if (!btn) return;
  btn.disabled = true;
  btn._originalText = btn.innerHTML;
  btn.innerHTML = `<span class="btn-spinner" style="display:inline-block;width:1rem;height:1rem;border:2px solid rgba(255,255,255,0.4);border-top-color:currentColor;border-radius:50%;animation:spin 0.8s linear infinite;"></span> ${escapeHtml(loadingText)}`;
}

/**
 * Reset a button from loading state.
 * @param {HTMLButtonElement} btn
 */
function resetButton(btn) {
  if (!btn) return;
  btn.disabled = false;
  if (btn._originalText) {
    btn.innerHTML = btn._originalText;
    delete btn._originalText;
  }
}

/**
 * Show an element (remove hidden class).
 * @param {HTMLElement|string} el element or selector
 */
function showEl(el) {
  const elem = typeof el === 'string' ? document.querySelector(el) : el;
  if (elem) elem.classList.remove('hidden');
}

/**
 * Hide an element (add hidden class).
 * @param {HTMLElement|string} el element or selector
 */
function hideEl(el) {
  const elem = typeof el === 'string' ? document.querySelector(el) : el;
  if (elem) elem.classList.add('hidden');
}

// ===== DATA HELPERS =====

/**
 * Download data as a file.
 * @param {string} filename
 * @param {string} content
 * @param {string} mimeType
 */
function downloadFile(filename, content, mimeType = 'text/plain') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Convert sessions array to CSV.
 * @param {Array} sessions
 * @returns {string}
 */
function sessionsToCSV(sessions) {
  const headers = ['Session ID', 'Date', 'Duration (s)', 'Messages', 'Top Emotion', 'Status'];
  const rows = sessions.map(s => [
    s.id || s._id || '',
    formatDate(s.startTime || s.createdAt),
    s.duration || 0,
    s.messageCount || 0,
    s.topEmotion || 'neutral',
    s.status || 'ended',
  ]);
  const escapeCell = v => `"${String(v).replace(/"/g, '""')}"`;
  return [headers.map(escapeCell).join(','), ...rows.map(r => r.map(escapeCell).join(','))].join('\n');
}

// ===== EMOTION HELPERS =====

const EMOTION_CONFIG = {
  joy:      { emoji: '😊', label: 'Joy',      color: '#F59E0B' },
  sadness:  { emoji: '😢', label: 'Sadness',  color: '#3B82F6' },
  anger:    { emoji: '😠', label: 'Anger',    color: '#EF4444' },
  fear:     { emoji: '😨', label: 'Fear',     color: '#8B5CF6' },
  surprise: { emoji: '😮', label: 'Surprise', color: '#10B981' },
  neutral:  { emoji: '😐', label: 'Neutral',  color: '#6B7280' },
};

/**
 * Get emotion config for a given emotion label.
 * @param {string} emotion
 * @returns {{ emoji: string, label: string, color: string }}
 */
function getEmotionConfig(emotion) {
  return EMOTION_CONFIG[String(emotion).toLowerCase()] || EMOTION_CONFIG.neutral;
}

/**
 * Build an emotion badge HTML string.
 * @param {string} emotion
 * @returns {string}
 */
function buildEmotionBadge(emotion) {
  const cfg = getEmotionConfig(emotion);
  return `<span class="emotion-badge ${emotion.toLowerCase()}">${cfg.emoji} ${cfg.label}</span>`;
}
