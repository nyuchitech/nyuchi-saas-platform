// Options page JavaScript for Gmail Tabs Extension

document.addEventListener('DOMContentLoaded', function() {
    initializeOptionsPage();
});

function initializeOptionsPage() {
    setupTabNavigation();
    loadSettings();
    attachEventListeners();
    loadAnalytics();
    loadTabsList();
}

// Tab navigation
function setupTabNavigation() {
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.dataset.tab;
            
            // Remove active class from all tabs and contents
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(tc => tc.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding content
            tab.classList.add('active');
            document.getElementById(targetTab).classList.add('active');
            
            // Load tab-specific data
            if (targetTab === 'analytics') {
                loadAnalytics();
            } else if (targetTab === 'tabs') {
                loadTabsList();
            }
        });
    });
}

// Load all settings
async function loadSettings() {
    try {
        const data = await chrome.storage.local.get(null);
        
        // Load general settings
        loadGeneralSettings(data);
        
        // Load AI settings
        loadAISettings(data.aiSettings || {});
        
        console.log('Options: Settings loaded successfully');
    } catch (error) {
        console.error('Options: Error loading settings:', error);
        showAlert('Error loading settings', 'error');
    }
}

// Load general settings
function loadGeneralSettings(data) {
    const generalSettings = data.generalSettings || {};
    
    document.getElementById('theme').value = generalSettings.theme || 'light';
    document.getElementById('animations').checked = generalSettings.animations !== false;
    document.getElementById('notifications').checked = generalSettings.notifications !== false;
    document.getElementById('autoRefresh').checked = generalSettings.autoRefresh !== false;
    document.getElementById('showEditButton').checked = generalSettings.showEditButton !== false;
    document.getElementById('refreshInterval').value = generalSettings.refreshInterval || 30;
}

// Load AI settings
function loadAISettings(aiSettings) {
    document.getElementById('aiProvider').value = aiSettings.provider || 'openai';
    document.getElementById('apiKey').value = aiSettings.apiKey || '';
    document.getElementById('customEndpoint').value = aiSettings.customEndpoint || '';
    document.getElementById('autoLabeling').checked = aiSettings.autoLabeling || false;
    document.getElementById('newsletterDetection').checked = aiSettings.newsletterDetection || false;
    document.getElementById('priorityDetection').checked = aiSettings.priorityDetection || false;
    document.getElementById('summarizeNewsletters').checked = aiSettings.summarizeNewsletters || false;
    document.getElementById('cleanupSuggestions').checked = aiSettings.cleanupSuggestions || false;
    document.getElementById('autoLabelingRules').value = aiSettings.autoLabelingRules || '';
    document.getElementById('maxTokens').value = aiSettings.maxTokens || 500;
    document.getElementById('temperature').value = aiSettings.temperature || 0.3;
    
    updateProviderInfo();
    toggleCustomEndpoint();
}

// Attach event listeners
function attachEventListeners() {
    // General settings
    document.getElementById('theme').addEventListener('change', saveGeneralSettings);
    document.getElementById('animations').addEventListener('change', saveGeneralSettings);
    document.getElementById('notifications').addEventListener('change', saveGeneralSettings);
    document.getElementById('autoRefresh').addEventListener('change', saveGeneralSettings);
    document.getElementById('showEditButton').addEventListener('change', saveGeneralSettings);
    document.getElementById('refreshInterval').addEventListener('change', saveGeneralSettings);
    
    // AI settings
    document.getElementById('aiProvider').addEventListener('change', () => {
        updateProviderInfo();
        toggleCustomEndpoint();
        saveAISettings();
    });
    
    document.getElementById('apiKey').addEventListener('input', saveAISettings);
    document.getElementById('customEndpoint').addEventListener('input', saveAISettings);
    document.getElementById('autoLabeling').addEventListener('change', saveAISettings);
    document.getElementById('newsletterDetection').addEventListener('change', saveAISettings);
    document.getElementById('priorityDetection').addEventListener('change', saveAISettings);
    document.getElementById('summarizeNewsletters').addEventListener('change', saveAISettings);
    document.getElementById('cleanupSuggestions').addEventListener('change', saveAISettings);
    document.getElementById('autoLabelingRules').addEventListener('input', saveAISettings);
    document.getElementById('maxTokens').addEventListener('input', saveAISettings);
    document.getElementById('temperature').addEventListener('input', saveAISettings);
    
    // Test connection
    document.getElementById('testConnection').addEventListener('click', testAIConnection);
    
    // Tab management
    document.getElementById('addNewTab').addEventListener('click', addNewTab);
    document.getElementById('resetTabs').addEventListener('click', resetTabs);
    document.getElementById('reorderTabs').addEventListener('click', reorderTabs);
    
    // Analytics
    document.getElementById('clearAnalytics').addEventListener('click', clearAnalytics);
    
    // Backup & Import
    document.getElementById('exportSettings').addEventListener('click', exportSettings);
    document.getElementById('importSettings').addEventListener('click', importSettings);
    document.getElementById('resetEverything').addEventListener('click', resetEverything);
}

