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
  },

  // Required fields management
  async getRequiredFields() {
    const result = await chrome.storage.local.get('requiredFields');
    return result.requiredFields || [];
  },

  async addRequiredField(field) {
    const fields = await this.getRequiredFields();
    // Check if field already exists (by label or name)
    const exists = fields.some(f => 
      (f.label && f.label === field.label) || 
      (f.name && f.name === field.name) ||
      (f.id && f.id === field.id)
    );
    if (!exists) {
      fields.push({
        ...field,
        addedAt: new Date().toISOString(),
        id: field.id || '',
        name: field.name || '',
        label: field.label || field.placeholder || field.name || field.id || 'Unknown Field',
        type: field.type || 'text',
        hasData: false // Will be updated when checking against profile
      });
      await chrome.storage.local.set({ requiredFields: fields });
    }
    return !exists;
  },

  async removeRequiredField(index) {
    const fields = await this.getRequiredFields();
    fields.splice(index, 1);
    await chrome.storage.local.set({ requiredFields: fields });
  },

  async clearRequiredFields() {
    await chrome.storage.local.set({ requiredFields: [] });
  },

  async updateRequiredFieldStatus(requiredFields, profileData) {
    // Check which required fields have data in the current profile
    return requiredFields.map(field => {
      const fieldLabel = (field.label || '').toLowerCase();
      const fieldName = (field.name || '').toLowerCase();
      const fieldId = (field.id || '').toLowerCase();
      const combinedText = `${fieldLabel} ${fieldName} ${fieldId}`;
      
      // Detect if this is a work experience or education field
      const jobIndex = this.detectJobIndex(combinedText);
      const eduIndex = this.detectEduIndex(combinedText);
      
      // Job field patterns
      const jobFieldMappings = {
        'jobtitle|job_title|position': 'Title',
        'company|employer|empname': 'Company',
        'job.*location|work.*location': 'Location',
        'currently.*work|current.*job': 'Current',
        'start.*month|monthstart': 'StartMonth',
        'start.*year|startyear': 'StartYear',
        'end.*month|monthend': 'EndMonth',
        'end.*year|endyear': 'EndYear',
        'description|responsibilities|roledescription': 'Description',
        'reason.*leaving|reasonforleaving': 'ReasonLeaving'
      };
      
      // Education field patterns
      const eduFieldMappings = {
        'school|university|college|institution': 'School',
        'degree': 'Degree',
        'major|field.*study|edumajor': 'Major',
        'gpa|grade.*point|gradeaverage': 'GPA',
        'grad.*year|gradyear': 'GradYear'
      };
      
      // General field patterns
      const fieldMappings = {
        'firstname|first_name|fname': 'firstName',
        'middlename|middle_name|mname': 'middleName',
        'lastname|last_name|lname|surname': 'lastName',
        'email|e-mail|_eml_': 'email',
        'phone|telephone|mobile|cell': 'phone',
        'address.*line.*1|addressline1|street|address1': 'address',
        'address.*line.*2|addressline2|apt|suite': 'address2',
        'city|town': 'city',
        'state|province': 'state',
        'zip|postal|postcode': 'zipCode',
        'county': 'county',
        'country': 'country',
        'linkedin': 'linkedin',
        'github': 'github',
        'portfolio|website|homepage': 'portfolio',
        'skills|genskills': 'skills',
        'referral|how.*hear': 'referralSource'
      };
      
      let hasData = false;
      
      // Check job fields
      if (jobIndex > 0 || this.isWorkExperienceField(combinedText)) {
        for (const [pattern, suffix] of Object.entries(jobFieldMappings)) {
          if (new RegExp(pattern, 'i').test(combinedText)) {
            for (let i = 1; i <= 3; i++) {
              const fieldName = `job${i}${suffix}`;
              if (profileData[fieldName]) {
                hasData = true;
                break;
              }
            }
          }
          if (hasData) break;
        }
      }
      
      // Check education fields
      if (!hasData && (eduIndex > 0 || this.isEducationField(combinedText))) {
        for (const [pattern, suffix] of Object.entries(eduFieldMappings)) {
          if (new RegExp(pattern, 'i').test(combinedText)) {
            for (let i = 1; i <= 3; i++) {
              const fieldName = `edu${i}${suffix}`;
              if (profileData[fieldName]) {
                hasData = true;
                break;
              }
            }
          }
          if (hasData) break;
        }
      }
      
      // Check general fields
      if (!hasData) {
        for (const [pattern, profileField] of Object.entries(fieldMappings)) {
          if (new RegExp(pattern, 'i').test(combinedText) && profileData[profileField]) {
            hasData = true;
            break;
          }
        }
      }
      
      // Fallback: simple matching
      if (!hasData) {
        for (const [key, value] of Object.entries(profileData)) {
          if (value && (
            fieldLabel.includes(key.toLowerCase()) ||
            fieldName.includes(key.toLowerCase()) ||
            fieldId.includes(key.toLowerCase()) ||
            key.toLowerCase().includes(fieldLabel) ||
            key.toLowerCase().includes(fieldName)
          )) {
            hasData = true;
            break;
          }
        }
      }
      
      return { ...field, hasData };
    });
  },

  // Helper functions for field detection
  detectJobIndex(text) {
    const patterns = [
      /workExperience[\s_-]?(\d+)/i,
      /empname(\d+)/i,
      /jobtitle(\d+)/i,
      /experience[\s_-]?(\d+)/i,
      /employer[\s_-]?(\d+)/i
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const num = parseInt(match[1]);
        if (num >= 30) return 1;
        return num + 1;
      }
    }
    return 0;
  },

  detectEduIndex(text) {
    const patterns = [
      /education[\s_-]?(\d+)/i,
      /edu[\s_-]?(\d+)/i,
      /edumajor(\d+)/i,
      /gpa(\d+)/i,
      /gradyear(\d+)/i
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const num = parseInt(match[1]);
        if (num >= 50) return 1;
        return num + 1;
      }
    }
    return 0;
  },

  isWorkExperienceField(text) {
    return /work[\s_-]?experience|employer|job[\s_-]?title|company[\s_-]?name|empname|jobtitle|responsibilities/i.test(text);
  },

  isEducationField(text) {
    return /education|school|university|college|degree|major|field[\s_-]?of[\s_-]?study|gpa|grad/i.test(text);
  }
};

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  await loadProfiles();
  await loadRequiredFieldsSummary();
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

