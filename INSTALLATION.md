# Installation Guide

## Quick Start

### 1. Download the Extension

Clone or download this repository to your local machine:

```bash
git clone https://github.com/cdapayne/Easy-application-.git
cd Easy-application-
```

Or download as ZIP and extract it.

### 2. Load Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **"Developer mode"** using the toggle in the top right corner
3. Click **"Load unpacked"** button
4. Select the folder containing this extension (the folder with `manifest.json`)
5. The extension icon should now appear in your Chrome toolbar!

### 3. Create Your First Profile

1. Click the extension icon in your toolbar
2. Enter a profile name (e.g., "Software Engineer", "Marketing Manager")
3. Fill in your information:
   - Name, Email, Phone
   - Address details
   - LinkedIn and Portfolio URLs
   - Years of Experience
   - Cover Letter template
4. Click **"Save Profile"**

### 4. Use Autofill

1. Navigate to any job application page
2. Click the extension icon
3. Select your saved profile from the dropdown
4. Click **"Autofill Current Page"**
5. Watch your information fill in automatically! ✨

## Testing the Extension

A test form is included at `test-form.html`. To test:

1. Open `test-form.html` in Chrome (or serve it via HTTP)
2. Create and save a profile using the extension
3. Click "Autofill Current Page"
4. Verify all fields are filled correctly

## Troubleshooting

### Extension Not Appearing
- Make sure Developer mode is enabled in `chrome://extensions/`
- Check that you selected the correct folder (containing `manifest.json`)
- Try refreshing the extensions page

### Fields Not Being Filled
- Ensure you've selected a profile before clicking "Autofill"
- Refresh the job application page after installing the extension
- Some websites may use non-standard field names
- Check the browser console (F12) for any error messages

### Profile Not Saving
- Check that you entered a profile name
- Fill in at least some of the fields before saving
- Verify the extension has the necessary permissions

## Privacy Note

All your data is stored **locally** in your browser using Chrome's storage API. No information is sent to external servers. Your data never leaves your computer.

## Updating the Extension

If you make changes to the extension code:

1. Go to `chrome://extensions/`
2. Find "Easy Job Application"
3. Click the refresh icon (↻) to reload the extension

## Uninstalling

1. Go to `chrome://extensions/`
2. Find "Easy Job Application"
3. Click **"Remove"**
4. Confirm removal

Your saved profiles will be deleted when you uninstall the extension.

## Support

For issues or questions, please open an issue on the GitHub repository.
