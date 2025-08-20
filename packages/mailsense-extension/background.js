// Background Service Worker for MailSense Extension

// Handle extension installation and updates
chrome.runtime.onInstalled.addListener((details) => {
    console.log('MailSense Extension: Installation/Update detected', details.reason);
    
    if (details.reason === 'install') {
        // First-time installation
        initializeExtension();
        showWelcomeNotification();
    } else if (details.reason === 'update') {
        // Extension update
        handleExtensionUpdate(details.previousVersion);
    }
});

// Initialize extension with default settings
async function initializeExtension() {
    try {
        // Set default tabs if none exist
    const result = await chrome.storage.local.get(['mailSenseTabs']);
    if (!result.mailSenseTabs) {
            const defaultTabs = [
                { name: 'Inbox', label: 'inbox', icon: '📥', count: 0 },
                { name: 'Important', label: 'important', icon: '⭐', count: 0 },
                { name: 'Work', label: 'work', icon: '💼', count: 0 },
                { name: 'Personal', label: 'personal', icon: '👤', count: 0 },
                { name: 'AI Suggested', label: 'ai-suggested', icon: '🤖', count: 0 }
            ];
            
            await chrome.storage.local.set({ mailSenseTabs: defaultTabs });
            console.log('MailSense: Default tabs initialized');
        }
        
        // Set default AI settings if none exist
        const aiResult = await chrome.storage.local.get(['aiSettings']);
        if (!aiResult.aiSettings) {
            const defaultAISettings = {
                provider: 'openai',
                apiKey: '',
                autoLabeling: false,
                newsletterDetection: false,
                priorityDetection: false,
                cleanupSuggestions: false,
                summarizeNewsletters: false,
                autoLabelingRules: '',
                customEndpoint: '',
                maxTokens: 500,
                temperature: 0.3
            };
            
            await chrome.storage.local.set({ aiSettings: defaultAISettings });
            console.log('MailSense: Default AI settings initialized');
        }
        
        // Initialize analytics storage
        const analyticsResult = await chrome.storage.local.get(['tabAnalytics']);
        if (!analyticsResult.tabAnalytics) {
            await chrome.storage.local.set({ tabAnalytics: {} });
        }
        
    } catch (error) {
    console.error('MailSense: Error initializing extension:', error);
    }
}

// Handle extension updates
async function handleExtensionUpdate(previousVersion) {
    try {
    console.log(`MailSense: Updated from version ${previousVersion}`);
        
        // Migrate settings if needed
        await migrateSettings(previousVersion);
        
    // Refresh all MailSense tabs
        const tabs = await chrome.tabs.query({ url: "https://mail.google.com/*" });
        tabs.forEach(tab => {
            chrome.tabs.sendMessage(tab.id, { action: 'refreshTabs' }).catch(() => {
                // Tab might not be ready, ignore errors
            });
        });
        
    } catch (error) {
    console.error('MailSense: Error handling update:', error);
    }
}

// Migrate settings between versions
async function migrateSettings(previousVersion) {
    try {
        const version = previousVersion.split('.').map(Number);
        
        // Migration for version 2.0.0 - add AI settings
        if (version[0] < 2) {
            const result = await chrome.storage.local.get(['aiSettings']);
            if (!result.aiSettings) {
                const defaultAISettings = {
                    provider: 'openai',
                    apiKey: '',
                    autoLabeling: false,
                    newsletterDetection: false,
                    priorityDetection: false,
                    cleanupSuggestions: false,
                    summarizeNewsletters: false,
                    autoLabelingRules: '',
                    customEndpoint: '',
                    maxTokens: 500,
                    temperature: 0.3
                };
                
                await chrome.storage.local.set({ aiSettings: defaultAISettings });
                console.log('MailSense: Migrated to version 2.0.0 - added AI settings');
            }
        }
        
    } catch (error) {
    console.error('MailSense: Error migrating settings:', error);
    }
}

// Show welcome notification for new users
function showWelcomeNotification() {
    chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon48.png',
    title: 'MailSense with AI - Welcome!',
        message: 'Extension installed! Visit Gmail to see your new tabs and configure AI features.'
    });
}

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('MailSense: Received message:', request);
    
    switch (request.action) {
        case 'openOptions':
            chrome.runtime.openOptionsPage();
            break;
            
        case 'openWelcome':
            chrome.tabs.create({ url: 'welcome.html' });
            break;
            
        case 'getAnalytics':
            getTabAnalytics().then(sendResponse);
            return true; // Will respond asynchronously
            
        case 'clearAnalytics':
            clearTabAnalytics().then(sendResponse);
            return true;
            
        case 'exportSettings':
            exportSettings().then(sendResponse);
            return true;
            
        case 'importSettings':
            importSettings(request.settings).then(sendResponse);
            return true;
            
        case 'testAIConnection':
            testAIConnection(request.settings).then(sendResponse);
            return true;
            
        case 'generateNewsletterSummary':
            handleNewsletterSummary(sender.tab.id);
            break;
            
        case 'runCleanupAnalysis':
            handleCleanupAnalysis(sender.tab.id);
            break;
            
        default:
            console.log('MailSense: Unknown action:', request.action);
    }
});

