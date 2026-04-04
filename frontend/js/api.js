/**
 * api.js — API communication layer for Eshaas
 */

const API_BASE_URL = 'http://localhost:5000/api';

/**
 * Core API request function with auth headers and error handling.
 * @param {string} endpoint
 * @param {'GET'|'POST'|'PUT'|'DELETE'|'PATCH'} method
 * @param {object|null} data
 * @returns {Promise<any>}
 */
async function apiRequest(endpoint, method = 'GET', data = null) {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = getAuthToken();

  const headers = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options = {
    method,
    headers,
  };

  if (data && method !== 'GET') {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url, options);

    // Handle empty responses (204 No Content)
    if (response.status === 204) {
      return { success: true };
    }

    const responseData = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMessage =
        responseData.message ||
        responseData.error ||
        `Request failed with status ${response.status}`;
      throw new ApiError(errorMessage, response.status, responseData);
    }

    return responseData;
  } catch (err) {
    if (err instanceof ApiError) throw err;

    // Network error or server not running
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      throw new ApiError(
        'Cannot connect to server. Please make sure the backend is running.',
        0,
        null
      );
    }

    throw new ApiError(err.message || 'An unexpected error occurred', 0, null);
  }
}

/**
 * Custom API error class.
 */
class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

// ===== AUTH ENDPOINTS =====

/**
 * Login with email and password.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ token: string, user: object }>}
 */
async function login(email, password) {
  return apiRequest('/auth/login', 'POST', { email, password });
}

/**
 * Register a new account.
 * @param {string} name
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ token: string, user: object }>}
 */
async function register(name, email, password) {
  return apiRequest('/auth/register', 'POST', { name, email, password });
}

/**
 * Fetch the current user's profile.
 * @returns {Promise<object>}
 */
async function getUserProfile() {
  return apiRequest('/auth/profile', 'GET');
}

// ===== CHAT ENDPOINTS =====

/**
 * Send a chat message and receive an AI response.
 * @param {string|null} sessionId - null to create a new session
 * @param {string} message
 * @returns {Promise<{ sessionId: string, message: object, response: object }>}
 */
async function sendMessage(sessionId, message) {
  return apiRequest('/chat/message', 'POST', { sessionId, message });
}

/**
 * Get all messages for a session.
 * @param {string} sessionId
 * @returns {Promise<{ messages: Array }>}
 */
async function getMessages(sessionId) {
  return apiRequest(`/chat/messages/${sessionId}`, 'GET');
}

// ===== SESSION ENDPOINTS =====

/**
 * Create a new chat session.
 * @returns {Promise<{ session: object }>}
 */
async function createSession() {
  return apiRequest('/sessions', 'POST');
}

/**
 * Get all sessions for the authenticated user.
 * @returns {Promise<{ sessions: Array }>}
 */
async function getSessions() {
  return apiRequest('/sessions', 'GET');
}

/**
 * Get analytics data for the authenticated user.
 * @returns {Promise<object>}
 */
async function getAnalytics() {
  return apiRequest('/sessions/analytics', 'GET');
}

/**
 * Get a single session by ID (includes messages).
 * @param {string} id
 * @returns {Promise<{ session: object, messages: Array }>}
 */
async function getSessionById(id) {
  return apiRequest(`/sessions/${id}`, 'GET');
}

/**
 * Update session data.
 * @param {string} id
 * @param {object} data
 * @returns {Promise<{ session: object }>}
 */
async function updateSession(id, data) {
  return apiRequest(`/sessions/${id}`, 'PUT', data);
}

/**
 * Mark a session as ended.
 * @param {string} sessionId
 * @returns {Promise<{ session: object }>}
 */
async function endSession(sessionId) {
  return apiRequest(`/sessions/${sessionId}`, 'PUT', {
    status: 'ended',
    endTime: new Date().toISOString(),
  });
}

/**
 * Delete a session by ID.
 * @param {string} id
 * @returns {Promise<{ success: boolean }>}
 */
async function deleteSession(id) {
  return apiRequest(`/sessions/${id}`, 'DELETE');
}

// ===== HEALTH CHECK =====

/**
 * Check if the backend is available.
 * @returns {Promise<boolean>}
 */
async function checkHealth() {
  try {
    const response = await fetch(`http://localhost:5000/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000),
    });
    return response.ok;
  } catch {
    return false;
  }
}