// Save general settings
async function saveGeneralSettings() {
    try {
        const generalSettings = {
            theme: document.getElementById('theme').value,
            animations: document.getElementById('animations').checked,
            notifications: document.getElementById('notifications').checked,
            autoRefresh: document.getElementById('autoRefresh').checked,
            showEditButton: document.getElementById('showEditButton').checked,
            refreshInterval: parseInt(document.getElementById('refreshInterval').value)
        };
        
        await chrome.storage.local.set({ generalSettings });
        showAlert('General settings saved!', 'success');
    } catch (error) {
        console.error('Options: Error saving general settings:', error);
        showAlert('Error saving settings', 'error');
    }
}

// Save AI settings
async function saveAISettings() {
    try {
        const aiSettings = {
            provider: document.getElementById('aiProvider').value,
            apiKey: document.getElementById('apiKey').value,
            customEndpoint: document.getElementById('customEndpoint').value,
            autoLabeling: document.getElementById('autoLabeling').checked,
            newsletterDetection: document.getElementById('newsletterDetection').checked,
            priorityDetection: document.getElementById('priorityDetection').checked,
            summarizeNewsletters: document.getElementById('summarizeNewsletters').checked,
            cleanupSuggestions: document.getElementById('cleanupSuggestions').checked,
            autoLabelingRules: document.getElementById('autoLabelingRules').value,
            maxTokens: parseInt(document.getElementById('maxTokens').value),
            temperature: parseFloat(document.getElementById('temperature').value)
        };
        
        await chrome.storage.local.set({ aiSettings });
        showAlert('AI settings saved!', 'success');
    } catch (error) {
        console.error('Options: Error saving AI settings:', error);
        showAlert('Error saving AI settings', 'error');
    }
}

// Update provider info
function updateProviderInfo() {
    const provider = document.getElementById('aiProvider').value;
    const infoDiv = document.getElementById('providerInfo');
    
    const providerInfo = {
        'openai': 'Requires OpenAI API key. Get one at platform.openai.com. Supports GPT-3.5-turbo and GPT-4 models.',
        'anthropic': 'Requires Anthropic API key. Get one at console.anthropic.com. Uses Claude models.',
        'gemini': 'Requires Google AI API key. Get one at makersuite.google.com. Uses Gemini Pro model.',
        'custom': 'Use your own OpenAI-compatible endpoint. Must support the /v1/chat/completions format.'
    };
    
    infoDiv.textContent = providerInfo[provider] || 'Select a provider to see details.';
}

// Toggle custom endpoint field
function toggleCustomEndpoint() {
    const provider = document.getElementById('aiProvider').value;
    const customGroup = document.getElementById('customEndpointGroup');
    
    if (provider === 'custom') {
        customGroup.classList.remove('hidden');
    } else {
        customGroup.classList.add('hidden');
    }
}

// Test AI connection
async function testAIConnection() {
    const button = document.getElementById('testConnection');
    const loading = document.getElementById('testLoading');
    
    button.disabled = true;
    loading.classList.remove('hidden');
    
    try {
        const settings = {
            provider: document.getElementById('aiProvider').value,
            apiKey: document.getElementById('apiKey').value,
            customEndpoint: document.getElementById('customEndpoint').value
        };
        
        const result = await chrome.runtime.sendMessage({
            action: 'testAIConnection',
            settings: settings
        });
        
        if (result.success) {
            showAlert('AI connection successful!', 'success');
        } else {
            showAlert(`Connection failed: ${result.error}`, 'error');
        }
    } catch (error) {
        console.error('Options: Error testing connection:', error);
        showAlert('Error testing connection', 'error');
    } finally {
        button.disabled = false;
        loading.classList.add('hidden');
    }
}

// Load tabs list
async function loadTabsList() {
    try {
        const data = await chrome.storage.local.get(['gmailTabs']);
        const tabs = data.gmailTabs || [];
        
        const tabsList = document.getElementById('tabsList');
        tabsList.innerHTML = '';
        
        tabs.forEach((tab, index) => {
            const tabItem = createTabItem(tab, index);
            tabsList.appendChild(tabItem);
        });
    } catch (error) {
        console.error('Options: Error loading tabs:', error);
        showAlert('Error loading tabs', 'error');
    }
}

