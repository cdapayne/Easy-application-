# Easy Job Application - Chrome Extension

A Chrome extension that automates job application form filling by saving and reusing your information across different job types.

## Features

- 📝 **Save Multiple Profiles**: Create different profiles for different types of jobs (e.g., Software Engineer, Data Analyst, etc.)
- 🚀 **One-Click Autofill**: Automatically fill job application forms with a single click
- 🎯 **Smart Field Matching**: Intelligently matches saved data to form fields using IDs, names, labels, and placeholders
- 💾 **Local Storage**: All your data is stored locally in your browser - no external servers
- 🔍 **Field Detection**: Detect all fillable fields on any page
- ✨ **Visual Feedback**: Highlights fields as they're filled with smooth animations

## Installation

### From Source (Development)

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" using the toggle in the top right
4. Click "Load unpacked"
5. Select the directory containing this extension
6. The extension icon should appear in your Chrome toolbar

## Usage

### Creating a Profile

1. Click the extension icon in your Chrome toolbar
2. Enter a profile name (e.g., "Software Engineer", "Marketing Manager")
3. Fill in your information in the form fields:
   - Full Name, First Name, Last Name
   - Email, Phone
   - Address, City, State, Zip Code
   - LinkedIn URL, Portfolio URL
   - Years of Experience
   - Cover Letter
4. Click "Save Profile"

### Using Autofill

1. Navigate to a job application page
2. Click the extension icon
3. Select your saved profile from the dropdown
4. Click "Autofill Current Page"
5. Watch as your information is automatically filled in!

### Managing Profiles

- **Load Profile**: Select a profile from the dropdown to edit it
- **Update Profile**: Make changes and click "Save Profile" again
- **Delete Profile**: Select a profile and click "Delete Profile"

### Detecting Fields

Use the "Detect Fields" button to see what fields the extension can detect on the current page. This is useful for understanding what information might be needed.

## Supported Field Types

The extension recognizes and fills these common application fields:

- **Personal Information**: Name (full, first, last), Email, Phone
- **Address**: Street Address, City, State, Zip Code
- **Professional**: LinkedIn, Portfolio/Website URL, Years of Experience
- **Application Materials**: Cover Letter

The extension uses intelligent pattern matching to identify fields even when websites use different naming conventions.

## Privacy & Security

- ✅ All data is stored **locally** in your browser using Chrome's storage API
- ✅ No data is sent to external servers
- ✅ No tracking or analytics
- ✅ Open source - you can review all the code

## Technical Details

### Files Structure

```
Easy-application-/
├── manifest.json       # Extension configuration
├── popup.html         # Extension popup UI
├── popup.css          # Popup styling
├── popup.js           # Popup logic and storage management
├── content.js         # Content script for page interaction
├── background.js      # Background service worker
├── icons/            # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md         # This file
```

### How It Works

1. **Storage**: Uses Chrome's `storage.local` API to save profiles
2. **Content Script**: Injected into all pages to detect and fill form fields
3. **Field Matching**: Uses regex patterns to match field attributes (id, name, label, placeholder) with saved data
4. **Auto-fill**: Triggers native events to ensure compatibility with modern web frameworks

## Browser Compatibility

- Chrome (Manifest V3)
- Edge (Chromium-based)
- Other Chromium-based browsers

## Troubleshooting

### Fields Not Being Filled

- Make sure you've selected a profile before clicking "Autofill"
- Some websites may use non-standard field names - try filling those manually
- Check if the field is visible and not disabled
- Some sites may prevent autofill for security reasons

### Extension Not Working

- Make sure the extension is enabled in `chrome://extensions/`
- Try refreshing the page after installing the extension
- Check the browser console for any errors

## Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest new features
- Submit pull requests

## License

This project is open source and available for personal and commercial use.

## Future Enhancements

Potential features for future versions:
- Import/Export profiles
- Custom field mappings
- Support for file uploads (resume, etc.)
- Multi-page form support
- Field value suggestions
- Integration with job boards