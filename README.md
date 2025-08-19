# Gmail Tabs with AI Extension

A powerful Chrome extension that enhances Gmail with intelligent tabbed organization and AI-powered email management features.

## 🚀 Features

### 📁 Smart Tab Organization
- **Custom Tabs**: Create personalized tabs for different email categories
- **Drag & Drop**: Reorder tabs with intuitive drag-and-drop interface
- **Visual Indicators**: Beautiful icons and email count badges
- **Quick Navigation**: One-click filtering of emails by labels

### 🤖 AI-Powered Intelligence
- **Auto-Labeling**: Intelligent email labeling based on content analysis
- **Newsletter Detection**: Automatic identification of newsletters and promotional emails
- **Priority Assessment**: AI-driven email priority classification
- **Smart Summaries**: Generate concise summaries of newsletter content
- **Cleanup Suggestions**: AI recommendations for email organization

### 📊 Analytics & Insights
- **Usage Tracking**: Monitor tab usage patterns and email habits
- **Weekly Trends**: Visualize email activity over time
- **Popular Tabs**: Identify most-used email categories
- **Export Data**: Backup and share your usage analytics

### ⚡ Quick Actions
- **One-Click Summaries**: Generate newsletter summaries instantly
- **Batch Cleanup**: Run AI-powered cleanup analysis
- **Tab Management**: Quick access to tab configuration
- **Gmail Integration**: Seamless integration with Gmail's interface

## 🛠 Installation

### Manual Installation (Developer Mode)

1. **Download the Extension**
   ```bash
   git clone https://github.com/your-username/Mail-Organizer.git
   cd Mail-Organizer/gmail-tabs-extension
   ```

2. **Enable Developer Mode**
   - Open Chrome and navigate to `chrome://extensions/`
   - Toggle "Developer mode" in the top right corner

3. **Load the Extension**
   - Click "Load unpacked"
   - Select the `gmail-tabs-extension` folder
   - The extension will appear in your extensions list

