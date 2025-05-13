// Constants
const API_BASE_URL = 'http://localhost:5000';
const SESSION_TIMEOUT = 5 * 60 * 1000; // 5 minutes

// DOM Elements
const loginForm = document.getElementById('login-form');
const passwordList = document.getElementById('password-list');
const actions = document.getElementById('actions');
const status = document.getElementById('status');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('login-btn');
const searchInput = document.getElementById('search');
const passwordsContainer = document.getElementById('passwords');
const addPasswordBtn = document.getElementById('add-password');
const generatePasswordBtn = document.getElementById('generate-password');
const logoutBtn = document.getElementById('logout');

// State
let sessionTimeout = null;
let currentUser = null;

// Utility Functions
function showStatus(message, isError = false) {
  status.textContent = message;
  status.style.color = isError ? 'var(--danger-color)' : 'var(--secondary-color)';
}

function clearStatus() {
  status.textContent = '';
}

function startSessionTimer() {
  if (sessionTimeout) {
    clearTimeout(sessionTimeout);
  }
  sessionTimeout = setTimeout(logout, SESSION_TIMEOUT);
}

function resetSessionTimer() {
  startSessionTimer();
}

// API Functions
async function login(username, password) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();
    if (response.ok) {
      currentUser = username;
      chrome.storage.local.set({ 
        session: {
          username,
          timestamp: Date.now()
        }
      });
      showPasswordList();
      startSessionTimer();
      return true;
    } else {
      showStatus(data.message || 'Login failed', true);
      return false;
    }
  } catch (error) {
    showStatus('Connection error', true);
    return false;
  }
}

async function fetchPasswords() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/passwords`, {
      headers: {
        'Authorization': `Bearer ${currentUser}`
      }
    });

    if (response.ok) {
      const passwords = await response.json();
      displayPasswords(passwords);
    } else {
      showStatus('Failed to fetch passwords', true);
    }
  } catch (error) {
    showStatus('Connection error', true);
  }
}

// UI Functions
function showPasswordList() {
  loginForm.classList.add('hidden');
  passwordList.classList.remove('hidden');
  actions.classList.remove('hidden');
  fetchPasswords();
}

function showLoginForm() {
  loginForm.classList.remove('hidden');
  passwordList.classList.add('hidden');
  actions.classList.add('hidden');
  clearStatus();
}

function displayPasswords(passwords) {
  passwordsContainer.innerHTML = '';
  passwords.forEach(password => {
    const div = document.createElement('div');
    div.className = 'password-item';
    div.innerHTML = `
      <div class="password-info">
        <span class="site">${password.site}</span>
        <span class="username">${password.username}</span>
      </div>
      <button class="copy-btn" data-password="${password.password}">Copy</button>
    `;
    passwordsContainer.appendChild(div);
  });
}

// Event Listeners
loginBtn.addEventListener('click', async () => {
  const username = usernameInput.value.trim();
  const password = passwordInput.value;
  
  if (!username || !password) {
    showStatus('Please enter both username and password', true);
    return;
  }

  const success = await login(username, password);
  if (success) {
    usernameInput.value = '';
    passwordInput.value = '';
  }
});

searchInput.addEventListener('input', (e) => {
  const searchTerm = e.target.value.toLowerCase();
  const items = passwordsContainer.getElementsByClassName('password-item');
  
  Array.from(items).forEach(item => {
    const site = item.querySelector('.site').textContent.toLowerCase();
    const username = item.querySelector('.username').textContent.toLowerCase();
    const matches = site.includes(searchTerm) || username.includes(searchTerm);
    item.style.display = matches ? 'flex' : 'none';
  });
});

passwordsContainer.addEventListener('click', (e) => {
  if (e.target.classList.contains('copy-btn')) {
    const password = e.target.dataset.password;
    navigator.clipboard.writeText(password).then(() => {
      showStatus('Password copied to clipboard');
      setTimeout(clearStatus, 2000);
    });
  }
});

logoutBtn.addEventListener('click', () => {
  logout();
});

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  const { session } = await chrome.storage.local.get('session');
  if (session && Date.now() - session.timestamp < SESSION_TIMEOUT) {
    currentUser = session.username;
    showPasswordList();
    startSessionTimer();
  } else {
    showLoginForm();
  }
});

// Activity tracking
document.addEventListener('mousemove', resetSessionTimer);
document.addEventListener('keypress', resetSessionTimer); 