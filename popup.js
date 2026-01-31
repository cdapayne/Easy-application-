// Storage helper functions
const StorageHelper = {
  async getAllProfiles() {
    const result = await chrome.storage.local.get('profiles');
    return result.profiles || {};
  },

  async getProfile(profileName) {
    const profiles = await this.getAllProfiles();
    return profiles[profileName] || null;
  },

  async saveProfile(profileName, data) {
    const profiles = await this.getAllProfiles();
    profiles[profileName] = data;
    await chrome.storage.local.set({ profiles });
  },

  async deleteProfile(profileName) {
    const profiles = await this.getAllProfiles();
    delete profiles[profileName];
    await chrome.storage.local.set({ profiles });
  }
};

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  await loadProfiles();
  attachEventListeners();
});

// Load all profiles into the select dropdown
async function loadProfiles() {
  const profiles = await StorageHelper.getAllProfiles();
  const profileSelect = document.getElementById('profileSelect');
  
  // Clear existing options except the first one
  profileSelect.innerHTML = '<option value="">-- New Profile --</option>';
  
  // Add profile options
  Object.keys(profiles).forEach(profileName => {
    const option = document.createElement('option');
    option.value = profileName;
    option.textContent = profileName;
    profileSelect.appendChild(option);
  });
}

// Attach event listeners
function attachEventListeners() {
  document.getElementById('autofillBtn').addEventListener('click', autofillPage);
  document.getElementById('detectFieldsBtn').addEventListener('click', detectFields);
  document.getElementById('saveProfileBtn').addEventListener('click', saveProfile);
  document.getElementById('deleteProfileBtn').addEventListener('click', deleteProfile);
  document.getElementById('profileSelect').addEventListener('change', loadSelectedProfile);
}

// Autofill current page
async function autofillPage() {
  const profileName = document.getElementById('profileSelect').value;
  
  if (!profileName) {
    showStatus('Please select a profile to autofill', 'error');
    return;
  }
  
  const profile = await StorageHelper.getProfile(profileName);
  
  if (!profile) {
    showStatus('Profile not found', 'error');
    return;
  }
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    await chrome.tabs.sendMessage(tab.id, {
      action: 'autofill',
      data: profile
    });
    
    showStatus('Autofill initiated! Check the page.', 'success');
  } catch (error) {
    showStatus('Error: ' + error.message, 'error');
  }
}

// Detect fields on current page
async function detectFields() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    const response = await chrome.tabs.sendMessage(tab.id, {
      action: 'detectFields'
    });
    
    if (response && response.fields) {
      showStatus(`Detected ${response.fields.length} input fields`, 'info');
    }
  } catch (error) {
    showStatus('Error detecting fields: ' + error.message, 'error');
  }
}

// Save profile
async function saveProfile() {
  const profileName = document.getElementById('profileName').value.trim();
  
  if (!profileName) {
    showStatus('Please enter a profile name', 'error');
    return;
  }
  
  const data = {};
  document.querySelectorAll('.field-input').forEach(input => {
    const fieldName = input.getAttribute('data-field');
    if (input.value.trim()) {
      data[fieldName] = input.value.trim();
    }
  });
  
  await StorageHelper.saveProfile(profileName, data);
  await loadProfiles();
  
  // Select the newly saved profile
  document.getElementById('profileSelect').value = profileName;
  
  showStatus(`Profile "${profileName}" saved successfully!`, 'success');
}

// Delete profile
async function deleteProfile() {
  const profileName = document.getElementById('profileSelect').value;
  
  if (!profileName) {
    showStatus('Please select a profile to delete', 'error');
    return;
  }
  
  if (!confirm(`Are you sure you want to delete the profile "${profileName}"?`)) {
    return;
  }
  
  await StorageHelper.deleteProfile(profileName);
  await loadProfiles();
  
  // Clear the form
  document.getElementById('profileName').value = '';
  document.querySelectorAll('.field-input').forEach(input => {
    input.value = '';
  });
  
  showStatus(`Profile "${profileName}" deleted successfully!`, 'success');
}

// Load selected profile into form
async function loadSelectedProfile(event) {
  const profileName = event.target.value;
  
  if (!profileName) {
    document.getElementById('profileName').value = '';
    document.querySelectorAll('.field-input').forEach(input => {
      input.value = '';
    });
    return;
  }
  
  const profile = await StorageHelper.getProfile(profileName);
  
  if (profile) {
    document.getElementById('profileName').value = profileName;
    
    document.querySelectorAll('.field-input').forEach(input => {
      const fieldName = input.getAttribute('data-field');
      input.value = profile[fieldName] || '';
    });
    
    showStatus(`Profile "${profileName}" loaded`, 'info');
  }
}

// Show status message
function showStatus(message, type) {
  const statusElement = document.getElementById('statusMessage');
  statusElement.textContent = message;
  statusElement.className = `status-message ${type}`;
  
  setTimeout(() => {
    statusElement.className = 'status-message';
  }, 3000);
}
