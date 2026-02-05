// Content script - runs on all pages
console.log('Easy Job Application: Content script loaded');

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'autofill') {
    autofillForm(request.data);
    sendResponse({ success: true });
  } else if (request.action === 'detectFields') {
    const fields = detectFormFields();
    sendResponse({ fields });
  }
  return true;
});

// Helper function to detect job index from field identifiers
function detectJobIndex(text) {
  // Match patterns like workExperience-30, empname0, work_experience_1, job1, etc.
  const patterns = [
    /workExperience[\s_-]?(\d+)/i,
    /empname(\d+)/i,
    /jobtitle(\d+)/i,
    /work[\s_-]?experience[\s_-]?(\d+)/i,
    /job[\s_-]?(\d+)/i,
    /experience[\s_-]?(\d+)/i,
    /employer[\s_-]?(\d+)/i,
    /position[\s_-]?(\d+)/i,
    /monthstartyear-(\d+)/i,
    /monthendyear-(\d+)/i,
    /responsibilities(\d+)/i,
    /reasonforleaving(\d+)/i,
    /chkexprecent(\d+)/i
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const num = parseInt(match[1]);
      // Convert 0-indexed to 1-indexed, treat 30+ as dynamic IDs (use 1)
      if (num >= 30) return 1;
      return num + 1;
    }
  }
  return 0;
}

// Helper function to detect education index from field identifiers
function detectEduIndex(text) {
  // Match patterns like education-52, education_0_0, edu1, etc.
  const patterns = [
    /education[\s_-]?(\d+)/i,
    /edu[\s_-]?(\d+)/i,
    /school[\s_-]?(\d+)/i,
    /edumajor(\d+)/i,
    /gpa(\d+)/i,
    /gradyear(\d+)/i,
    /chkrecent(\d+)/i
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const num = parseInt(match[1]);
      // Convert 0-indexed to 1-indexed, treat 50+ as dynamic IDs (use 1)
      if (num >= 50) return 1;
      return num + 1;
    }
  }
  return 0;
}

// Check if field is part of work experience section
function isWorkExperienceField(text) {
  return /work[\s_-]?experience|employer|job[\s_-]?title|company[\s_-]?name|empname|jobtitle|responsibilities|reason[\s_-]?for[\s_-]?leaving|currently[\s_-]?work/i.test(text);
}

// Check if field is part of education section
function isEducationField(text) {
  return /education|school|university|college|degree|major|field[\s_-]?of[\s_-]?study|gpa|grad|diploma/i.test(text);
}

// Autofill form with saved data
function autofillForm(data) {
  console.log('Autofilling form with data:', data);
  
  // Get all input, textarea, and select elements
  const elements = document.querySelectorAll('input, textarea, select');
  let filledCount = 0;
  
  elements.forEach(element => {
    // Skip hidden, disabled, and readonly elements
    if (element.type === 'hidden' || element.disabled || element.readOnly) {
      return;
    }
    
    // Skip buttons and submit inputs
    if (element.type === 'button' || element.type === 'submit' || element.type === 'reset' || element.type === 'image') {
      return;
    }
    
    // Try to match field by various attributes
    const fieldValue = matchFieldToData(element, data);
    
    if (fieldValue) {
      fillElement(element, fieldValue);
      filledCount++;
    }
  });
  
  console.log(`Filled ${filledCount} fields`);
  
  // Show notification
  showNotification(`Autofilled ${filledCount} fields!`);
}

