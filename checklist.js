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

  async getRequiredFields() {
    const result = await chrome.storage.local.get('requiredFields');
    return result.requiredFields || [];
  },

  async addRequiredField(field) {
    const fields = await this.getRequiredFields();
    fields.push({
      ...field,
      addedAt: new Date().toISOString(),
      id: field.id || '',
      name: field.name || '',
      label: field.label || 'Custom Field',
      type: field.type || 'text'
    });
    await chrome.storage.local.set({ requiredFields: fields });
  },

  async removeRequiredField(index) {
    const fields = await this.getRequiredFields();
    fields.splice(index, 1);
    await chrome.storage.local.set({ requiredFields: fields });
  },

  async clearRequiredFields() {
    await chrome.storage.local.set({ requiredFields: [] });
  }
};

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
  await loadProfiles();
  await loadChecklist();
  attachEventListeners();
});

// Load profiles into dropdown
async function loadProfiles() {
  const profiles = await StorageHelper.getAllProfiles();
  const profileSelect = document.getElementById('profileSelect');
  
  profileSelect.innerHTML = '<option value="">-- No Profile --</option>';
  
  Object.keys(profiles).forEach(profileName => {
    const option = document.createElement('option');
    option.value = profileName;
    option.textContent = profileName;
    profileSelect.appendChild(option);
  });
}

// Load and display checklist
async function loadChecklist() {
  const requiredFields = await StorageHelper.getRequiredFields();
  const profileName = document.getElementById('profileSelect').value;
  
  let profileData = {};
  if (profileName) {
    profileData = await StorageHelper.getProfile(profileName) || {};
  }
  
  // Categorize fields
  const coveredFields = [];
  const missingFields = [];
  
  requiredFields.forEach((field, index) => {
    const fieldWithIndex = { ...field, originalIndex: index };
    const hasCoverage = checkFieldCoverage(field, profileData);
    
    if (hasCoverage) {
      coveredFields.push(fieldWithIndex);
    } else {
      missingFields.push(fieldWithIndex);
    }
  });
  
  // Update stats
  const total = requiredFields.length;
  const covered = coveredFields.length;
  const missing = missingFields.length;
  const percent = total > 0 ? Math.round((covered / total) * 100) : 0;
  
  document.getElementById('totalFields').textContent = total;
  document.getElementById('coveredFields').textContent = covered;
  document.getElementById('missingFields').textContent = missing;
  document.getElementById('coveragePercent').textContent = `${percent}%`;
  document.getElementById('missingCount').textContent = `(${missing})`;
  document.getElementById('coveredCount').textContent = `(${covered})`;
  
  // Render lists
  renderFieldsList('missingFieldsList', missingFields, 'missing');
  renderFieldsList('coveredFieldsList', coveredFields, 'covered');
}

// Check if a field has coverage in the profile
function checkFieldCoverage(field, profileData) {
  if (!profileData || Object.keys(profileData).length === 0) {
    return false;
  }
  
  const fieldLabel = (field.label || '').toLowerCase();
  const fieldName = (field.name || '').toLowerCase();
  const fieldId = (field.id || '').toLowerCase();
  const combinedText = `${fieldLabel} ${fieldName} ${fieldId}`;
  
  // Detect if this is a work experience or education field
  const jobIndex = detectJobIndex(combinedText);
  const eduIndex = detectEduIndex(combinedText);
  
  // Field patterns to match
  const fieldMappings = {
    // Personal
    'firstname|first_name|fname': 'firstName',
    'middlename|middle_name|mname': 'middleName',
    'lastname|last_name|lname|surname': 'lastName',
    'email|e-mail|_eml_': 'email',
    'phone|telephone|mobile|cell': 'phone',
    'cellphone|cell_phone': 'cellPhone',
    'homephone|home_phone': 'homePhone',
    'workphone|work_phone': 'workPhone',
    'country.*code|phone.*code': 'phoneCountryCode',
    'extension|ext': 'phoneExtension',
    
    // Address
    'address.*line.*1|addressline1|street|address1': 'address',
    'address.*line.*2|addressline2|apt|suite': 'address2',
    'city|town': 'city',
    'state|province': 'state',
    'zip|postal|postcode': 'zipCode',
    'county|regionsubdivision': 'county',
    'country': 'country',
    
    // Online
    'linkedin': 'linkedin',
    'github': 'github',
    'portfolio|website|homepage': 'portfolio',
    
    // Skills
    'skills|genskills': 'skills',
    'certification': 'certifications',
    
    // Demographics
    'gender|sex': 'gender',
    'veteran|military': 'veteranStatus',
    'disability|disabled': 'disability',
    'ethnicity|race': 'ethnicity',
    'sponsor': 'requireSponsorship',
    'authorization|authorized': 'workAuthorization',
    
    // Referral
    'how.*hear|source|referral': 'referralSource'
  };
  
  // Job field mappings
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
  
  // Education field mappings
  const eduFieldMappings = {
    'school|university|college|institution': 'School',
    'degree': 'Degree',
    'major|field.*study|edumajor': 'Major',
    'gpa|grade.*point|gradeaverage': 'GPA',
    'grad.*year|gradyear': 'GradYear'
  };
  
  // Check job fields
  if (jobIndex > 0 || isWorkExperienceField(combinedText)) {
    const idx = jobIndex || 1;
    for (const [pattern, suffix] of Object.entries(jobFieldMappings)) {
      if (new RegExp(pattern, 'i').test(combinedText)) {
        // Check all 3 job slots
        for (let i = 1; i <= 3; i++) {
          const fieldName = `job${i}${suffix}`;
          if (profileData[fieldName]) {
            return true;
          }
        }
      }
    }
  }
  
  // Check education fields
  if (eduIndex > 0 || isEducationField(combinedText)) {
    const idx = eduIndex || 1;
    for (const [pattern, suffix] of Object.entries(eduFieldMappings)) {
      if (new RegExp(pattern, 'i').test(combinedText)) {
        // Check all 3 education slots
        for (let i = 1; i <= 3; i++) {
          const fieldName = `edu${i}${suffix}`;
          if (profileData[fieldName]) {
            return true;
          }
        }
      }
    }
  }
  
  // Check general fields
  for (const [pattern, profileField] of Object.entries(fieldMappings)) {
    if (new RegExp(pattern, 'i').test(combinedText)) {
      if (profileData[profileField]) {
        return true;
      }
    }
  }
  
  // Fallback: simple matching
  for (const [key, value] of Object.entries(profileData)) {
    if (value && (
      fieldLabel.includes(key.toLowerCase()) ||
      fieldName.includes(key.toLowerCase()) ||
      fieldId.includes(key.toLowerCase()) ||
      key.toLowerCase().includes(fieldLabel.split(' ')[0]) ||
      key.toLowerCase().includes(fieldName.split('_')[0])
    )) {
      return true;
    }
  }
  
  return false;
}

