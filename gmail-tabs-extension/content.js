        ];
        
        return mockNewsletters;
    }
    
    function showSummaryDialog(title, content) {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            z-index: 20000;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;
        
        const dialog = document.createElement('div');
        dialog.style.cssText = `
            background: white;
            padding: 24px;
            border-radius: 12px;
            width: 90%;
            max-width: 600px;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 16px 64px rgba(0,0,0,0.3);
            font-family: 'Google Sans', sans-serif;
            transform: scale(0.9);
            transition: transform 0.3s ease;
        `;
        
        dialog.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <h2 style="margin: 0; color: #1a73e8; font-size: 20px;">${title}</h2>
                <button id="close-summary" style="
                    background: none;
                    border: none;
                    font-size: 24px;
                    cursor: pointer;
                    color: #5f6368;
                    padding: 4px;
                    border-radius: 4px;
                    transition: background 0.2s ease;
                ">×</button>
            </div>
            <div style="
                background: #f8f9fa;
                padding: 16px;
                border-radius: 8px;
                border-left: 4px solid #1a73e8;
                line-height: 1.6;
                white-space: pre-wrap;
                font-size: 14px;
                color: #202124;
            ">${content}</div>
            <div style="margin-top: 16px; text-align: right;">
                <button id="save-summary" style="
                    background: #1a73e8;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    padding: 8px 16px;
                    cursor: pointer;
                    font-size: 14px;
                    margin-right: 8px;
                    transition: background 0.2s ease;
                ">Save Summary</button>
                <button id="close-summary-btn" style="
                    background: #f8f9fa;
                    color: #5f6368;
                    border: 1px solid #dadce0;
                    border-radius: 6px;
                    padding: 8px 16px;
                    cursor: pointer;
                    font-size: 14px;
                    transition: all 0.2s ease;
                ">Close</button>
            </div>
        `;
        
        modal.appendChild(dialog);
        document.body.appendChild(modal);
        
        // Animate in
        setTimeout(() => {
            modal.style.opacity = '1';
            dialog.style.transform = 'scale(1)';
        }, 50);
        
        // Event listeners
        const closeButtons = dialog.querySelectorAll('#close-summary, #close-summary-btn');
        closeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                modal.style.opacity = '0';
                dialog.style.transform = 'scale(0.9)';
                setTimeout(() => modal.remove(), 300);
            });
        });
        
        dialog.querySelector('#save-summary').addEventListener('click', () => {
            chrome.storage.local.get(['savedSummaries'], (result) => {
                const summaries = result.savedSummaries || [];
                summaries.push({
                    title,
                    content,
                    timestamp: new Date().toISOString()
                });
                chrome.storage.local.set({ savedSummaries: summaries });
                showAIStatusNotification('Summary saved', 'success');
            });
        });
    }
    
    // Enhanced cleanup analysis
    async function runCleanupAnalysis() {
        if (!window.aiService || !window.aiService.isConfigured()) {
            showAIStatusNotification('AI service not configured', 'error');
            return;
        }
        
        try {
            showAIStatusNotification('Analyzing email patterns...', 'info');
            
            // Mock email patterns analysis
            const emailPatterns = {
                totalEmails: 1250,
                oldEmails: 450,
                newsletters: 180,
                unreadCount: 85,
                topSenders: [
                    { email: 'notifications@github.com', count: 45 },
                    { email: 'noreply@medium.com', count: 32 },
                    { email: 'updates@linkedin.com', count: 28 }
                ],
                labelStats: {
                    unlabeled: 320,
                    work: 280,
                    personal: 150
                }
            };
            
            const suggestions = await window.aiService.suggestCleanup(emailPatterns);
            
            if (suggestions) {
                showSummaryDialog('Cleanup Suggestions', suggestions);
            } else {
                showAIStatusNotification('Failed to generate cleanup suggestions', 'error');
            }
            
        } catch (error) {
            console.error('Cleanup analysis error:', error);
            showAIStatusNotification('Error analyzing emails', 'error');
        }
    }
    
    // Add margin to Gmail content so tabs don't overlap
    function addContentMargin() {
        const existingStyle = document.getElementById('gmail-tabs-margin-style');
        if (existingStyle) {
            existingStyle.remove();
        }
        
        const style = document.createElement('style');
        style.id = 'gmail-tabs-margin-style';
        style.textContent = `
            body {
                padding-top: 48px !important;
            }
            .nH.oy8Mbf {
                margin-top: 0 !important;
                padding-top: 0 !important;
            }
            .gb_9c {
                margin-top: 48px !important;
            }
            
            /* Enhanced hover effects for Gmail interface */
            .zA:hover {
                background-color: rgba(26, 115, 232, 0.05) !important;
                transition: background-color 0.2s ease !important;
            }
        `;
        document.head.appendChild(style);
    }
    
    function attachEventListeners() {
        try {
            let isEditMode = false;
            let draggedTabIndex = null;
            
            // Enhanced tab click handlers
            document.querySelectorAll('.gmail-tab').forEach((tab, index) => {
                tab.addEventListener('click', (e) => {
                    if (!isEditMode) {
                        handleTabClick(e);
                        trackTabUsage(currentTabs[index].label);
                    }
                });
                
                // Enhanced hover effects
                tab.addEventListener('mouseenter', function() {
                    if (!this.style.borderBottomColor.includes('#1a73e8')) {
                        this.style.background = 'rgba(26, 115, 232, 0.08) !important';
                        this.style.color = '#1a73e8 !important';
                        this.style.transform = 'translateY(-1px) !important';
                    }
                });
                
                tab.addEventListener('mouseleave', function() {
                    if (!this.style.borderBottomColor.includes('#1a73e8')) {
                        this.style.background = 'transparent !important';
                        this.style.color = '#5f6368 !important';
                        this.style.transform = 'translateY(0) !important';
                    }
                });
                
                // Drag and drop for reordering
                tab.draggable = true;
                tab.addEventListener('dragstart', (e) => {
                    if (isEditMode) {
                        draggedTabIndex = index;
                        tab.style.opacity = '0.5';
                        e.dataTransfer.effectAllowed = 'move';
                    } else {
                        e.preventDefault();
                    }
                });
                
                tab.addEventListener('dragover', (e) => {
                    if (isEditMode) {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        tab.style.borderLeft = '3px solid #1a73e8';
                    }
                });
                
                tab.addEventListener('dragleave', (e) => {
                    tab.style.borderLeft = '';
                });
                
                tab.addEventListener('drop', (e) => {
                    if (isEditMode && draggedTabIndex !== null) {
                        e.preventDefault();
                        tab.style.borderLeft = '';
                        
                        const dropIndex = index;
                        if (draggedTabIndex !== dropIndex) {
                            const draggedTab = currentTabs[draggedTabIndex];
                            currentTabs.splice(draggedTabIndex, 1);
                            currentTabs.splice(dropIndex, 0, draggedTab);
                            
                            chrome.storage.local.set({ gmailTabs: currentTabs }, () => {
                                refreshTabsDisplay();
                            });
                        }
                    }
                });
                
                tab.addEventListener('dragend', (e) => {
                    tab.style.opacity = '';
                    tab.style.borderLeft = '';
                    draggedTabIndex = null;
                });
                
                tab.addEventListener('dblclick', (e) => {
                    if (isEditMode) {
                        e.preventDefault();
                        editTabInline(index);
                    }
                });
            });
            
            // Button event listeners
            const addTabBtn = document.getElementById('gmail-add-tab-btn');
            if (addTabBtn) {
                addTabBtn.addEventListener('click', openAddTabDialog);
            }
            
            const aiSummaryBtn = document.getElementById('gmail-ai-summary-btn');
            if (aiSummaryBtn) {
                aiSummaryBtn.addEventListener('click', generateNewsletterSummary);
            }
            
            const editTabsBtn = document.getElementById('gmail-edit-tabs-btn');
            if (editTabsBtn) {
                editTabsBtn.addEventListener('click', () => {
                    isEditMode = !isEditMode;
                    toggleEditMode(isEditMode);
                });
                
                const tabsContainer = document.getElementById('gmail-tabs-container');
                if (tabsContainer) {
                    tabsContainer.addEventListener('mouseenter', () => {
                        editTabsBtn.style.display = 'inline-block !important';
                    });
                    
                    tabsContainer.addEventListener('mouseleave', () => {
                        if (!isEditMode) {
                            editTabsBtn.style.display = 'none !important';
                        }
                    });
                }
            }
            
            const aiSettingsBtn = document.getElementById('gmail-ai-settings-btn');
            if (aiSettingsBtn) {
                aiSettingsBtn.addEventListener('click', openAISettings);
            }
            
            const settingsBtn = document.getElementById('gmail-settings-btn');
            if (settingsBtn) {
                settingsBtn.addEventListener('click', openSettings);
            }
            
            function toggleEditMode(editMode) {
                const tabs = document.querySelectorAll('.gmail-tab');
                const editBtn = document.getElementById('gmail-edit-tabs-btn');
                
                if (editMode) {
                    editBtn.style.background = '#1a73e8 !important';
                    editBtn.style.color = 'white !important';
                    editBtn.title = 'Exit Edit Mode';
                    
                    tabs.forEach(tab => {
                        tab.style.cursor = 'move !important';
                        tab.style.borderStyle = 'dashed !important';
                        tab.title = 'Drag to reorder, double-click to edit';
                    });
                    
                    showEditModeMessage();
                } else {
                    editBtn.style.background = '#f8f9fa !important';
                    editBtn.style.color = '#5f6368 !important';
                    editBtn.title = 'Edit Mode';
                    
                    tabs.forEach(tab => {
                        tab.style.cursor = 'pointer !important';
                        tab.style.borderStyle = 'solid !important';
                        tab.title = '';
                    });
                    
                    hideEditModeMessage();
                }
            }
            
            function showEditModeMessage() {
                const existingMessage = document.getElementById('edit-mode-message');
                if (existingMessage) return;
                
                const message = document.createElement('div');
                message.id = 'edit-mode-message';
                message.style.cssText = `
                    position: fixed !important;
                    top: 52px !important;
                    left: 50% !important;
                    transform: translateX(-50%) !important;
                    background: #1a73e8 !important;
                    color: white !important;
                    padding: 8px 16px !important;
                    border-radius: 4px !important;
                    font-size: 12px !important;
                    z-index: 10001 !important;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.2) !important;
                `;
                message.textContent = 'Edit Mode: Drag tabs to reorder, double-click to edit';
                document.body.appendChild(message);
                
                setTimeout(() => {
                    if (message.parentNode) {
                        message.remove();
                    }
                }, 3000);
            }
            
            function hideEditModeMessage() {
                const message = document.getElementById('edit-mode-message');
                if (message) {
                    message.remove();
                }
            }
            
        } catch (error) {
            console.error('Gmail Tabs: Error attaching event listeners:', error);
        }
    }
    
    function trackTabUsage(label) {
        chrome.storage.local.get(['tabAnalytics'], (result) => {
            const analytics = result.tabAnalytics || {};
            const today = new Date().toDateString();
            
            if (!analytics[today]) {
                analytics[today] = {};
            }
            
            analytics[today][label] = (analytics[today][label] || 0) + 1;
            chrome.storage.local.set({ tabAnalytics: analytics });
        });
    }
    
    function handleTabClick(event) {
        const clickedTab = event.currentTarget;
        
        document.querySelectorAll('.gmail-tab').forEach(tab => {
            tab.style.borderBottomColor = 'transparent !important';
            tab.style.color = '#5f6368 !important';
            tab.style.background = 'transparent !important';
            
            const countBadge = tab.querySelector('.count-badge');
            if (countBadge) {
                countBadge.style.background = '#5f6368 !important';
            }
        });
        
        clickedTab.style.borderBottomColor = '#1a73e8 !important';
        clickedTab.style.color = '#1a73e8 !important';
        clickedTab.style.background = 'rgba(26, 115, 232, 0.08) !important';
        
        const activeCountBadge = clickedTab.querySelector('.count-badge');
        if (activeCountBadge) {
            activeCountBadge.style.background = '#1a73e8 !important';
        }
        
        const label = clickedTab.dataset.label;
        applyGmailFilter(label);
    }
    
    function applyGmailFilter(label) {
        try {
            const labelMappings = {
                'inbox': '#inbox',
                'important': '#imp',
                'starred': '#starred',
                'sent': '#sent',
                'drafts': '#drafts',
                'work': '#label/Work',
                'personal': '#label/Personal'
            };
            
            const path = labelMappings[label] || `#search/label:${label}`;
            
            if (window.location.hash !== path) {
                window.location.hash = path;
                console.log(`Gmail Tabs: Navigated to ${path}`);
            }
        } catch (error) {
            console.error('Gmail Tabs: Error applying filter:', error);
        }
    }
    
    function updateEmailCounts() {
        try {
            currentTabs.forEach((tab, index) => {
                const countElement = document.querySelector(`.gmail-tab[data-index="${index}"] .count-badge`);
                if (countElement) {
                    const count = Math.floor(Math.random() * 50);
                    tab.count = count;
                    countElement.textContent = count;
                }
            });
        } catch (error) {
            console.error('Gmail Tabs: Error updating counts:', error);
        }
    }
    
    function openAISettings() {
        // AI Settings modal - simplified version
        const modal = document.createElement('div');
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 20000; display: flex; align-items: center; justify-content: center;';
        
        const dialog = document.createElement('div');
        dialog.style.cssText = 'background: white; padding: 24px; border-radius: 8px; width: 400px; box-shadow: 0 8px 32px rgba(0,0,0,0.3); font-family: "Google Sans", sans-serif;';
        
        dialog.innerHTML = `
            <h3 style="margin-bottom: 16px;">🤖 AI Settings</h3>
            <p style="margin-bottom: 16px; color: #5f6368;">Configure AI features for smart email organization.</p>
            <button onclick="this.closest('.modal').remove()" style="
                width: 100%;
                padding: 12px;
                background: #1a73e8;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
            ">Open Full AI Settings</button>
        `;
        
        modal.className = 'modal';
        modal.appendChild(dialog);
        document.body.appendChild(modal);
        
        // Auto-close after 5 seconds
        setTimeout(() => modal.remove(), 5000);
    }
    
    function openAddTabDialog() {
        const modal = document.createElement('div');
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 20000; display: flex; align-items: center; justify-content: center;';
        
        const dialog = document.createElement('div');
        dialog.style.cssText = 'background: white; padding: 24px; border-radius: 8px; width: 400px; box-shadow: 0 8px 32px rgba(0,0,0,0.3); font-family: "Google Sans", sans-serif;';
        
        dialog.innerHTML = `
            <h3 style="margin-bottom: 16px;">Add New Tab</h3>
            <div style="margin-bottom: 12px;">
                <label style="display: block; margin-bottom: 4px; font-weight: 500;">Tab Name:</label>
                <input type="text" id="tab-name-input" placeholder="e.g., Clients" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
            </div>
            <div style="margin-bottom: 12px;">
                <label style="display: block; margin-bottom: 4px; font-weight: 500;">Gmail Label:</label>
                <input type="text" id="tab-label-input" placeholder="e.g., clients" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
            </div>
            <div style="margin-bottom: 16px;">
                <label style="display: block; margin-bottom: 4px; font-weight: 500;">Icon:</label>
                <select id="tab-icon-input" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
                    <option value="📧">📧 Email</option>
                    <option value="📁">📁 Folder</option>
                    <option value="💼">💼 Work</option>
                    <option value="👤">👤 Personal</option>
                    <option value="⭐">⭐ Important</option>
                    <option value="🏢">🏢 Business</option>
                    <option value="🎯">🎯 Projects</option>
                    <option value="🏷️">🏷️ Label</option>
                </select>
            </div>
            <div style="display: flex; justify-content: flex-end; gap: 8px;">
                <button id="cancel-btn" style="padding: 8px 16px; background: #f5f5f5; border: 1px solid #ddd; border-radius: 4px; cursor: pointer;">Cancel</button>
                <button id="add-btn" style="padding: 8px 16px; background: #1a73e8; color: white; border: none; border-radius: 4px; cursor: pointer;">Add Tab</button>
            </div>
        `;
        
        modal.appendChild(dialog);
        document.body.appendChild(modal);
        
        dialog.querySelector('#cancel-btn').addEventListener('click', () => modal.remove());
        dialog.querySelector('#add-btn').addEventListener('click', () => {
            const name = dialog.querySelector('#tab-name-input').value.trim();
            const label = dialog.querySelector('#tab-label-input').value.trim();
            const icon = dialog.querySelector('#tab-icon-input').value;
            
            if (name && label) {
                addNewTab(name, label, icon);
                modal.remove();
            } else {
                alert('Please fill in both tab name and label');
            }
        });
        
        dialog.querySelector('#tab-name-input').focus();
    }
    
    function addNewTab(name, label, icon) {
        try {
            const newTab = { name, label, icon, count: 0 };
            currentTabs.push(newTab);
            
            chrome.storage.local.set({ gmailTabs: currentTabs }, () => {
                refreshTabsDisplay();
            });
            
        } catch (error) {
            console.error('Gmail Tabs: Error adding new tab:', error);
        }
    }
    
    function editTabInline(tabIndex) {
        const tab = currentTabs[tabIndex];
        if (!tab) return;
        
        const modal = document.createElement('div');
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 20000; display: flex; align-items: center; justify-content: center;';
        
        const dialog = document.createElement('div');
        dialog.style.cssText = 'background: white; padding: 24px; border-radius: 8px; width: 400px; box-shadow: 0 8px 32px rgba(0,0,0,0.3); font-family: "Google Sans", sans-serif;';
        
        dialog.innerHTML = `
            <h3 style="margin-bottom: 16px;">Edit Tab: ${tab.name}</h3>
            <div style="margin-bottom: 12px;">
                <label style="display: block; margin-bottom: 4px; font-weight: 500;">Tab Name:</label>
                <input type="text" id="edit-tab-name" value="${tab.name}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
            </div>
            <div style="margin-bottom: 12px;">
                <label style="display: block; margin-bottom: 4px; font-weight: 500;">Gmail Label:</label>
                <input type="text" id="edit-tab-label" value="${tab.label}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
            </div>
            <div style="margin-bottom: 16px;">
                <label style="display: block; margin-bottom: 4px; font-weight: 500;">Icon:</label>
                <select id="edit-tab-icon" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
                    <option value="📧" ${tab.icon === '📧' ? 'selected' : ''}>📧 Email</option>
                    <option value="📁" ${tab.icon === '📁' ? 'selected' : ''}>📁 Folder</option>
                    <option value="💼" ${tab.icon === '💼' ? 'selected' : ''}>💼 Work</option>
                    <option value="👤" ${tab.icon === '👤' ? 'selected' : ''}>👤 Personal</option>
                    <option value="⭐" ${tab.icon === '⭐' ? 'selected' : ''}>⭐ Important</option>
                    <option value="🏢" ${tab.icon === '🏢' ? 'selected' : ''}>🏢 Business</option>
                    <option value="🎯" ${tab.icon === '🎯' ? 'selected' : ''}>🎯 Projects</option>
                    <option value="🏷️" ${tab.icon === '🏷️' ? 'selected' : ''}>🏷️ Label</option>
                </select>
            </div>
            <div style="display: flex; justify-content: flex-end; gap: 8px;">
                <button id="cancel-edit" style="padding: 8px 16px; background: #f5f5f5; border: 1px solid #ddd; border-radius: 4px; cursor: pointer;">Cancel</button>
                <button id="save-edit" style="padding: 8px 16px; background: #1a73e8; color: white; border: none; border-radius: 4px; cursor: pointer;">Save Changes</button>
            </div>
        `;
        
        modal.appendChild(dialog);
        document.body.appendChild(modal);
        
        dialog.querySelector('#cancel-edit').addEventListener('click', () => modal.remove());
        
        dialog.querySelector('#save-edit').addEventListener('click', () => {
            const name = dialog.querySelector('#edit-tab-name').value.trim();
            const label = dialog.querySelector('#edit-tab-label').value.trim();
            const icon = dialog.querySelector('#edit-tab-icon').value;
            
            if (name && label) {
                currentTabs[tabIndex] = { ...tab, name, label, icon };
                chrome.storage.local.set({ gmailTabs: currentTabs }, () => {
                    refreshTabsDisplay();
                    modal.remove();
                });
            } else {
                alert('Please fill in both tab name and label');
            }
        });
        
        dialog.querySelector('#edit-tab-name').focus();
    }
    
    function refreshTabsDisplay() {
        isInjected = false;
        removeExistingTabs();
        injectTabs();
    }
    
    function openSettings() {
        try {
            chrome.runtime.sendMessage({ action: 'openOptions' });
        } catch (error) {
            console.error('Gmail Tabs: Error opening settings:', error);
        }
    }
    
    function addLabelMenuIntegration() {
        try {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === 1 && node.querySelector) {
                            const menus = node.querySelectorAll('[role="menu"]');
                            menus.forEach(menu => {
                                const labelItems = menu.querySelectorAll('[role="menuitem"]');
                                if (labelItems.length > 0) {
                                    addTabOptionToLabelMenu(menu);
                                }
                            });
                        }
                    });
                });
            });
            
            observer.observe(document.body, { childList: true, subtree: true });
            
        } catch (error) {
            console.error('Gmail Tabs: Error adding label menu integration:', error);
        }
    }
    
    function addTabOptionToLabelMenu(menu) {
        if (menu.querySelector('.gmail-tabs-menu-item')) return;
        
        try {
            const separator = document.createElement('div');
            separator.style.cssText = 'height: 1px; background: #dadce0; margin: 4px 0;';
            
            const tabMenuItem = document.createElement('div');
            tabMenuItem.className = 'gmail-tabs-menu-item';
            tabMenuItem.style.cssText = `
                padding: 8px 16px;
                cursor: pointer;
                font-size: 14px;
                color: #1a73e8;
                font-weight: 500;
                display: flex;
                align-items: center;
                gap: 8px;
            `;
            
            tabMenuItem.innerHTML = `
                <span style="font-size: 16px;">🏷️</span>
                <span>Create Tab for this Label</span>
            `;
            
            tabMenuItem.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                
                const labelName = prompt('Enter the label name to create a tab for:');
                if (labelName && labelName.trim()) {
                    createTabFromLabel(labelName.trim());
                }
                
                menu.style.display = 'none';
            });
            
            tabMenuItem.addEventListener('mouseenter', function() {
                this.style.backgroundColor = '#f8f9fa';
            });
            
            tabMenuItem.addEventListener('mouseleave', function() {
                this.style.backgroundColor = 'transparent';
            });
            
            menu.appendChild(separator);
            menu.appendChild(tabMenuItem);
            
        } catch (error) {
            console.error('Gmail Tabs: Error adding tab option to menu:', error);
        }
    }
    
    function createTabFromLabel(labelName) {
        try {
            const cleanLabel = labelName.toLowerCase().replace(/\s+/g, '-');
            const tabName = labelName.charAt(0).toUpperCase() + labelName.slice(1);
            
            const existingTab = currentTabs.find(tab => tab.label === cleanLabel);
            if (existingTab) {
                alert(`Tab "${existingTab.name}" already exists for this label.`);
                return;
            }
            
            const newTab = {
                name: tabName,
                label: cleanLabel,
                icon: '🏷️',
                count: 0
            };
            
            currentTabs.push(newTab);
            
            chrome.storage.local.set({ gmailTabs: currentTabs }, () => {
                refreshTabsDisplay();
                alert(`Created tab "${tabName}" for label "${labelName}"`);
            });
            
        } catch (error) {
            console.error('Gmail Tabs: Error creating tab from label:', error);
        }
    }
    
    function observeGmailChanges() {
        try {
            let lastUrl = window.location.href;
            const observer = new MutationObserver(() => {
                if (window.location.href !== lastUrl) {
                    lastUrl = window.location.href;
                    setTimeout(updateEmailCounts, 1000);
                }
                
                if (!document.getElementById('gmail-tabs-container')) {
                    console.log('Gmail Tabs: Tabs disappeared, re-injecting...');
                    isInjected = false;
                    setTimeout(injectTabs, 500);
                }
            });
            
            observer.observe(document.body, { 
                childList: true, 
                subtree: true,
                attributes: false
            });
            
        } catch (error) {
            console.error('Gmail Tabs: Error setting up observer:', error);
        }
    }
    
    // Initialize extension
    async function initialize() {
        try {
            console.log('Gmail Tabs: Initializing enhanced tabs with AI integration...');
            await loadSavedTabs();
            
            const attemptInjection = () => {
                if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', () => {
                        setTimeout(injectTabs, 500);
                    });
                } else {
                    setTimeout(injectTabs, 500);
                }
                
                setTimeout(injectTabs, 2000);
                setTimeout(injectTabs, 5000);
            };
            
            attemptInjection();
            observeGmailChanges();
            
        } catch (error) {
            console.error('Gmail Tabs: Initialization error:', error);
        }
    }
    
    // Start initialization
    initialize();
    
})();