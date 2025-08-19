// Popup JavaScript for Gmail Tabs Extension

document.addEventListener('DOMContentLoaded', function() {
    initializePopup();
});

async function initializePopup() {
    await loadAIStatus();
    await loadQuickStats();
    await loadQuickTabs();
    attachEventListeners();
}

// Load AI status and features
async function loadAIStatus() {
    try {
        const data = await chrome.storage.local.get(['aiSettings']);
        const aiSettings = data.aiSettings || {};
        
        const statusElement = document.getElementById('aiStatus');
        const featuresContainer = document.getElementById('aiFeatures');
        
        if (aiSettings.provider && aiSettings.apiKey) {
            statusElement.className = 'status connected';
            statusElement.innerHTML = `
                <span>✅</span>
                <span>AI Connected (${aiSettings.provider})</span>
            `;
            
            // Load AI features
            const features = [
                { key: 'autoLabeling', label: 'Auto-labeling', enabled: aiSettings.autoLabeling },
                { key: 'newsletterDetection', label: 'Newsletter Detection', enabled: aiSettings.newsletterDetection },
                { key: 'priorityDetection', label: 'Priority Detection', enabled: aiSettings.priorityDetection },
                { key: 'summarizeNewsletters', label: 'Newsletter Summaries', enabled: aiSettings.summarizeNewsletters }
            ];
            
            featuresContainer.innerHTML = features.map(feature => `
                <div class="feature-item">
                    <span>${feature.label}</span>
                    <div class="feature-toggle ${feature.enabled ? 'active' : ''}" 
                         data-feature="${feature.key}">
                    </div>
                </div>
            `).join('');
            
            // Add event listeners for toggles
            document.querySelectorAll('.feature-toggle').forEach(toggle => {
                toggle.addEventListener('click', () => {
                    toggleAIFeature(toggle.dataset.feature);
                });
            });
            
        } else {
            statusElement.className = 'status disconnected';
            statusElement.innerHTML = `
                <span>❌</span>
                <span>AI Not Configured</span>
            `;
            
            featuresContainer.innerHTML = `
                <div style="text-align: center; padding: 12px; color: #6c757d; font-size: 12px;">
                    Configure AI in settings to enable smart features
                </div>
            `;
        }
    } catch (error) {
        console.error('Popup: Error loading AI status:', error);
    }
}

// Toggle AI feature
async function toggleAIFeature(featureKey) {
    try {
        const data = await chrome.storage.local.get(['aiSettings']);
        const aiSettings = data.aiSettings || {};
        
        aiSettings[featureKey] = !aiSettings[featureKey];
        
        await chrome.storage.local.set({ aiSettings });
        
        // Update UI
        const toggle = document.querySelector(`[data-feature="${featureKey}"]`);
        toggle.classList.toggle('active', aiSettings[featureKey]);
        
        // Show feedback
        showNotification(`${featureKey} ${aiSettings[featureKey] ? 'enabled' : 'disabled'}`, 'success');
        
    } catch (error) {
        console.error('Popup: Error toggling AI feature:', error);
        showNotification('Error updating feature', 'error');
    }
}

// Load quick stats
async function loadQuickStats() {
    try {
        const today = new Date().toDateString();
        const data = await chrome.storage.local.get(['tabAnalytics']);
        const analytics = data.tabAnalytics || {};
        
        const todayData = analytics[today] || {};
        const todayClicks = Object.values(todayData).reduce((sum, count) => sum + count, 0);
        
        document.getElementById('todayClicks').textContent = todayClicks;
        document.getElementById('aiSuggestions').textContent = Math.floor(Math.random() * 10); // Mock data
        
    } catch (error) {
        console.error('Popup: Error loading stats:', error);
        document.getElementById('todayClicks').textContent = '0';
        document.getElementById('aiSuggestions').textContent = '0';
    }
}

// Load quick tabs
async function loadQuickTabs() {
    try {
        const data = await chrome.storage.local.get(['gmailTabs']);
        const tabs = data.gmailTabs || [];
        
        const quickTabsContainer = document.getElementById('quickTabs');
        
        if (tabs.length === 0) {
            quickTabsContainer.innerHTML = `
                <div style="text-align: center; padding: 12px; color: #6c757d; font-size: 12px;">
                    No tabs configured
                </div>
            `;
            return;
        }
        
        quickTabsContainer.innerHTML = tabs.slice(0, 5).map(tab => `
            <div class="quick-tab" data-label="${tab.label}">
                <span class="quick-tab-icon">${tab.icon}</span>
                <div class="quick-tab-info">
                    <div>${tab.name}</div>
                </div>
                <span class="quick-tab-count">${tab.count || 0}</span>
            </div>
        `).join('');
        
        // Add click handlers for quick tabs
        document.querySelectorAll('.quick-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const label = tab.dataset.label;
                switchToGmailTab(label);
            });
        });
        
    } catch (error) {
        console.error('Popup: Error loading quick tabs:', error);
    }
}

