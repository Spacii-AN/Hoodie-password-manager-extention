// Constants
const FORM_SELECTORS = {
  username: ['input[type="email"]', 'input[type="text"]', 'input[name*="user"]', 'input[name*="email"]'],
  password: ['input[type="password"]']
};

// State
let isObserving = false;

// Utility Functions
function findFormFields() {
  const usernameField = document.querySelector(FORM_SELECTORS.username.join(','));
  const passwordField = document.querySelector(FORM_SELECTORS.password.join(','));
  return { usernameField, passwordField };
}

function getDomain() {
  return window.location.hostname;
}

function createSaveButton() {
  const button = document.createElement('button');
  button.textContent = 'Save to Hoodie';
  button.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    padding: 10px 20px;
    background-color: #3498db;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    z-index: 10000;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;
  return button;
}

// Form Handling
function handleFormSubmit(event) {
  const { usernameField, passwordField } = findFormFields();
  if (!usernameField || !passwordField) return;

  const data = {
    site: getDomain(),
    username: usernameField.value,
    password: passwordField.value
  };

  chrome.runtime.sendMessage({
    type: 'SAVE_PASSWORD',
    data
  });
}

function setupFormListeners() {
  const forms = document.querySelectorAll('form');
  forms.forEach(form => {
    form.addEventListener('submit', handleFormSubmit);
  });
}

// Auto-fill Handling
function fillCredentials(credentials) {
  const { usernameField, passwordField } = findFormFields();
  if (!usernameField || !passwordField) return;

  usernameField.value = credentials.username;
  passwordField.value = credentials.password;

  // Trigger input events to activate any JavaScript validation
  usernameField.dispatchEvent(new Event('input', { bubbles: true }));
  passwordField.dispatchEvent(new Event('input', { bubbles: true }));
}

// Message Handling
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.type) {
    case 'CHECK_FORMS':
      const { usernameField, passwordField } = findFormFields();
      if (usernameField && passwordField) {
        chrome.runtime.sendMessage({
          type: 'AUTO_FILL',
          data: { domain: getDomain() }
        });
      }
      break;

    case 'FILL_CREDENTIALS':
      fillCredentials(request.data);
      break;
  }
});

// Mutation Observer for dynamically loaded forms
function observeForms() {
  if (isObserving) return;

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.addedNodes.length) {
        const { usernameField, passwordField } = findFormFields();
        if (usernameField && passwordField) {
          setupFormListeners();
          chrome.runtime.sendMessage({
            type: 'AUTO_FILL',
            data: { domain: getDomain() }
          });
        }
      }
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  isObserving = true;
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  setupFormListeners();
  observeForms();
}); 