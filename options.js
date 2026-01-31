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

// Initialize options page
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
  document.getElementById('saveProfileBtn').addEventListener('click', saveProfile);
  document.getElementById('deleteProfileBtn').addEventListener('click', deleteProfile);
  document.getElementById('profileSelect').addEventListener('change', loadSelectedProfile);
  document.getElementById('clearFormBtn').addEventListener('click', clearForm);
  document.getElementById('exportBtn').addEventListener('click', exportProfiles);
  document.getElementById('importBtn').addEventListener('click', () => {
    document.getElementById('importFile').click();
  });
  document.getElementById('importFile').addEventListener('change', importProfiles);
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
    if (fieldName && input.value.trim()) {
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
  clearForm();
  
  showStatus(`Profile "${profileName}" deleted successfully!`, 'success');
}

// Load selected profile into form
async function loadSelectedProfile(event) {
  const profileName = event.target.value;
  
  if (!profileName) {
    clearForm();
    return;
  }
  
  const profile = await StorageHelper.getProfile(profileName);
  
  if (profile) {
    document.getElementById('profileName').value = profileName;
    
    document.querySelectorAll('.field-input').forEach(input => {
      const fieldName = input.getAttribute('data-field');
      if (fieldName) {
        input.value = profile[fieldName] || '';
      }
    });
    
    showStatus(`Profile "${profileName}" loaded`, 'info');
  }
}

// Clear form
function clearForm() {
  document.getElementById('profileName').value = '';
  document.getElementById('profileSelect').value = '';
  document.querySelectorAll('.field-input').forEach(input => {
    input.value = '';
  });
  showStatus('Form cleared', 'info');
}

// Export profiles
async function exportProfiles() {
  const profiles = await StorageHelper.getAllProfiles();
  
  if (Object.keys(profiles).length === 0) {
    showStatus('No profiles to export', 'error');
    return;
  }
  
  const dataStr = JSON.stringify(profiles, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = 'easy-job-application-profiles.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  showStatus('Profiles exported successfully!', 'success');
}

// Import profiles
async function importProfiles(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  try {
    const text = await file.text();
    const importedProfiles = JSON.parse(text);
    
    const existingProfiles = await StorageHelper.getAllProfiles();
    const mergedProfiles = { ...existingProfiles, ...importedProfiles };
    
    await chrome.storage.local.set({ profiles: mergedProfiles });
    await loadProfiles();
    
    const importedCount = Object.keys(importedProfiles).length;
    showStatus(`Imported ${importedCount} profile(s) successfully!`, 'success');
  } catch (error) {
    showStatus('Error importing profiles: Invalid file format', 'error');
  }
  
  // Reset file input
  event.target.value = '';
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
