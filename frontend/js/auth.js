/**
 * Eshaas - Authentication JS
 */

function toggleForm(type) {
  const loginSection = document.getElementById('loginSection');
  const signupSection = document.getElementById('signupSection');
  const alertBox = document.getElementById('alertBox');

  alertBox.classList.add('hidden');

  if (type === 'signup') {
    loginSection.classList.add('hidden');
    signupSection.classList.remove('hidden');
  } else {
    signupSection.classList.add('hidden');
    loginSection.classList.remove('hidden');
  }
}

async function handleLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const alertBox = document.getElementById('alertBox');

  if (!email || !password) {
    alertBox.textContent = 'Please enter your email and password.';
    alertBox.className = 'alert alert-error';
    alertBox.classList.remove('hidden');
    return;
  }

  try {
    const res = await API.login(email, password);
    if (res.token) {
      localStorage.setItem('token', res.token);
      localStorage.setItem('user', JSON.stringify(res.user || {}));
      window.location.href = 'home.html';
    } else {
      throw new Error(res.error || 'Login failed');
    }
  } catch (error) {
    alertBox.textContent = 'Login failed: ' + error.message;
    alertBox.className = 'alert alert-error';
    alertBox.classList.remove('hidden');
  }
}

async function handleSignup() {
  const name = document.getElementById('signupName').value.trim();
  const email = document.getElementById('signupEmail').value.trim();
  const password = document.getElementById('signupPassword').value;
  const alertBox = document.getElementById('alertBox');

  if (!name || !email || !password) {
    alertBox.textContent = 'Please fill in all fields.';
    alertBox.className = 'alert alert-error';
    alertBox.classList.remove('hidden');
    return;
  }

  try {
    const res = await API.register(name, email, password);
    if (res.token) {
      localStorage.setItem('token', res.token);
      localStorage.setItem('user', JSON.stringify(res.user || {}));
      window.location.href = 'home.html';
    } else {
      throw new Error(res.error || 'Registration failed');
    }
  } catch (error) {
    alertBox.textContent = 'Registration failed: ' + error.message;
    alertBox.className = 'alert alert-error';
    alertBox.classList.remove('hidden');
  }
}

// Allow pressing Enter to submit
document.addEventListener('keypress', function(e) {
  if (e.key === 'Enter') {
    const loginSection = document.getElementById('loginSection');
    if (!loginSection.classList.contains('hidden')) {
      handleLogin();
    } else {
      handleSignup();
    }
  }
});
