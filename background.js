// Constants
const API_BASE_URL = 'http://localhost:5000';

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.type) {
    case 'AUTO_FILL':
      handleAutoFill(request.data);
      break;
    case 'SAVE_PASSWORD':
      handleSavePassword(request.data);
      break;
    case 'CHECK_CONNECTION':
      checkConnection(sendResponse);
      return true; // Required for async sendResponse
  }
});

// Handle auto-fill requests
async function handleAutoFill(data) {
  try {
    const { session } = await chrome.storage.local.get('session');
    if (!session) {
      return;
    }

    const response = await fetch(`${API_BASE_URL}/api/passwords`, {
      headers: {
        'Authorization': `Bearer ${session.username}`
      }
    });

    if (response.ok) {
      const passwords = await response.json();
      const matchingPassword = passwords.find(p => 
        p.site.toLowerCase() === data.domain.toLowerCase()
      );

      if (matchingPassword) {
        chrome.tabs.sendMessage(sender.tab.id, {
          type: 'FILL_CREDENTIALS',
          data: matchingPassword
        });
      }
    }
  } catch (error) {
    console.error('Auto-fill error:', error);
  }
}

// Handle save password requests
async function handleSavePassword(data) {
  try {
    const { session } = await chrome.storage.local.get('session');
    if (!session) {
      return;
    }

    const response = await fetch(`${API_BASE_URL}/api/passwords`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.username}`
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error('Failed to save password');
    }
  } catch (error) {
    console.error('Save password error:', error);
  }
}

// Check connection to the backend
async function checkConnection(sendResponse) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`);
    sendResponse({ connected: response.ok });
  } catch (error) {
    sendResponse({ connected: false });
  }
}

// Listen for tab updates to check for login forms
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url.startsWith('http')) {
    chrome.tabs.sendMessage(tabId, { type: 'CHECK_FORMS' });
  }
}); 