// Background service worker
console.log('Easy Job Application: Background service worker loaded');

// Listen for extension installation
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Extension installed:', details.reason);
  
  if (details.reason === 'install') {
    // Initialize storage with default values if needed
    chrome.storage.local.get('profiles', (result) => {
      if (!result.profiles) {
        chrome.storage.local.set({ profiles: {} });
      }
    });
  }
});

// Handle messages from content scripts or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request);
  
  // Handle any background tasks here if needed
  
  sendResponse({ received: true });
  return true;
});