// Helper functions for detecting field types
function detectJobIndex(text) {
  const patterns = [
    /workExperience[\s_-]?(\d+)/i,
    /empname(\d+)/i,
    /jobtitle(\d+)/i,
    /experience[\s_-]?(\d+)/i,
    /employer[\s_-]?(\d+)/i,
    /monthstartyear-(\d+)/i,
    /responsibilities(\d+)/i
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
}

function detectEduIndex(text) {
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
}

function isWorkExperienceField(text) {
  return /work[\s_-]?experience|employer|job[\s_-]?title|company[\s_-]?name|empname|jobtitle|responsibilities|reason[\s_-]?for[\s_-]?leaving/i.test(text);
}

function isEducationField(text) {
  return /education|school|university|college|degree|major|field[\s_-]?of[\s_-]?study|gpa|grad/i.test(text);
}

// Render fields list
function renderFieldsList(containerId, fields, type) {
  const container = document.getElementById(containerId);
  
  if (fields.length === 0) {
    container.innerHTML = `<div class="empty-state">No ${type} fields</div>`;
    return;
  }
  
  let html = '';
  fields.forEach(field => {
    const statusIcon = type === 'covered' ? '✅' : '❌';
    const addedDate = field.addedAt ? new Date(field.addedAt).toLocaleDateString() : 'Unknown';
    
    html += `
      <div class="field-card ${type}">
        <span class="field-status">${statusIcon}</span>
        <div class="field-info">
          <div class="field-label">${escapeHtml(field.label)}</div>
          <div class="field-meta">
            ${field.name ? `Name: ${escapeHtml(field.name)} • ` : ''}
            ${field.id ? `ID: ${escapeHtml(field.id)} • ` : ''}
            Added: ${addedDate}
          </div>
        </div>
        <span class="field-type-badge">${field.type}</span>
        <button class="btn-remove" data-index="${field.originalIndex}" title="Remove field">×</button>
      </div>
    `;
  });
  
  container.innerHTML = html;
  
  // Attach remove listeners
  container.querySelectorAll('.btn-remove').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const index = parseInt(e.target.dataset.index);
      await StorageHelper.removeRequiredField(index);
      await loadChecklist();
      showStatus('Field removed', 'success');
    });
  });
}

// Escape HTML
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Attach event listeners
function attachEventListeners() {
  document.getElementById('profileSelect').addEventListener('change', loadChecklist);
  document.getElementById('exportChecklistBtn').addEventListener('click', exportChecklist);
  document.getElementById('clearAllBtn').addEventListener('click', clearAll);
  document.getElementById('addCustomFieldBtn').addEventListener('click', addCustomField);
}

// Export checklist
async function exportChecklist() {
  const requiredFields = await StorageHelper.getRequiredFields();
  
  if (requiredFields.length === 0) {
    showStatus('No fields to export', 'error');
    return;
  }
  
  const exportData = {
    exportedAt: new Date().toISOString(),
    totalFields: requiredFields.length,
    fields: requiredFields.map(f => ({
      label: f.label,
      name: f.name,
      id: f.id,
      type: f.type,
      options: f.options || []
    }))
  };
  
  const dataStr = JSON.stringify(exportData, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = 'job-application-checklist.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  showStatus('Checklist exported!', 'success');
}

// Clear all fields
async function clearAll() {
  if (!confirm('Are you sure you want to clear all required fields? This cannot be undone.')) {
    return;
  }
  
  await StorageHelper.clearRequiredFields();
  await loadChecklist();
  showStatus('All fields cleared', 'success');
}

// Add custom field
async function addCustomField() {
  const labelInput = document.getElementById('customFieldLabel');
  const typeSelect = document.getElementById('customFieldType');
  
  const label = labelInput.value.trim();
  if (!label) {
    showStatus('Please enter a field name', 'error');
    return;
  }
  
  await StorageHelper.addRequiredField({
    label: label,
    type: typeSelect.value,
    name: label.toLowerCase().replace(/\s+/g, '_'),
    id: '',
    isCustom: true
  });
  
  labelInput.value = '';
  await loadChecklist();
  showStatus(`Added "${label}" to checklist`, 'success');
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