// Switch to Gmail tab
async function switchToGmailTab(label) {
    try {
        // Find Gmail tab
        const tabs = await chrome.tabs.query({ url: "https://mail.google.com/*" });
        
        if (tabs.length > 0) {
            const gmailTab = tabs[0];
            
            // Focus on Gmail tab
            await chrome.tabs.update(gmailTab.id, { active: true });
            await chrome.windows.update(gmailTab.windowId, { focused: true });
            
            // Send message to switch tab
            await chrome.tabs.sendMessage(gmailTab.id, {
                action: 'switchToTab',
                label: label
            });
            
            showNotification(`Switched to ${label}`, 'success');
            window.close();
        } else {
            // Open Gmail
            await chrome.tabs.create({ url: 'https://mail.google.com' });
            window.close();
        }
    } catch (error) {
        console.error('Popup: Error switching to Gmail tab:', error);
        showNotification('Error switching to tab', 'error');
    }
}

// Attach event listeners
function attachEventListeners() {
    // Quick actions
    document.getElementById('generateSummary').addEventListener('click', async () => {
        await performQuickAction('generateNewsletterSummary', 'Generating summary...');
    });
    
    document.getElementById('runCleanup').addEventListener('click', async () => {
        await performQuickAction('runCleanupAnalysis', 'Analyzing emails...');
    });
    
    document.getElementById('refreshTabs').addEventListener('click', async () => {
        await performQuickAction('refreshTabs', 'Refreshing tabs...');
    });
    
    // Footer links
    document.getElementById('openSettings').addEventListener('click', (e) => {
        e.preventDefault();
        chrome.runtime.openOptionsPage();
        window.close();
    });
    
    document.getElementById('openWelcome').addEventListener('click', (e) => {
        e.preventDefault();
        chrome.tabs.create({ url: 'welcome.html' });
        window.close();
    });
    
    document.getElementById('viewAnalytics').addEventListener('click', (e) => {
        e.preventDefault();
        chrome.runtime.openOptionsPage();
        // Would switch to analytics tab
        window.close();
    });
}

// Perform quick action
async function performQuickAction(action, loadingText) {
    try {
        const button = event.target.closest('.action-btn');
        const originalText = button.innerHTML;
        
        // Show loading state
        button.disabled = true;
        button.innerHTML = `
            <span class="loading"></span>
            <span>${loadingText}</span>
        `;
        
        // Find Gmail tab
        const tabs = await chrome.tabs.query({ url: "https://mail.google.com/*" });
        
        if (tabs.length > 0) {
            const gmailTab = tabs[0];
            
            // Send message to Gmail tab
            await chrome.tabs.sendMessage(gmailTab.id, { action: action });
            
            showNotification('Action completed!', 'success');
            
            // Focus on Gmail tab
            await chrome.tabs.update(gmailTab.id, { active: true });
            await chrome.windows.update(gmailTab.windowId, { focused: true });
            
            setTimeout(() => window.close(), 1000);
        } else {
            showNotification('Please open Gmail first', 'error');
        }
        
    } catch (error) {
        console.error('Popup: Error performing action:', error);
        showNotification('Error performing action', 'error');
    } finally {
        // Reset button state
        const button = event.target.closest('.action-btn');
        if (button) {
            button.disabled = false;
            // Would restore original text, but we're closing the popup
        }
    }
}

// Show notification
function showNotification(message, type = 'info') {
    // Create a simple notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 10px;
        left: 50%;
        transform: translateX(-50%);
        padding: 8px 16px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 500;
        z-index: 10000;
        ${type === 'success' ? 'background: #d4edda; color: #155724; border: 1px solid #c3e6cb;' : ''}
        ${type === 'error' ? 'background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb;' : ''}
        ${type === 'info' ? 'background: #d1ecf1; color: #0c5460; border: 1px solid #bee5eb;' : ''}
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 2 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 2000);
}

// Handle keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        window.close();
    }
    
    // Quick access keys
    if (e.key >= '1' && e.key <= '5') {
        const tabIndex = parseInt(e.key) - 1;
        const quickTab = document.querySelectorAll('.quick-tab')[tabIndex];
        if (quickTab) {
            quickTab.click();
        }
    }
});

// Auto-refresh data every 30 seconds if popup stays open
setInterval(() => {
    loadQuickStats();
}, 30000);

console.log('Gmail Tabs Popup: Script loaded');