// Match element to data based on various attributes
function matchFieldToData(element, data) {
  const attributes = [
    element.id,
    element.name,
    element.getAttribute('aria-label'),
    element.placeholder,
    element.className
  ].filter(Boolean).map(s => s.toLowerCase());
  
  // Also check label
  const label = findLabelForElement(element);
  if (label) {
    attributes.push(label.toLowerCase());
  }
  
  const combinedText = attributes.join(' ');
  
  // Detect which work experience or education entry this might be
  // Look for patterns like workExperience-30, education-52, empname0, education_0_0, etc.
  let jobIndex = detectJobIndex(combinedText);
  let eduIndex = detectEduIndex(combinedText);
  
  // Match patterns for each field type
  const fieldPatterns = {
    // Personal info
    firstName: /\b(first[\s_-]?name|fname|given[\s_-]?name|firstname)\b/i,
    middleName: /\b(middle[\s_-]?name|mname|middlename)\b/i,
    lastName: /\b(last[\s_-]?name|lname|surname|family[\s_-]?name|lastname)\b/i,
    fullName: /\b(full[\s_-]?name|your[\s_-]?name)\b/i,
    preferredName: /\b(preferred[\s_-]?name|nick[\s_-]?name)\b/i,
    email: /\b(email|e-mail|_eml_)\b|mail(?!ing)/i,
    phone: /\b(phone[\s_-]?number|telephone|mobile|cell[\s_-]?phone|phoneNumber)\b/i,
    cellPhone: /\b(cell[\s_-]?phone|mobile[\s_-]?phone|cellphone)\b/i,
    homePhone: /\b(home[\s_-]?phone|homephone)\b/i,
    workPhone: /\b(work[\s_-]?phone|workphone|office[\s_-]?phone)\b/i,
    phoneCountryCode: /\b(country[\s_-]?phone[\s_-]?code|phone[\s_-]?code|country[\s_-]?code)\b/i,
    phoneExtension: /\b(phone[\s_-]?extension|extension|ext)\b/i,
    
    // Address
    address: /\b(address[\s_-]?line[\s_-]?1|addressLine1|street[\s_-]?address|address1)\b|address(?![\s_-]?line[\s_-]?2)/i,
    address2: /\b(address[\s_-]?line[\s_-]?2|addressLine2|apt|suite|unit|address2)\b/i,
    city: /\b(city|town)\b/i,
    state: /\b(state|province|region)\b/i,
    zipCode: /\b(zip|postal[\s_-]?code|postcode|postalCode)\b/i,
    county: /\b(county|regionSubdivision)\b/i,
    country: /\b(country)\b/i,
    
    // Online
    linkedin: /\b(linkedin|linked-in)\b/i,
    github: /\b(github|git[\s_-]?hub)\b/i,
    portfolio: /\b(portfolio|website|personal[\s_-]?site|homepage)\b/i,
    twitter: /\b(twitter|x\.com)\b/i,
    
    // General work
    yearsExperience: /\b(years[\s_-]?of[\s_-]?experience|total[\s_-]?experience|yoe)\b/i,
    desiredTitle: /\b(desired[\s_-]?title|target[\s_-]?title)\b/i,
    desiredSalary: /\b(desired[\s_-]?salary|expected[\s_-]?salary|salary[\s_-]?expectation)\b/i,
    noticePeriod: /\b(notice[\s_-]?period|earliest[\s_-]?start|available[\s_-]?date)\b/i,
    
    // Skills
    skills: /\b(skills|technical[\s_-]?skills|genskills)\b/i,
    certifications: /\b(certifications?|certificates?)\b/i,
    languages: /\b(spoken[\s_-]?languages?)\b/i,
    
    // Work auth & demographics
    workAuthorization: /\b(work[\s_-]?authorization|authorized[\s_-]?to[\s_-]?work|employment[\s_-]?eligibility)\b/i,
    requireSponsorship: /\b(sponsor|sponsorship|visa[\s_-]?sponsor)\b/i,
    legallyAuthorized: /\b(legally[\s_-]?authorized|legal[\s_-]?right)\b/i,
    over18: /\b(18[\s_-]?or[\s_-]?older|over[\s_-]?18|age[\s_-]?requirement)\b/i,
    gender: /\b(gender|sex)\b/i,
    veteranStatus: /\b(veteran|military)\b/i,
    disability: /\b(disability|disabled)\b/i,
    ethnicity: /\b(ethnicity|race|ethnic)\b/i,
    
    // Text areas
    coverLetter: /\b(cover[\s_-]?letter|motivation)\b/i,
    summary: /\b(summary|professional[\s_-]?summary|about[\s_-]?you)\b/i,
    whyInterested: /\b(why[\s_-]?interested|why[\s_-]?this|interest[\s_-]?in)\b/i,
    additionalInfo: /\b(additional[\s_-]?info|other[\s_-]?info|comments?)\b/i,
    
    // Referral
    referralSource: /\b(how[\s_-]?did[\s_-]?you[\s_-]?hear|source|referral[\s_-]?source)\b/i,
    referrerName: /\b(referrer[\s_-]?name|referred[\s_-]?by)\b/i,
    referrerEmail: /\b(referrer[\s_-]?email)\b/i
  };
  
  // Job-specific patterns (will be prefixed with job1, job2, job3)
  const jobFieldPatterns = {
    Title: /\b(job[\s_-]?title|jobtitle|position[\s_-]?title)\b/i,
    Company: /\b(company[\s_-]?name|companyName|employer|empname)\b/i,
    Location: /\b(job[\s_-]?location|work[\s_-]?location)\b(?!.*address)/i,
    Current: /\b(currently[\s_-]?work|current[\s_-]?job|currentlyWorkHere)\b/i,
    StartMonth: /\b(start[\s_-]?month|startDate.*month|monthstart)\b/i,
    StartYear: /\b(start[\s_-]?year|startDate.*year|startyear)\b/i,
    EndMonth: /\b(end[\s_-]?month|endDate.*month|monthend)\b/i,
    EndYear: /\b(end[\s_-]?year|endDate.*year|endyear)\b/i,
    Description: /\b(role[\s_-]?description|responsibilities|job[\s_-]?description|roleDescription)\b/i,
    ReasonLeaving: /\b(reason[\s_-]?for[\s_-]?leaving|reasonforleaving|why[\s_-]?leaving)\b/i
  };
  
  // Education-specific patterns (will be prefixed with edu1, edu2, edu3)
  const eduFieldPatterns = {
    School: /\b(school[\s_-]?name|university|college|institution|schoolName|schoolname)\b/i,
    Degree: /\b(degree|degree[\s_-]?type)\b/i,
    Major: /\b(major|field[\s_-]?of[\s_-]?study|fieldOfStudy|edumajor)\b/i,
    GPA: /\b(gpa|grade[\s_-]?point|gradeAverage|overall[\s_-]?result)\b/i,
    GradYear: /\b(graduation[\s_-]?year|grad[\s_-]?year|gradyear)\b/i,
    Location: /\b(school[\s_-]?location|edu[\s_-]?location)\b/i,
    Current: /\b(most[\s_-]?recent[\s_-]?education|current[\s_-]?education|chkrecent)\b/i
  };
  
  // First try job-specific fields
  if (jobIndex > 0 || isWorkExperienceField(combinedText)) {
    const idx = jobIndex || 1;
    for (const [fieldSuffix, pattern] of Object.entries(jobFieldPatterns)) {
      if (pattern.test(combinedText)) {
        const fieldName = `job${idx}${fieldSuffix}`;
        if (data[fieldName]) {
          return data[fieldName];
        }
        // Fallback to job1 if specific job not found
        if (idx > 1 && data[`job1${fieldSuffix}`]) {
          return null; // Don't fill with job1 data for other jobs
        }
      }
    }
  }
  
  // Try education-specific fields
  if (eduIndex > 0 || isEducationField(combinedText)) {
    const idx = eduIndex || 1;
    for (const [fieldSuffix, pattern] of Object.entries(eduFieldPatterns)) {
      if (pattern.test(combinedText)) {
        const fieldName = `edu${idx}${fieldSuffix}`;
        if (data[fieldName]) {
          return data[fieldName];
        }
      }
    }
  }
  
  // Try general patterns
  for (const [fieldName, pattern] of Object.entries(fieldPatterns)) {
    if (pattern.test(combinedText) && data[fieldName]) {
      // Special handling for fullName - only use if firstName/lastName aren't detected separately
      if (fieldName === 'fullName' && (attributes.some(attr => fieldPatterns.firstName.test(attr)) || 
                                        attributes.some(attr => fieldPatterns.lastName.test(attr)))) {
        continue;
      }
      return data[fieldName];
    }
  }
  
  return null;
}