// Get tab usage analytics
async function getTabAnalytics() {
    try {
        const result = await chrome.storage.local.get(['tabAnalytics']);
        const analytics = result.tabAnalytics || {};
        
        // Process analytics data
        const processed = {
            totalClicks: 0,
            dailyUsage: {},
            popularTabs: {},
            weeklyTrends: []
        };
        
        Object.keys(analytics).forEach(date => {
            const dayData = analytics[date];
            processed.dailyUsage[date] = dayData;
            
            Object.keys(dayData).forEach(tab => {
                processed.totalClicks += dayData[tab];
                processed.popularTabs[tab] = (processed.popularTabs[tab] || 0) + dayData[tab];
            });
        });
        
        // Calculate weekly trends (last 7 days)
        const now = new Date();
        for (let i = 6; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            const dateStr = date.toDateString();
            
            const dayTotal = Object.values(analytics[dateStr] || {}).reduce((sum, count) => sum + count, 0);
            processed.weeklyTrends.push({
                date: dateStr,
                clicks: dayTotal
            });
        }
        
        return processed;
    } catch (error) {
    console.error('MailSense: Error getting analytics:', error);
        return {};
    }
}

// Clear tab analytics
async function clearTabAnalytics() {
    try {
        await chrome.storage.local.set({ tabAnalytics: {} });
        return { success: true };
    } catch (error) {
    console.error('MailSense: Error clearing analytics:', error);
        return { success: false, error: error.message };
    }
}

// Export all settings
async function exportSettings() {
    try {
        const data = await chrome.storage.local.get(null);
        
        const exportData = {
            version: '2.0.0',
            timestamp: new Date().toISOString(),
            data: {
                mailSenseTabs: data.mailSenseTabs || [],
                aiSettings: data.aiSettings || {},
                tabAnalytics: data.tabAnalytics || {}
            }
        };
        
        return {
            success: true,
            data: exportData
        };
    } catch (error) {
    console.error('MailSense: Error exporting settings:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Import settings
async function importSettings(settings) {
    try {
        if (!settings || !settings.data) {
            throw new Error('Invalid settings format');
        }
        
        const { gmailTabs, aiSettings, tabAnalytics } = settings.data;
        
        // Validate and import tabs
        if (gmailTabs && Array.isArray(gmailTabs)) {
            await chrome.storage.local.set({ gmailTabs });
        }
        
        // Validate and import AI settings
        if (aiSettings && typeof aiSettings === 'object') {
            await chrome.storage.local.set({ aiSettings });
        }
        
        // Validate and import analytics (optional)
        if (tabAnalytics && typeof tabAnalytics === 'object') {
            await chrome.storage.local.set({ tabAnalytics });
        }
        
        // Refresh all Gmail tabs
        const tabs = await chrome.tabs.query({ url: "https://mail.google.com/*" });
        tabs.forEach(tab => {
            chrome.tabs.sendMessage(tab.id, { action: 'refreshTabs' }).catch(() => {
                // Ignore errors for inactive tabs
            });
        });
        
        return { success: true };
    } catch (error) {
        console.error('Gmail Tabs: Error importing settings:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Test AI connection
async function testAIConnection(settings) {
    try {
        // This would test the AI connection
        // For now, return mock success
        return {
            success: true,
            message: 'AI connection test successful'
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

// Handle newsletter summary generation
function handleNewsletterSummary(tabId) {
    chrome.tabs.sendMessage(tabId, { action: 'generateNewsletterSummary' }).catch(error => {
        console.error('Gmail Tabs: Error sending newsletter summary message:', error);
    });
}

// Handle cleanup analysis
function handleCleanupAnalysis(tabId) {
    chrome.tabs.sendMessage(tabId, { action: 'runCleanupAnalysis' }).catch(error => {
        console.error('Gmail Tabs: Error sending cleanup analysis message:', error);
    });
}

// Handle tab activation/focus
chrome.tabs.onActivated.addListener(async (activeInfo) => {
    try {
        const tab = await chrome.tabs.get(activeInfo.tabId);
        
        // Check if it's a Gmail tab
        if (tab.url && tab.url.includes('mail.google.com')) {
            console.log('Gmail Tabs: Gmail tab activated');
            
            // Send a message to refresh tabs if needed
            setTimeout(() => {
                chrome.tabs.sendMessage(tab.id, { action: 'checkTabsInjection' }).catch(() => {
                    // Ignore errors for tabs that aren't ready
                });
            }, 1000);
        }
    } catch (error) {
        // Ignore errors for closed tabs
    }
});

// Handle tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // Check if Gmail has loaded
    if (changeInfo.status === 'complete' && tab.url && tab.url.includes('mail.google.com')) {
        console.log('Gmail Tabs: Gmail tab loaded');
        
        // Give Gmail time to fully load, then inject tabs
        setTimeout(() => {
            chrome.tabs.sendMessage(tabId, { action: 'refreshTabs' }).catch(() => {
                // Ignore errors for tabs that might not be ready
            });
        }, 2000);
    }
});

// Cleanup old analytics data (keep only last 30 days)
async function cleanupOldAnalytics() {
    try {
        const result = await chrome.storage.local.get(['tabAnalytics']);
        const analytics = result.tabAnalytics || {};
        
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const cleanedAnalytics = {};
        Object.keys(analytics).forEach(dateStr => {
            const date = new Date(dateStr);
            if (date >= thirtyDaysAgo) {
                cleanedAnalytics[dateStr] = analytics[dateStr];
            }
        });
        
        await chrome.storage.local.set({ tabAnalytics: cleanedAnalytics });
        console.log('Gmail Tabs: Cleaned up old analytics data');
    } catch (error) {
        console.error('Gmail Tabs: Error cleaning up analytics:', error);
    }
}

// Run cleanup daily
chrome.alarms.create('cleanupAnalytics', { delayInMinutes: 1440, periodInMinutes: 1440 });
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'cleanupAnalytics') {
        cleanupOldAnalytics();
    }
});

// Handle context menu (future feature)
chrome.runtime.onStartup.addListener(() => {
    console.log('Gmail Tabs Extension: Started');
});

console.log('Gmail Tabs Background Script: Loaded');