// Load required fields summary
async function loadRequiredFieldsSummary() {
  const summaryEl = document.getElementById('requiredFieldsSummary');
  const requiredFields = await StorageHelper.getRequiredFields();
  
  if (requiredFields.length === 0) {
    summaryEl.innerHTML = '<p class="no-fields">No required fields tracked yet. Use "Detect Fields" to find and add fields.</p>';
    return;
  }
  
  // Get current profile data to check coverage
  const profileName = document.getElementById('profileSelect')?.value;
  let profileData = {};
  if (profileName) {
    profileData = await StorageHelper.getProfile(profileName) || {};
  }
  
  const fieldsWithStatus = await StorageHelper.updateRequiredFieldStatus(requiredFields, profileData);
  const coveredCount = fieldsWithStatus.filter(f => f.hasData).length;
  const totalCount = fieldsWithStatus.length;
  const coveragePercent = Math.round((coveredCount / totalCount) * 100);
  
  let html = `
    <div class="coverage-bar">
      <div class="coverage-fill" style="width: ${coveragePercent}%"></div>
    </div>
    <div class="coverage-stats">
      <span class="coverage-text">${coveredCount}/${totalCount} fields covered (${coveragePercent}%)</span>
    </div>
    <div class="required-fields-preview">
  `;
  
  // Show first few fields
  const previewFields = fieldsWithStatus.slice(0, 5);
  previewFields.forEach((field, idx) => {
    const statusIcon = field.hasData ? '✅' : '❌';
    html += `
      <div class="required-field-item ${field.hasData ? 'covered' : 'missing'}">
        <span class="status-icon">${statusIcon}</span>
        <span class="field-name">${escapeHtml(field.label)}</span>
        <button class="btn-remove" data-index="${idx}" title="Remove">×</button>
      </div>
    `;
  });
  
  if (fieldsWithStatus.length > 5) {
    html += `<p class="more-fields">+${fieldsWithStatus.length - 5} more fields...</p>`;
  }
  
  html += '</div>';
  summaryEl.innerHTML = html;
  
  // Attach remove listeners
  summaryEl.querySelectorAll('.btn-remove').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const index = parseInt(e.target.dataset.index);
      await StorageHelper.removeRequiredField(index);
      await loadRequiredFieldsSummary();
      showStatus('Field removed from checklist', 'info');
    });
  });
}

// Attach event listeners
function attachEventListeners() {
  document.getElementById('autofillBtn').addEventListener('click', autofillPage);
  document.getElementById('detectFieldsBtn').addEventListener('click', detectFields);
  document.getElementById('saveProfileBtn').addEventListener('click', saveProfile);
  document.getElementById('deleteProfileBtn').addEventListener('click', deleteProfile);
  document.getElementById('profileSelect').addEventListener('change', loadSelectedProfile);
  document.getElementById('openSettingsBtn').addEventListener('click', openSettings);
  document.getElementById('viewRequiredFieldsBtn').addEventListener('click', viewFullChecklist);
  document.getElementById('clearRequiredFieldsBtn').addEventListener('click', clearRequiredFields);
}