// Find label for an element
function findLabelForElement(element) {
  // Try label with for attribute
  if (element.id) {
    const label = document.querySelector(`label[for="${element.id}"]`);
    if (label) {
      return label.textContent.trim();
    }
  }
  
  // Try parent label
  const parentLabel = element.closest('label');
  if (parentLabel) {
    return parentLabel.textContent.trim();
  }
  
  // Try preceding label
  let prev = element.previousElementSibling;
  while (prev) {
    if (prev.tagName === 'LABEL') {
      return prev.textContent.trim();
    }
    prev = prev.previousElementSibling;
  }
  
  return null;
}

// Fill an element with a value
function fillElement(element, value) {
  if (element.tagName === 'SELECT') {
    // Try to match option by value or text
    for (const option of element.options) {
      if (option.value === value || option.textContent.trim() === value) {
        element.value = option.value;
        break;
      }
    }
  } else if (element.type === 'checkbox') {
    element.checked = value === 'true' || value === true || value === '1';
  } else if (element.type === 'radio') {
    if (element.value === value) {
      element.checked = true;
    }
  } else {
    element.value = value;
  }
  
  // Trigger events to notify the page
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
  
  // Highlight the field briefly
  highlightElement(element);
}

// Highlight element to show it was filled
function highlightElement(element) {
  const originalBackground = element.style.backgroundColor;
  const originalTransition = element.style.transition;
  
  element.style.transition = 'background-color 0.3s ease';
  element.style.backgroundColor = '#86efac';
  
  setTimeout(() => {
    element.style.backgroundColor = originalBackground;
    setTimeout(() => {
      element.style.transition = originalTransition;
    }, 300);
  }, 1000);
}