4. **Verify Installation**
   - Navigate to [Gmail](https://mail.google.com)
   - You should see the new tabs interface at the top of the page

## 🤖 AI Configuration

### Supported AI Providers

1. **OpenAI (GPT-3.5/4)**
   - Get API key: [platform.openai.com](https://platform.openai.com)
   - Models: gpt-3.5-turbo, gpt-4

2. **Anthropic (Claude)**
   - Get API key: [console.anthropic.com](https://console.anthropic.com)
   - Models: claude-3-haiku, claude-3-sonnet

3. **Google (Gemini)**
   - Get API key: [makersuite.google.com](https://makersuite.google.com)
   - Models: gemini-pro

4. **Custom Endpoint**
   - Use your own OpenAI-compatible API
   - Must support `/v1/chat/completions` format

### Setup Instructions

1. **Open Extension Settings**
   - Click the extension icon in Chrome toolbar
   - Select "Settings" or right-click extension → "Options"

2. **Configure AI Provider**
   - Go to "AI Features" tab
   - Select your preferred AI provider
   - Enter your API key
   - Test the connection

3. **Enable Features**
   - Toggle desired AI features on/off
   - Customize auto-labeling rules
   - Adjust AI parameters (tokens, temperature)

4. **Save and Test**
   - Save settings
   - Open Gmail to see AI features in action

## 📋 Usage Guide

### Basic Tab Management

1. **Adding Tabs**
   - Click "+ Add Tab" button in Gmail
   - Enter tab name and Gmail label
   - Choose an icon
   - Save your new tab

2. **Editing Tabs**
   - Hover over tabs area to show edit button
   - Click edit button to enter edit mode
   - Drag tabs to reorder
   - Double-click tabs to edit details

3. **Using Tabs**
   - Click any tab to filter emails
   - Tab counts update automatically
   - Active tab is highlighted in blue

### AI Features

1. **Auto-Labeling**
   - AI analyzes incoming emails
   - Suggests appropriate labels
   - Click suggestions to apply labels

2. **Newsletter Detection**
   - Newsletters are automatically identified
   - Special icon appears on newsletter emails
   - Use "AI Summary" to generate overviews

3. **Priority Assessment**
   - High-priority emails get red indicators
   - Medium-priority emails get yellow indicators
   - Helps focus on important communications

4. **Cleanup Analysis**
   - Click "Analyze & Cleanup" in popup
   - AI suggests emails to archive/delete
   - Recommendations for better organization

## ⚙️ Configuration Options

### General Settings
- **Theme**: Light, Dark, or Auto
- **Animations**: Enable/disable UI animations
- **Notifications**: Control extension notifications
- **Auto-refresh**: Automatic email count updates
- **Refresh Interval**: How often to update counts

### AI Settings
- **Provider Selection**: Choose your AI service
- **API Configuration**: Set up authentication
- **Feature Toggles**: Enable/disable specific AI features
- **Custom Rules**: Define your labeling preferences
- **Advanced Parameters**: Control AI behavior

### Tab Management
- **Default Tabs**: Reset to original configuration
- **Import/Export**: Backup and restore tab settings
- **Usage Analytics**: Track and analyze tab usage
- **Auto-reorder**: Sort tabs by usage frequency

## 🔧 Development

### Project Structure
```
gmail-tabs-extension/
├── manifest.json          # Extension configuration
├── content.js             # Main Gmail integration
├── ai-service.js          # AI functionality
├── background.js          # Service worker
├── popup.html/js          # Extension popup
├── options.html/js        # Settings page
├── styles.css             # UI styling
└── welcome.html           # Welcome page
```

### Key Components

1. **Content Script** (`content.js`)
   - Injects tabs interface into Gmail
   - Handles tab interactions and filtering
   - Manages AI feature integration

2. **AI Service** (`ai-service.js`)
   - Handles all AI provider communications
   - Processes email content for analysis
   - Provides intelligent suggestions

3. **Background Worker** (`background.js`)
   - Manages extension lifecycle
   - Handles cross-tab communication
   - Stores analytics and settings

4. **User Interface**
   - **Popup**: Quick actions and status
   - **Options**: Comprehensive settings
   - **Welcome**: Onboarding experience

### Building from Source

1. **Prerequisites**
   ```bash
   # No build process required - pure JavaScript
   # Just ensure all files are in place
   ```

2. **Testing**
   ```bash
   # Load extension in developer mode
   # Test in Gmail at mail.google.com
   # Check console for any errors
   ```

3. **Packaging**
   ```bash
   # Zip the gmail-tabs-extension folder
   zip -r gmail-tabs-ai-extension.zip gmail-tabs-extension/
   ```

## 🚨 Troubleshooting

### Common Issues

1. **Tabs Not Appearing**
   - Refresh Gmail page
   - Check if extension is enabled
   - Verify Chrome permissions

2. **AI Features Not Working**
   - Verify API key is correctly entered
   - Test connection in settings
   - Check console for error messages

3. **Performance Issues**
   - Disable unused AI features
   - Reduce refresh interval
   - Clear analytics data

4. **Gmail Updates Breaking Extension**
   - Gmail interface changes may affect functionality
   - Check for extension updates
   - Report issues on GitHub

### Debug Mode

Enable debug logging:
```javascript
// In browser console
localStorage.setItem('gmailTabsDebug', 'true');
```

### Reset Extension

Complete reset:
1. Open `chrome://extensions/`
2. Remove Gmail Tabs extension
3. Clear extension data: `chrome://settings/content/all`
4. Reinstall extension

## 🔒 Privacy & Security

### Data Storage
- **Local Only**: All data stored locally in browser
- **No Cloud Sync**: Settings don't sync across devices
- **API Keys**: Stored securely in Chrome storage
- **Analytics**: Usage data never leaves your browser

### Permissions
- **Gmail Access**: Required for tab functionality
- **Storage**: Settings and analytics storage
- **No Network**: Only AI API calls when configured

### AI Privacy
- **API Calls**: Only when AI features enabled
- **Email Content**: Processed only for analysis
- **No Retention**: AI providers may have their own policies
- **Optional**: All AI features can be disabled

## 📈 Roadmap

### Version 2.1 (Next Release)
- [ ] Gmail API integration for better email counts
- [ ] Smart filters based on AI analysis
- [ ] Bulk email operations
- [ ] Enhanced mobile support

### Version 2.2 (Future)
- [ ] Multiple AI provider support simultaneously
- [ ] Advanced email rules engine
- [ ] Integration with Google Workspace
- [ ] Team collaboration features

### Version 3.0 (Long-term)
- [ ] Support for other email clients
- [ ] Advanced analytics dashboard
- [ ] Machine learning model training
- [ ] Enterprise features

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. **Fork the Repository**
   ```bash
   git fork https://github.com/your-username/Mail-Organizer.git
   ```

2. **Create Feature Branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```

3. **Make Changes**
   - Follow existing code style
   - Add comments for complex logic
   - Test thoroughly in Gmail

4. **Submit Pull Request**
   - Describe your changes
   - Include screenshots if UI changes
   - Reference any related issues

### Development Guidelines
- Use ES6+ JavaScript features
- Follow Chrome extension best practices
- Maintain compatibility with latest Gmail
- Write clear, documented code
- Test AI features with multiple providers

## 📄 License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Gmail team for the excellent email platform
- AI providers (OpenAI, Anthropic, Google) for powerful APIs
- Chrome extensions team for the development platform
- Open source community for inspiration and tools

## 📞 Support

- **GitHub Issues**: [Report bugs or request features](https://github.com/your-username/Mail-Organizer/issues)
- **Documentation**: Check this README and welcome page
- **AI Provider Support**: Contact your AI provider for API issues

---

**Made with ❤️ for better email organization**

*Gmail Tabs with AI Extension v2.0.0*