// View full checklist in a new tab
function viewFullChecklist() {
  chrome.tabs.create({ url: chrome.runtime.getURL('checklist.html') });
}

// Clear all required fields
async function clearRequiredFields() {
  if (!confirm('Are you sure you want to clear all required fields?')) {
    return;
  }
  await StorageHelper.clearRequiredFields();
  await loadRequiredFieldsSummary();
  showStatus('All required fields cleared', 'success');
}

// Open full settings page
function openSettings() {
  chrome.runtime.openOptionsPage();
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
      displayDetectedFields(response.fields);
      showStatus(`Detected ${response.fields.length} input fields`, 'info');
    }
  } catch (error) {
    showStatus('Error detecting fields: ' + error.message, 'error');
  }
}

// Display detected fields in the popup
function displayDetectedFields(fields) {
  const section = document.getElementById('detectedFieldsSection');
  const list = document.getElementById('detectedFieldsList');
  
  if (fields.length === 0) {
    list.innerHTML = '<p class="no-fields">No input fields detected on this page.</p>';
    section.style.display = 'block';
    return;
  }
  
  let html = '<div class="fields-summary">';
  html += `<span class="field-count">${fields.length} fields found</span>`;
  html += '<button id="addAllFieldsBtn" class="btn btn-small btn-success">➕ Add All</button>';
  html += '</div>';
  
  html += '<div class="fields-table">';
  
  fields.forEach((field, index) => {
    const fieldType = field.type || 'unknown';
    const fieldLabel = field.label || field.placeholder || field.name || field.id || 'No label';
    const fieldId = field.id || '-';
    const fieldName = field.name || '-';
    
    // Determine if it's an input or select
    const isSelect = field.type === 'select-one' || field.type === 'select-multiple';
    const typeIcon = isSelect ? '📃' : '✍️';
    
    // Store field data as JSON for the add button
    const fieldData = JSON.stringify(field).replace(/"/g, '&quot;');
    
    html += `
      <div class="field-item" data-field-index="${index}">
        <div class="field-header">
          <span class="field-icon">${typeIcon}</span>
          <span class="field-label">${escapeHtml(fieldLabel)}</span>
          <span class="field-type-badge ${fieldType}">${fieldType}</span>
          <button class="btn-add-field" data-field='${fieldData}' title="Add to required fields">➕</button>
        </div>
        <div class="field-details">
          <span class="field-detail"><strong>ID:</strong> ${escapeHtml(fieldId)}</span>
          <span class="field-detail"><strong>Name:</strong> ${escapeHtml(fieldName)}</span>
          ${field.placeholder ? `<span class="field-detail"><strong>Placeholder:</strong> ${escapeHtml(field.placeholder)}</span>` : ''}
          ${field.options && field.options.length > 0 ? `<span class="field-detail"><strong>Options:</strong> ${field.options.slice(0, 5).map(o => escapeHtml(o)).join(', ')}${field.options.length > 5 ? '...' : ''}</span>` : ''}
        </div>
      </div>
    `;
  });
  
  html += '</div>';
  
  list.innerHTML = html;
  section.style.display = 'block';
  
  // Attach event listeners for add buttons
  list.querySelectorAll('.btn-add-field').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const fieldData = JSON.parse(e.target.dataset.field);
      const added = await StorageHelper.addRequiredField(fieldData);
      if (added) {
        e.target.textContent = '✓';
        e.target.classList.add('added');
        e.target.disabled = true;
        showStatus(`Added "${fieldData.label || fieldData.name || fieldData.id || 'field'}" to checklist`, 'success');
        await loadRequiredFieldsSummary();
      } else {
        showStatus('Field already in checklist', 'info');
      }
    });
  });
  
  // Add all fields button
  document.getElementById('addAllFieldsBtn')?.addEventListener('click', async () => {
    let addedCount = 0;
    for (const field of fields) {
      const added = await StorageHelper.addRequiredField(field);
      if (added) addedCount++;
    }
    showStatus(`Added ${addedCount} new fields to checklist`, 'success');
    await loadRequiredFieldsSummary();
    
    // Update all add buttons
    list.querySelectorAll('.btn-add-field').forEach(btn => {
      btn.textContent = '✓';
      btn.classList.add('added');
      btn.disabled = true;
    });
  });
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
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