// Create tab item HTML
function createTabItem(tab, index) {
    const item = document.createElement('div');
    item.className = 'tab-item';
    item.innerHTML = `
        <div class="tab-info">
            <div class="tab-icon">${tab.icon}</div>
            <div class="tab-details">
                <h4>${tab.name}</h4>
                <p>Label: ${tab.label} | Count: ${tab.count || 0}</p>
            </div>
        </div>
        <div class="tab-actions">
            <button class="button btn-small" onclick="editTab(${index})">Edit</button>
            <button class="button danger btn-small" onclick="deleteTab(${index})">Delete</button>
        </div>
    `;
    return item;
}

// Edit tab
window.editTab = function(index) {
    const newName = prompt('Enter new tab name:');
    if (newName) {
        updateTab(index, { name: newName });
    }
};

// Delete tab
window.deleteTab = function(index) {
    if (confirm('Are you sure you want to delete this tab?')) {
        removeTab(index);
    }
};

// Update tab
async function updateTab(index, updates) {
    try {
        const data = await chrome.storage.local.get(['gmailTabs']);
        const tabs = data.gmailTabs || [];
        
        tabs[index] = { ...tabs[index], ...updates };
        
        await chrome.storage.local.set({ gmailTabs: tabs });
        loadTabsList();
        showAlert('Tab updated!', 'success');
    } catch (error) {
        console.error('Options: Error updating tab:', error);
        showAlert('Error updating tab', 'error');
    }
}

// Remove tab
async function removeTab(index) {
    try {
        const data = await chrome.storage.local.get(['gmailTabs']);
        const tabs = data.gmailTabs || [];
        
        tabs.splice(index, 1);
        
        await chrome.storage.local.set({ gmailTabs: tabs });
        loadTabsList();
        showAlert('Tab deleted!', 'success');
    } catch (error) {
        console.error('Options: Error deleting tab:', error);
        showAlert('Error deleting tab', 'error');
    }
}

// Add new tab
function addNewTab() {
    const name = prompt('Enter tab name:');
    const label = prompt('Enter Gmail label:');
    const icon = prompt('Enter emoji icon:') || '📁';
    
    if (name && label) {
        addTab({ name, label, icon, count: 0 });
    }
}

// Add tab
async function addTab(tab) {
    try {
        const data = await chrome.storage.local.get(['gmailTabs']);
        const tabs = data.gmailTabs || [];
        
        tabs.push(tab);
        
        await chrome.storage.local.set({ gmailTabs: tabs });
        loadTabsList();
        showAlert('Tab added!', 'success');
    } catch (error) {
        console.error('Options: Error adding tab:', error);
        showAlert('Error adding tab', 'error');
    }
}

// Reset tabs to default
async function resetTabs() {
    if (confirm('This will reset all tabs to default. Continue?')) {
        try {
            const defaultTabs = [
                { name: 'Inbox', label: 'inbox', icon: '📥', count: 0 },
                { name: 'Important', label: 'important', icon: '⭐', count: 0 },
                { name: 'Work', label: 'work', icon: '💼', count: 0 },
                { name: 'Personal', label: 'personal', icon: '👤', count: 0 },
                { name: 'AI Suggested', label: 'ai-suggested', icon: '🤖', count: 0 }
            ];
            
            await chrome.storage.local.set({ gmailTabs: defaultTabs });
            loadTabsList();
            showAlert('Tabs reset to default!', 'success');
        } catch (error) {
            console.error('Options: Error resetting tabs:', error);
            showAlert('Error resetting tabs', 'error');
        }
    }
}

// Reorder tabs by usage
async function reorderTabs() {
    try {
        const data = await chrome.storage.local.get(['gmailTabs', 'tabAnalytics']);
        const tabs = data.gmailTabs || [];
        const analytics = data.tabAnalytics || {};
        
        // Calculate usage for each tab
        const tabUsage = {};
        Object.values(analytics).forEach(dayData => {
            Object.keys(dayData).forEach(label => {
                tabUsage[label] = (tabUsage[label] || 0) + dayData[label];
            });
        });
        
        // Sort tabs by usage (most used first)
        tabs.sort((a, b) => (tabUsage[b.label] || 0) - (tabUsage[a.label] || 0));
        
        await chrome.storage.local.set({ gmailTabs: tabs });
        loadTabsList();
        showAlert('Tabs reordered by usage!', 'success');
    } catch (error) {
        console.error('Options: Error reordering tabs:', error);
        showAlert('Error reordering tabs', 'error');
    }
}

// Load analytics
async function loadAnalytics() {
    try {
        const result = await chrome.runtime.sendMessage({ action: 'getAnalytics' });
        
        displayStats(result);
        displayUsageChart(result.weeklyTrends || []);
    } catch (error) {
        console.error('Options: Error loading analytics:', error);
        showAlert('Error loading analytics', 'error');
    }
}

