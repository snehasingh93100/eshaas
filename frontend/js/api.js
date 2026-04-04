/**
 * Eshaas - API Client
 */

const API_BASE = 'http://localhost:5000/api';

const API = {
  /**
   * Make an authenticated request to the backend
   */
  async request(endpoint, method = 'GET', body = null) {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + localStorage.getItem('token')
      }
    };
    if (body) options.body = JSON.stringify(body);

    const response = await fetch(API_BASE + endpoint, options);
    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(err.error || 'Request failed');
    }
    return response.json();
  },

  register(name, email, password) {
    return this.request('/auth/register', 'POST', { name, email, password });
  },

  login(email, password) {
    return this.request('/auth/login', 'POST', { email, password });
  },

  getProfile() {
    return this.request('/auth/profile');
  },

  sendMessage(sessionId, message) {
    return this.request('/chat/send-message', 'POST', { sessionId, message });
  },

  getChatHistory(sessionId) {
    return this.request('/chat/message-history/' + sessionId);
  },

  createSession() {
    return this.request('/sessions/create', 'POST');
  },

  getUserSessions() {
    return this.request('/sessions/user-sessions');
  },

  getAnalytics() {
    return this.request('/sessions/analytics');
  }
};