// Detect all form fields on the page
function detectFormFields() {
  const fields = [];
  const elements = document.querySelectorAll('input, textarea, select');
  
  elements.forEach(element => {
    // Skip hidden and button-type elements
    if (element.type === 'hidden' || element.type === 'button' || 
        element.type === 'submit' || element.type === 'reset' || 
        element.type === 'image') {
      return;
    }
    
    // Skip elements that aren't visible
    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden') {
      return;
    }
    
    const label = findLabelForElement(element);
    
    // Get aria attributes for better context
    const ariaLabel = element.getAttribute('aria-label');
    const ariaDescribedBy = element.getAttribute('aria-describedby');
    let ariaDescription = '';
    if (ariaDescribedBy) {
      const describedByEl = document.getElementById(ariaDescribedBy);
      if (describedByEl) {
        ariaDescription = describedByEl.textContent.trim();
      }
    }
    
    // Build field info object
    const fieldInfo = {
      id: element.id || '',
      name: element.name || '',
      type: element.type || element.tagName.toLowerCase(),
      placeholder: element.placeholder || '',
      label: label || ariaLabel || '',
      ariaLabel: ariaLabel || '',
      ariaDescription: ariaDescription,
      className: element.className || '',
      required: element.required || element.hasAttribute('required'),
      autocomplete: element.getAttribute('autocomplete') || '',
      tagName: element.tagName.toLowerCase()
    };
    
    // For select elements, capture the options
    if (element.tagName === 'SELECT') {
      fieldInfo.options = Array.from(element.options).map(opt => opt.text.trim()).filter(Boolean);
    }
    
    // For inputs with datalist, capture datalist options
    if (element.list) {
      fieldInfo.datalistOptions = Array.from(element.list.options).map(opt => opt.value);
    }
    
    // Get min/max for number inputs
    if (element.type === 'number' || element.type === 'range') {
      fieldInfo.min = element.min;
      fieldInfo.max = element.max;
    }
    
    // Get pattern for text inputs
    if (element.pattern) {
      fieldInfo.pattern = element.pattern;
    }
    
    fields.push(fieldInfo);
  });
  
  console.log('Easy Job Application: Detected fields:', fields);
  return fields;
}

// Show notification on page
let notificationStyleAdded = false;

function showNotification(message) {
  // Remove existing notification
  const existing = document.getElementById('easy-job-app-notification');
  if (existing) {
    existing.remove();
  }
  
  // Add animation style once
  if (!notificationStyleAdded) {
    const style = document.createElement('style');
    style.id = 'easy-job-app-notification-style';
    style.textContent = `
      @keyframes slideIn {
        from {
          transform: translateX(400px);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
    `;
    document.head.appendChild(style);
    notificationStyleAdded = true;
  }
  
  // Create notification
  const notification = document.createElement('div');
  notification.id = 'easy-job-app-notification';
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background-color: #10b981;
    color: white;
    padding: 16px 24px;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    z-index: 10000;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    font-weight: 500;
    animation: slideIn 0.3s ease;
  `;
  
  document.body.appendChild(notification);
  
  // Auto remove after 3 seconds
  setTimeout(() => {
    notification.style.animation = 'slideIn 0.3s ease reverse';
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, 3000);
}