// Display stats
function displayStats(analytics) {
    const statsGrid = document.getElementById('statsGrid');
    
    const stats = [
        { label: 'Total Clicks', value: analytics.totalClicks || 0 },
        { label: 'Active Days', value: Object.keys(analytics.dailyUsage || {}).length },
        { label: 'Most Used Tab', value: getMostUsedTab(analytics.popularTabs || {}) },
        { label: 'Avg Daily Clicks', value: Math.round((analytics.totalClicks || 0) / Math.max(1, Object.keys(analytics.dailyUsage || {}).length)) }
    ];
    
    statsGrid.innerHTML = stats.map(stat => `
        <div class="stat-card">
            <div class="stat-number">${stat.value}</div>
            <div class="stat-label">${stat.label}</div>
        </div>
    `).join('');
}

// Get most used tab
function getMostUsedTab(popularTabs) {
    if (!popularTabs || Object.keys(popularTabs).length === 0) return 'None';
    
    const mostUsed = Object.keys(popularTabs).reduce((a, b) => 
        popularTabs[a] > popularTabs[b] ? a : b
    );
    
    return mostUsed.charAt(0).toUpperCase() + mostUsed.slice(1);
}

// Display usage chart
function displayUsageChart(weeklyTrends) {
    const canvas = document.getElementById('usageChart');
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (weeklyTrends.length === 0) {
        ctx.fillStyle = '#6c757d';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('No usage data available', canvas.width / 2, canvas.height / 2);
        return;
    }
    
    // Simple bar chart
    const maxClicks = Math.max(...weeklyTrends.map(d => d.clicks));
    const barWidth = canvas.width / weeklyTrends.length;
    
    weeklyTrends.forEach((data, index) => {
        const barHeight = (data.clicks / maxClicks) * (canvas.height - 40);
        
        ctx.fillStyle = '#1a73e8';
        ctx.fillRect(index * barWidth + 10, canvas.height - barHeight - 20, barWidth - 20, barHeight);
        
        // Labels
        ctx.fillStyle = '#6c757d';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        const date = new Date(data.date).toLocaleDateString('en-US', { weekday: 'short' });
        ctx.fillText(date, index * barWidth + barWidth / 2, canvas.height - 5);
    });
}

// Clear analytics
async function clearAnalytics() {
    if (confirm('This will permanently delete all analytics data. Continue?')) {
        try {
            const result = await chrome.runtime.sendMessage({ action: 'clearAnalytics' });
            
            if (result.success) {
                loadAnalytics();
                showAlert('Analytics data cleared!', 'success');
            } else {
                showAlert('Error clearing analytics', 'error');
            }
        } catch (error) {
            console.error('Options: Error clearing analytics:', error);
            showAlert('Error clearing analytics', 'error');
        }
    }
}

// Export settings
async function exportSettings() {
    try {
        const result = await chrome.runtime.sendMessage({ action: 'exportSettings' });
        
        if (result.success) {
            const dataStr = JSON.stringify(result.data, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = `gmail-tabs-settings-${new Date().toISOString().split('T')[0]}.json`;
            link.click();
            
            showAlert('Settings exported successfully!', 'success');
        } else {
            showAlert('Error exporting settings', 'error');
        }
    } catch (error) {
        console.error('Options: Error exporting settings:', error);
        showAlert('Error exporting settings', 'error');
    }
}

// Import settings
async function importSettings() {
    const fileInput = document.getElementById('importFile');
    const file = fileInput.files[0];
    
    if (!file) {
        showAlert('Please select a file to import', 'error');
        return;
    }
    
    try {
        const text = await file.text();
        const settings = JSON.parse(text);
        
        const result = await chrome.runtime.sendMessage({
            action: 'importSettings',
            settings: settings
        });
        
        if (result.success) {
            showAlert('Settings imported successfully!', 'success');
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } else {
            showAlert(`Import failed: ${result.error}`, 'error');
        }
    } catch (error) {
        console.error('Options: Error importing settings:', error);
        showAlert('Error importing settings - invalid file format', 'error');
    }
}

// Reset everything
async function resetEverything() {
    if (confirm('This will reset ALL settings to defaults. This cannot be undone. Continue?')) {
        try {
            await chrome.storage.local.clear();
            showAlert('All settings reset!', 'success');
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } catch (error) {
            console.error('Options: Error resetting everything:', error);
            showAlert('Error resetting settings', 'error');
        }
    }
}

// Show alert
function showAlert(message, type = 'info') {
    const alertsContainer = document.getElementById('alerts');
    
    const alert = document.createElement('div');
    alert.className = `alert ${type}`;
    alert.textContent = message;
    alert.style.display = 'block';
    
    alertsContainer.appendChild(alert);
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
        alert.style.opacity = '0';
        setTimeout(() => {
            if (alert.parentNode) {
                alert.parentNode.removeChild(alert);
            }
        }, 300);
    }, 3000);
}

console.log('Gmail Tabs Options: Script loaded');