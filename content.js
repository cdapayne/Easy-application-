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
  
  // Match patterns for each field type
  const fieldPatterns = {
    firstName: /\b(first[\s_-]?name|fname|given[\s_-]?name)\b/i,
    lastName: /\b(last[\s_-]?name|lname|surname|family[\s_-]?name)\b/i,
    fullName: /\b(full[\s_-]?name|your[\s_-]?name)\b/i,
    email: /\b(email|e-mail)\b|mail(?!ing)/i,
    phone: /\b(phone|telephone|mobile|cell)\b/i,
    address: /\baddress\b|street(?!.*city|.*state)/i,
    city: /\b(city|town)\b/i,
    state: /\b(state|province|region)\b/i,
    zipCode: /\b(zip|postal|postcode)\b/i,
    linkedin: /\b(linkedin|linked-in)\b/i,
    portfolio: /\b(portfolio|website|personal[\s_-]?site)\b/i,
    experience: /\b(experience|years|yoe)\b/i,
    coverLetter: /\b(cover[\s_-]?letter|motivation|why[\s_-]?you)\b/i
  };
  
  // Try to match each pattern
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
    if (element.type === 'hidden' || element.type === 'button' || 
        element.type === 'submit' || element.type === 'reset') {
      return;
    }
    
    const label = findLabelForElement(element);
    
    fields.push({
      id: element.id,
      name: element.name,
      type: element.type || element.tagName.toLowerCase(),
      placeholder: element.placeholder,
      label: label,
      className: element.className
    });
  });
  
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
