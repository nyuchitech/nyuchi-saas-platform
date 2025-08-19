# Installation Guide - Gmail Tabs with AI Extension

## 🚀 Quick Installation

### Method 1: Load Unpacked Extension (Recommended for Development)

1. **Download/Clone the Repository**
   ```bash
   git clone https://github.com/bryanfawcett/Mail-Organizer.git
   cd Mail-Organizer
   ```

2. **Open Chrome Extensions Page**
   - Navigate to `chrome://extensions/` in your Chrome browser
   - Or go to Menu → More Tools → Extensions

3. **Enable Developer Mode**
   - Toggle the "Developer mode" switch in the top-right corner

4. **Load the Extension**
   - Click "Load unpacked" button
   - Navigate to and select the `gmail-tabs-extension` folder
   - The extension should now appear in your extensions list

5. **Verify Installation**
   - Look for "Gmail Tabs with AI Organizer" in your extensions
   - Check that it's enabled (toggle should be blue)
   - You should see the extension icon in your Chrome toolbar

## ✅ Testing the Installation

1. **Open Gmail**
   - Navigate to [https://mail.google.com](https://mail.google.com)
   - Sign in to your Google account if needed

2. **Check for Tabs Interface**
   - You should see new tabs at the top of Gmail
   - Default tabs: Inbox, Important, Work, Personal, AI Suggested
   - Tabs should have icons and email count badges

3. **Test Basic Functionality**
   - Click different tabs to filter emails
   - Hover over the tabs area to see the edit button
   - Click the extension icon in Chrome toolbar for popup

## 🤖 Configure AI Features (Optional)

1. **Open Extension Settings**
   - Click the extension icon in Chrome toolbar
   - Select "Settings" or right-click → "Options"

2. **Go to AI Features Tab**
   - Click on "🤖 AI Features" tab in settings

3. **Choose AI Provider**
   - Select from: OpenAI, Anthropic, Google Gemini, or Custom
   - Get API key from your chosen provider:
     - **OpenAI**: [platform.openai.com](https://platform.openai.com)
     - **Anthropic**: [console.anthropic.com](https://console.anthropic.com)
     - **Google**: [makersuite.google.com](https://makersuite.google.com)

4. **Enter API Key**
   - Paste your API key in the provided field
   - Click "Test Connection" to verify

5. **Enable AI Features**
   - Toggle on desired features:
     - Auto-labeling suggestions
     - Newsletter detection
     - Priority assessment
     - Newsletter summaries
     - Cleanup suggestions

6. **Save Settings**
   - Your settings are automatically saved
   - Return to Gmail to see AI features in action

## 🔧 Customizing Tabs

1. **Add New Tabs**
   - In Gmail, click the "+ Add Tab" button
   - Enter tab name (e.g., "Clients")
   - Enter Gmail label (e.g., "clients")
   - Choose an icon from the dropdown
   - Click "Add Tab"

2. **Edit Existing Tabs**
   - Hover over tabs area to show edit button
   - Click edit button to enter edit mode
   - Drag tabs to reorder them
   - Double-click any tab to edit its details

3. **Delete Tabs**
   - Enter edit mode (edit button)
   - Double-click tab to edit
   - Click "Delete Tab" button
   - Confirm deletion

## 📊 Using Analytics

1. **View Usage Statistics**
   - Open extension settings
   - Go to "📊 Analytics" tab
   - See your tab usage patterns and trends

2. **Export/Import Settings**
   - Go to "💾 Backup & Import" tab
   - Export your settings for backup
   - Import settings to restore or share configuration

## ⚠️ Troubleshooting

### Extension Not Loading
- Make sure you selected the correct folder (`gmail-tabs-extension`)
- Check Chrome console for any error messages
- Try disabling and re-enabling the extension

### Tabs Not Appearing in Gmail
- Refresh the Gmail page (F5 or Ctrl+R)
- Make sure you're on `mail.google.com` (not other Gmail URLs)
- Check if Gmail loaded completely before expecting tabs

### AI Features Not Working
- Verify your API key is correctly entered
- Test the connection in AI settings
- Check if you have sufficient API credits/quota
- Ensure the AI provider service is operational

### Performance Issues
- Disable unused AI features to improve performance
- Increase the refresh interval in general settings
- Clear analytics data if it becomes too large

## 🔄 Updating the Extension

Since this is loaded as an unpacked extension:

1. **Pull Latest Changes**
   ```bash
   cd Mail-Organizer
   git pull origin main
   ```

2. **Reload Extension**
   - Go to `chrome://extensions/`
   - Find "Gmail Tabs with AI Organizer"
   - Click the reload button (🔄)

3. **Verify Update**
   - Check version number in extension details
   - Test new features in Gmail

## 🚫 Uninstalling

1. **Remove Extension**
   - Go to `chrome://extensions/`
   - Find "Gmail Tabs with AI Organizer"
   - Click "Remove" button
   - Confirm removal

2. **Clean Up Data (Optional)**
   - All extension data is automatically removed
   - No additional cleanup needed

## 🔒 Security Notes

- **Local Storage**: All data stored locally in your browser
- **API Keys**: Stored securely in Chrome's extension storage
- **No Data Sharing**: Extension doesn't share your email data
- **Permissions**: Only requests minimum necessary permissions

## 📞 Getting Help

If you encounter issues:

1. **Check Console Logs**
   - Press F12 in Gmail to open developer tools
   - Look for any error messages in the console

2. **Extension Console**
   - Go to `chrome://extensions/`
   - Click "Details" on the extension
   - Click "Inspect views: background page" for logs

3. **Report Issues**
   - Create an issue on the GitHub repository
   - Include error messages and steps to reproduce
   - Specify your Chrome version and OS

## ✨ What's Next?

Once installed and configured:
- Explore all the AI features in Gmail
- Customize tabs to match your workflow
- Check analytics to optimize your email habits
- Share feedback and suggestions for improvements

**Enjoy your enhanced Gmail experience! 🎉**