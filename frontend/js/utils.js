/**
 * Eshaas - Utility Functions
 */

/**
 * Checks if user is authenticated; redirects to login if not.
 * Call at the top of protected pages.
 */
function checkAuth() {
  if (!localStorage.getItem('token')) {
    window.location.href = 'index.html';
  }
}

/**
 * Format a date string into a readable time
 * @param {string|Date} date
 * @returns {string}
 */
function formatTime(date) {
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Format a date string into a readable date
 * @param {string|Date} date
 * @returns {string}
 */
function formatDate(date) {
  return new Date(date).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
}

/**
 * Show an alert/notification element
 * @param {string} elementId
 * @param {string} message
 * @param {string} type - 'success' or 'error'
 */
function showAlert(elementId, message, type = 'error') {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.textContent = message;
  el.className = 'alert alert-' + type;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 5000);
}

// Auto-check auth on page load (except auth pages)
const isAuthPage = window.location.pathname.endsWith('index.html') ||
                   window.location.pathname.endsWith('/');
if (!isAuthPage) {
  checkAuth();
}
