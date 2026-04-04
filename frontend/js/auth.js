/**
 * auth.js — Login and signup logic for Eshaas
 */

document.addEventListener('DOMContentLoaded', () => {
  // If already logged in, redirect to home
  redirectIfAuthed();
  initAuthPage();
});

function initAuthPage() {
  setupTabSwitching();
  setupLoginForm();
  setupRegisterForm();
  setupPasswordToggles();
  setupPasswordStrength();
}

// ===== TAB SWITCHING =====

function setupTabSwitching() {
  const tabs = document.querySelectorAll('.auth-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      switchToTab(target);
    });
  });
}

function switchToTab(tabName) {
  // Update tab buttons
  document.querySelectorAll('.auth-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === tabName);
  });
  // Update forms
  document.querySelectorAll('.auth-form').forEach(f => {
    f.classList.toggle('active', f.id === `${tabName}-form`);
  });
  // Clear alerts
  clearAlerts();
}

// ===== LOGIN FORM =====

function setupLoginForm() {
  const form = document.getElementById('login-form');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await handleLogin();
  });
}

async function handleLogin() {
  const emailInput = document.getElementById('login-email');
  const passwordInput = document.getElementById('login-password');
  const submitBtn = document.getElementById('login-btn');
  const alertEl = document.getElementById('login-alert');

  clearAlerts();

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  // Validate
  let valid = true;
  if (!email) {
    showFieldError(emailInput, 'Email is required.');
    valid = false;
  } else if (!isValidEmail(email)) {
    showFieldError(emailInput, 'Please enter a valid email address.');
    valid = false;
  }
  if (!password) {
    showFieldError(passwordInput, 'Password is required.');
    valid = false;
  }
  if (!valid) return;

  setButtonLoading(submitBtn, 'Signing in...');

  try {
    const response = await login(email, password);

    if (response.token) {
      setAuthToken(response.token);
      setUserData(response.user);
      showAlert(alertEl, 'Welcome back! Redirecting...', 'success');
      setTimeout(() => { window.location.href = 'home.html'; }, 800);
    } else {
      showAlert(alertEl, 'Login failed. Please try again.', 'error');
    }
  } catch (err) {
    const msg = err.message || 'Login failed. Please check your credentials.';
    showAlert(alertEl, msg, 'error');
  } finally {
    resetButton(submitBtn);
  }
}

// ===== REGISTER FORM =====

function setupRegisterForm() {
  const form = document.getElementById('register-form');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await handleRegister();
  });
}

async function handleRegister() {
  const nameInput = document.getElementById('register-name');
  const emailInput = document.getElementById('register-email');
  const passwordInput = document.getElementById('register-password');
  const confirmInput = document.getElementById('register-confirm');
  const termsCheck = document.getElementById('register-terms');
  const submitBtn = document.getElementById('register-btn');
  const alertEl = document.getElementById('register-alert');

  clearAlerts();

  const name = nameInput.value.trim();
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  const confirm = confirmInput.value;

  // Validate
  let valid = true;
  if (!name || name.length < 2) {
    showFieldError(nameInput, 'Please enter your full name (at least 2 characters).');
    valid = false;
  }
  if (!email) {
    showFieldError(emailInput, 'Email is required.');
    valid = false;
  } else if (!isValidEmail(email)) {
    showFieldError(emailInput, 'Please enter a valid email address.');
    valid = false;
  }
  if (!password) {
    showFieldError(passwordInput, 'Password is required.');
    valid = false;
  } else if (password.length < 8) {
    showFieldError(passwordInput, 'Password must be at least 8 characters.');
    valid = false;
  }
  if (!confirm) {
    showFieldError(confirmInput, 'Please confirm your password.');
    valid = false;
  } else if (password !== confirm) {
    showFieldError(confirmInput, 'Passwords do not match.');
    valid = false;
  }
  if (termsCheck && !termsCheck.checked) {
    showAlert(alertEl, 'Please accept the terms and privacy policy.', 'error');
    valid = false;
  }
  if (!valid) return;

  setButtonLoading(submitBtn, 'Creating account...');

  try {
    const response = await register(name, email, password);

    if (response.token) {
      setAuthToken(response.token);
      setUserData(response.user);
      showAlert(alertEl, 'Account created! Welcome to Eshaas 🎉', 'success');
      setTimeout(() => { window.location.href = 'home.html'; }, 1000);
    } else {
      showAlert(alertEl, 'Registration failed. Please try again.', 'error');
    }
  } catch (err) {
    const msg = err.message || 'Registration failed. Please try again.';
    showAlert(alertEl, msg, 'error');
  } finally {
    resetButton(submitBtn);
  }
}

// ===== PASSWORD TOGGLES =====

function setupPasswordToggles() {
  document.querySelectorAll('.password-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.target;
      const input = document.getElementById(targetId);
      if (!input) return;
      const isVisible = input.type === 'text';
      input.type = isVisible ? 'password' : 'text';
      btn.textContent = isVisible ? '👁️' : '🙈';
    });
  });
}

// ===== PASSWORD STRENGTH =====

function setupPasswordStrength() {
  const passwordInput = document.getElementById('register-password');
  const strengthFill = document.getElementById('strength-fill');
  const strengthText = document.getElementById('strength-text');
  if (!passwordInput || !strengthFill || !strengthText) return;

  passwordInput.addEventListener('input', () => {
    const strength = getPasswordStrength(passwordInput.value);
    updateStrengthUI(strengthFill, strengthText, strength);
  });
}

function getPasswordStrength(password) {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (score <= 2) return 1; // weak
  if (score <= 4) return 2; // medium
  return 3; // strong
}

function updateStrengthUI(fillEl, textEl, level) {
  const levels = ['', 'weak', 'medium', 'strong'];
  const labels = ['', 'Weak password', 'Medium strength', 'Strong password'];

  fillEl.className = 'strength-fill';
  textEl.className = 'strength-text';

  if (level > 0) {
    fillEl.classList.add(levels[level]);
    textEl.classList.add(levels[level]);
    textEl.textContent = labels[level];
  } else {
    textEl.textContent = '';
  }
}

// ===== FORM HELPERS =====

function showFieldError(input, message) {
  input.classList.add('form-control-error');
  const errorEl = document.getElementById(`${input.id}-error`);
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.classList.add('show');
  }
  input.addEventListener('input', () => clearFieldError(input), { once: true });
}

function clearFieldError(input) {
  input.classList.remove('form-control-error');
  const errorEl = document.getElementById(`${input.id}-error`);
  if (errorEl) {
    errorEl.textContent = '';
    errorEl.classList.remove('show');
  }
}

function showAlert(alertEl, message, type = 'error') {
  if (!alertEl) return;
  alertEl.textContent = '';
  alertEl.className = `auth-alert ${type} show`;

  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  const icon = document.createElement('span');
  icon.textContent = icons[type] || icons.info;

  const text = document.createElement('span');
  text.textContent = message;

  alertEl.appendChild(icon);
  alertEl.appendChild(text);
}

function clearAlerts() {
  document.querySelectorAll('.auth-alert').forEach(el => {
    el.className = 'auth-alert';
    el.textContent = '';
  });
  document.querySelectorAll('.form-control-error').forEach(el => {
    el.classList.remove('form-control-error');
  });
  document.querySelectorAll('.form-error.show').forEach(el => {
    el.classList.remove('show');
    el.textContent = '';
  });
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
