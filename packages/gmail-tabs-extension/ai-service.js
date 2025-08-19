// AI Service for Gmail organization and analysis
class AIService {
    constructor() {
        this.settings = {};
        this.loadSettings();
        this.rateLimiter = new Map(); // For API rate limiting
    }
    
    async loadSettings() {
        return new Promise((resolve) => {
            chrome.storage.local.get(['aiSettings'], (result) => {
                this.settings = result.aiSettings || {
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
                resolve();
            });
        });
    }
    
    async saveSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        return new Promise((resolve) => {
            chrome.storage.local.set({ aiSettings: this.settings }, resolve);
        });
    }
    
    isConfigured() {
        return this.settings.provider && this.settings.apiKey;
    }
    
    // Rate limiting for API calls
    canMakeRequest(endpoint) {
        const now = Date.now();
        const key = `${this.settings.provider}_${endpoint}`;
        const lastRequest = this.rateLimiter.get(key) || 0;
        const minInterval = 1000; // 1 second between requests
        
        if (now - lastRequest < minInterval) {
            return false;
        }
        
        this.rateLimiter.set(key, now);
        return true;
    }
    
    // Analyze email content and suggest labels
    async suggestLabels(emailContent) {
        if (!this.isConfigured() || !this.settings.autoLabeling) {
            return null;
        }
        
        if (!this.canMakeRequest('labels')) {
            console.log('Rate limited - skipping label suggestion');
            return null;
        }
        
        try {
            const rules = this.settings.autoLabelingRules || `
- Work emails from colleagues, managers, or work domains
- Personal emails from family, friends, or personal accounts
- Financial emails from banks, payment services, or financial institutions
- Shopping emails from retailers, e-commerce sites, or purchase confirmations
- Travel emails from airlines, hotels, or travel booking sites
- News and newsletters from media outlets or subscription services
- Social emails from social media platforms or networking sites
- Education emails from schools, universities, or learning platforms
`;

            const prompt = `Based on these labeling rules:
${rules}

Analyze this email and suggest appropriate labels:
Subject: ${emailContent.subject}
From: ${emailContent.from}
Content snippet: ${emailContent.content.substring(0, 800)}...

Respond with only the suggested label names, separated by commas. Use simple, common labels like: work, personal, finance, shopping, travel, newsletter, social, education, important, etc. If no specific label applies, respond with "None".`;
            
            const response = await this.callAI(prompt, { maxTokens: 100 });
            
            if (response.toLowerCase().includes('none')) {
                return [];
            }
            
            return response.split(',').map(label => label.trim().toLowerCase()).filter(label => label);
            
        } catch (error) {
            console.error('AI label suggestion error:', error);
            return null;
        }
    }
    
    // Detect if email is a newsletter or promotional content
    async detectNewsletter(emailContent) {
        if (!this.isConfigured() || !this.settings.newsletterDetection) {
            return false;
        }
        
        if (!this.canMakeRequest('newsletter')) {
            return false;
        }
        
        try {
            // Quick detection based on common patterns first
            const quickCheck = this.quickNewsletterCheck(emailContent);
            if (quickCheck !== null) {
                return quickCheck;
            }
            
            const prompt = `Analyze this email and determine if it's a newsletter, promotional email, or mailing list content:

Subject: ${emailContent.subject}
From: ${emailContent.from}
Content snippet: ${emailContent.content.substring(0, 600)}...

Look for signs like:
- Unsubscribe links or "You're receiving this because..."
- Promotional language like "Sale", "Offer", "Deal", "Discount"
- Newsletter formatting with sections or multiple articles
- Regular sender patterns (weekly updates, daily news, etc.)
- Marketing content or product announcements
- Automated sending patterns

Respond with only "YES" if it's clearly a newsletter/promotional email, or "NO" if it's personal/transactional communication.`;
            
            const response = await this.callAI(prompt, { maxTokens: 10 });
            return response.toLowerCase().includes('yes');
            
        } catch (error) {
            console.error('Newsletter detection error:', error);
            return false;
        }
    }
    
    // Quick pattern-based newsletter detection
    quickNewsletterCheck(emailContent) {
        const content = (emailContent.subject + ' ' + emailContent.content + ' ' + emailContent.from).toLowerCase();
        
        // Strong newsletter indicators
        const newsletterKeywords = [
            'unsubscribe', 'newsletter', 'weekly update', 'daily digest',
            'you\'re receiving this', 'mailing list', 'update preferences',
            'view in browser', 'forward to a friend', 'noreply@'
        ];
        
        // Strong promotional indicators
        const promoKeywords = [
            'limited time', 'exclusive offer', 'sale ends', 'act now',
            'free shipping', 'discount code', 'special promotion'
        ];
        
        const hasNewsletterKeywords = newsletterKeywords.some(keyword => content.includes(keyword));
        const hasPromoKeywords = promoKeywords.some(keyword => content.includes(keyword));
        
        if (hasNewsletterKeywords || hasPromoKeywords) {
            return true;
        }
        
        // Check for automated sender patterns
        if (emailContent.from.includes('noreply') || emailContent.from.includes('no-reply')) {
            return true;
        }
        
        return null; // Needs AI analysis
    }
    
    // Determine email priority level
    async assessPriority(emailContent) {
        if (!this.isConfigured() || !this.settings.priorityDetection) {
            return 'normal';
        }
        
        if (!this.canMakeRequest('priority')) {
            return 'normal';
        }
        
        try {
            // Quick priority check first
            const quickPriority = this.quickPriorityCheck(emailContent);
            if (quickPriority !== 'normal') {
                return quickPriority;
            }
            
            const prompt = `Analyze this email and determine its priority level:

Subject: ${emailContent.subject}
From: ${emailContent.from}
Content: ${emailContent.content.substring(0, 800)}...

Consider factors like:
- Urgency indicators (URGENT, ASAP, deadline, time-sensitive)
- Action requirements (meeting requests, responses needed)
- Sender importance (boss, client, important contacts)
- Content importance (decisions needed, approvals, critical updates)
- Time sensitivity (today, tomorrow, this week)

Respond with only one word: "high", "medium", or "low"`;
            
            const response = await this.callAI(prompt, { maxTokens: 10 });
            const priority = response.toLowerCase().trim();
            
            if (['high', 'medium', 'low'].includes(priority)) {
                return priority;
            }
            return 'normal';
            
        } catch (error) {
            console.error('Priority detection error:', error);
            return 'normal';
        }
    }
    
    // Quick pattern-based priority detection
    quickPriorityCheck(emailContent) {
        const content = (emailContent.subject + ' ' + emailContent.content).toLowerCase();
        
        const highPriorityKeywords = [
            'urgent', 'asap', 'emergency', 'critical', 'important',
            'deadline today', 'response needed', 'action required'
        ];
        
        const mediumPriorityKeywords = [
            'meeting', 'deadline', 'reminder', 'follow up',
            'review needed', 'approval', 'feedback'
        ];
        
        if (highPriorityKeywords.some(keyword => content.includes(keyword))) {
            return 'high';
        }
        
        if (mediumPriorityKeywords.some(keyword => content.includes(keyword))) {
            return 'medium';
        }
        
        return 'normal';
    }
    
    // Generate newsletter summary for multiple newsletters
    async generateNewsletterSummary(newsletters) {
        if (!this.isConfigured() || !this.settings.summarizeNewsletters || newsletters.length === 0) {
            return null;
        }
        
        if (!this.canMakeRequest('summary')) {
            return null;
        }
        
        try {
            const newsletterTexts = newsletters.slice(0, 5).map(email => // Limit to 5 newsletters
                `From: ${email.from}
Subject: ${email.subject}
Key content: ${email.content.substring(0, 300)}...`
            ).join('\n\n---\n\n');
            
            const prompt = `Summarize these newsletter/promotional emails into key highlights:

${newsletterTexts}

Provide a concise summary with:
1. Main topics and themes covered
2. Important announcements, offers, or news
3. Key takeaways worth noting
4. Any time-sensitive information or deadlines

Format as a clear, scannable summary in bullet points. Keep it under 200 words.`;
            
            return await this.callAI(prompt, { maxTokens: 300 });
            
        } catch (error) {
            console.error('Newsletter summary error:', error);
            return null;
        }
    }
    
    // Suggest cleanup actions based on email patterns
    async suggestCleanup(emailPatterns) {
        if (!this.isConfigured() || !this.settings.cleanupSuggestions) {
            return null;
        }
        
        if (!this.canMakeRequest('cleanup')) {
            return null;
        }
        
        try {
            const prompt = `Based on these email patterns from the user's Gmail, suggest cleanup actions:

${JSON.stringify(emailPatterns, null, 2)}

Analyze and suggest:
1. Old emails that could be archived (low engagement, outdated)
2. Newsletter subscriptions that might be worth unsubscribing from
3. Email labels that could be created or consolidated
4. Automation rules that could be set up
5. Folders or filters that would improve organization

Provide specific, actionable recommendations in a clear list format.`;
            
            return await this.callAI(prompt, { maxTokens: 400 });
            
        } catch (error) {
            console.error('Cleanup suggestions error:', error);
            return null;
        }
    }
    
    // Generate smart auto-reply suggestions
    async suggestAutoReply(emailContent) {
        if (!this.isConfigured()) {
            return null;
        }
        
        try {
            const prompt = `Generate a brief, professional auto-reply suggestion for this email:

Subject: ${emailContent.subject}
From: ${emailContent.from}
Content: ${emailContent.content.substring(0, 500)}...

Provide a short, appropriate response (1-2 sentences) that acknowledges the email and indicates next steps. Make it professional but friendly.`;
            
            return await this.callAI(prompt, { maxTokens: 100 });
            
        } catch (error) {
            console.error('Auto-reply suggestion error:', error);
            return null;
        }
    }
    
    // Core AI API call function
    async callAI(prompt, options = {}) {
        if (!this.isConfigured()) {
            throw new Error('AI service not configured');
        }
        
        const apiConfig = this.getAPIConfig();
        const maxTokens = options.maxTokens || this.settings.maxTokens || 500;
        const temperature = options.temperature || this.settings.temperature || 0.3;
        
        try {
            const requestBody = this.buildRequestBody(apiConfig, prompt, maxTokens, temperature);
            
            const response = await fetch(apiConfig.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...apiConfig.headers
                },
                body: JSON.stringify(requestBody)
            });
            
            if (!response.ok) {
                throw new Error(`API request failed: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            return this.extractResponse(data);
            
        } catch (error) {
            console.error('AI API call failed:', error);
            throw error;
        }
    }
    
    getAPIConfig() {
        const configs = {
            'openai': {
                endpoint: 'https://api.openai.com/v1/chat/completions',
                headers: {
                    'Authorization': `Bearer ${this.settings.apiKey}`
                }
            },
            'anthropic': {
                endpoint: 'https://api.anthropic.com/v1/messages',
                headers: {
                    'x-api-key': this.settings.apiKey,
                    'anthropic-version': '2023-06-01'
                }
            },
            'gemini': {
                endpoint: `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${this.settings.apiKey}`,
                headers: {}
            },
            'custom': {
                endpoint: this.settings.customEndpoint || 'https://api.openai.com/v1/chat/completions',
                headers: {
                    'Authorization': `Bearer ${this.settings.apiKey}`
                }
            }
        };
        
        return configs[this.settings.provider] || configs['openai'];
    }
    
    buildRequestBody(apiConfig, prompt, maxTokens, temperature) {
        switch (this.settings.provider) {
            case 'openai':
            case 'custom':
                return {
                    model: 'gpt-3.5-turbo',
                    messages: [{ role: 'user', content: prompt }],
                    max_tokens: maxTokens,
                    temperature: temperature
                };
            case 'anthropic':
                return {
                    model: 'claude-3-haiku-20240307',
                    max_tokens: maxTokens,
                    messages: [{ role: 'user', content: prompt }],
                    temperature: temperature
                };
            case 'gemini':
                return {
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        maxOutputTokens: maxTokens,
                        temperature: temperature
                    }
                };
            default:
                return {
                    model: 'gpt-3.5-turbo',
                    messages: [{ role: 'user', content: prompt }],
                    max_tokens: maxTokens,
                    temperature: temperature
                };
        }
    }
    
    extractResponse(data) {
        switch (this.settings.provider) {
            case 'openai':
            case 'custom':
                return data.choices[0].message.content;
            case 'anthropic':
                return data.content[0].text;
            case 'gemini':
                return data.candidates[0].content.parts[0].text;
            default:
                return data.choices[0].message.content;
        }
    }
}

// Email analysis helper functions
class EmailAnalyzer {
    constructor(aiService) {
        this.ai = aiService;
        this.processedEmails = new Set();
        this.emailQueue = [];
        this.processing = false;
        this.batchSize = 3; // Process 3 emails at a time
    }
    
    // Extract email content from Gmail DOM
    extractEmailContent(emailElement) {
        try {
            const subject = this.getEmailSubject(emailElement);
            const from = this.getEmailSender(emailElement);
            const content = this.getEmailBody(emailElement);
            const timestamp = this.getEmailTimestamp(emailElement);
            
            return { subject, from, content, timestamp };
        } catch (error) {
            console.error('Email extraction error:', error);
            return null;
        }
    }
    
    getEmailSubject(emailElement) {
        const subjectSelectors = [
            '[data-subject]',
            '.hP',
            '.bog',
            'h2',
            '.subject',
            '.bqe',
            '.aKS .aKR'
        ];
        
        for (const selector of subjectSelectors) {
            const element = emailElement.querySelector(selector);
            if (element && element.textContent.trim()) {
                return element.textContent.trim();
            }
        }
        
        // Try to extract from thread title
        const threadTitle = document.querySelector('.ha h2');
        if (threadTitle) {
            return threadTitle.textContent.trim();
        }
        
        return 'No subject';
    }
    
    getEmailSender(emailElement) {
        const senderSelectors = [
            '[email]',
            '.go .gb',
            '.yP',
            '.sender',
            '.from',
            '.g2',
            '.gD',
            '.yW span[email]'
        ];
        
        for (const selector of senderSelectors) {
            const element = emailElement.querySelector(selector);
            if (element) {
                const email = element.getAttribute('email') || element.textContent.trim();
                if (email && email.includes('@')) {
                    return email;
                }
            }
        }
        
        return 'Unknown sender';
    }
    
    getEmailBody(emailElement) {
        const bodySelectors = [
            '.ii.gt .a3s',
            '.ii.gt',
            '.message-body',
            '.email-body',
            'div[dir="ltr"]',
            '.adn',
            '.adO'
        ];
        
        for (const selector of bodySelectors) {
            const element = emailElement.querySelector(selector);
            if (element && element.textContent.trim()) {
                return element.textContent.trim().substring(0, 2000); // Limit content length
            }
        }
        
        return 'No content available';
    }
    
    getEmailTimestamp(emailElement) {
        const timeSelectors = [
            '.g3',
            '.gh .g3',
            '.h2 .g3',
            '.time',
            '.timestamp'
        ];
        
        for (const selector of timeSelectors) {
            const element = emailElement.querySelector(selector);
            if (element) {
                return element.getAttribute('title') || element.textContent.trim();
            }
        }
        
        return new Date().toISOString();
    }
    
    // Auto-process visible emails in batches
    async processVisibleEmails() {
        if (!this.ai.isConfigured() || this.processing) return;
        
        this.processing = true;
        
        try {
            const emailElements = document.querySelectorAll('.zA, .aKS, .TC');
            const newEmails = [];
            
            for (const emailElement of emailElements) {
                const emailId = this.getEmailId(emailElement);
                
                if (!emailId || this.processedEmails.has(emailId)) {
                    continue;
                }
                
                const emailContent = this.extractEmailContent(emailElement);
                if (!emailContent) continue;
                
                newEmails.push({ element: emailElement, content: emailContent, id: emailId });
                
                if (newEmails.length >= this.batchSize) {
                    break; // Process in batches
                }
            }
            
            // Process the batch
            for (const email of newEmails) {
                await this.processEmail(email.element, email.content, email.id);
                await new Promise(resolve => setTimeout(resolve, 200)); // Small delay between processing
            }
            
        } catch (error) {
            console.error('Email processing error:', error);
        } finally {
            this.processing = false;
        }
    }
    
    async processEmail(emailElement, emailContent, emailId) {
        try {
            // Process email with AI (with error handling for each service)
            const [labels, isNewsletter, priority] = await Promise.allSettled([
                this.ai.suggestLabels(emailContent),
                this.ai.detectNewsletter(emailContent),
                this.ai.assessPriority(emailContent)
            ]);
            
            const suggestions = {
                labels: labels.status === 'fulfilled' ? labels.value : null,
                isNewsletter: isNewsletter.status === 'fulfilled' ? isNewsletter.value : false,
                priority: priority.status === 'fulfilled' ? priority.value : 'normal',
                emailId: emailId
            };
            
            // Apply suggestions to Gmail interface
            this.applySuggestions(emailElement, suggestions);
            
            this.processedEmails.add(emailId);
            
        } catch (error) {
            console.error('Individual email processing error:', error);
        }
    }
    
    getEmailId(emailElement) {
        return emailElement.id || 
               emailElement.dataset.threadId || 
               emailElement.dataset.messageId ||
               emailElement.getAttribute('data-legacy-thread-id') ||
               Math.random().toString(36);
    }
    
    applySuggestions(emailElement, suggestions) {
        // Add visual indicators for AI suggestions
        this.addAIIndicators(emailElement, suggestions);
        
        // Store suggestions for later use
        emailElement.dataset.aiSuggestions = JSON.stringify(suggestions);
        
        // Add click handler for applying suggestions
        this.addSuggestionClickHandler(emailElement, suggestions);
    }
    
    addAIIndicators(emailElement, suggestions) {
        // Remove existing indicators
        const existingIndicators = emailElement.querySelectorAll('.ai-indicator');
        existingIndicators.forEach(indicator => indicator.remove());
        
        const indicatorContainer = document.createElement('div');
        indicatorContainer.className = 'ai-indicator';
        indicatorContainer.style.cssText = `
            position: absolute;
            top: 4px;
            right: 4px;
            display: flex;
            gap: 4px;
            z-index: 100;
            font-family: 'Google Sans', sans-serif;
        `;
        
        // Priority indicator
        if (suggestions.priority === 'high') {
            const priorityBadge = this.createBadge('🔴', 'High Priority', '#ea4335');
            indicatorContainer.appendChild(priorityBadge);
        } else if (suggestions.priority === 'medium') {
            const priorityBadge = this.createBadge('🟡', 'Medium Priority', '#fbbc04');
            indicatorContainer.appendChild(priorityBadge);
        }
        
        // Newsletter indicator
        if (suggestions.isNewsletter) {
            const newsletterBadge = this.createBadge('📰', 'Newsletter/Promotional', '#34a853');
            indicatorContainer.appendChild(newsletterBadge);
        }
        
        // Label suggestions indicator
        if (suggestions.labels && suggestions.labels.length > 0) {
            const labelBadge = this.createBadge('🏷️', `Suggested labels: ${suggestions.labels.join(', ')}`, '#1a73e8');
            labelBadge.style.cursor = 'pointer';
            labelBadge.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showLabelSuggestionDialog(suggestions.labels);
            });
            indicatorContainer.appendChild(labelBadge);
        }
        
        // Find a good place to insert the indicators
        const targetElement = emailElement.querySelector('.yX') || 
                            emailElement.querySelector('.aKS') || 
                            emailElement;
        
        if (targetElement) {
            targetElement.style.position = 'relative';
            targetElement.appendChild(indicatorContainer);
        }
    }
    
    createBadge(emoji, title, color) {
        const badge = document.createElement('span');
        badge.textContent = emoji;
        badge.title = title;
        badge.style.cssText = `
            font-size: 12px;
            padding: 2px 4px;
            border-radius: 3px;
            background: ${color}15;
            border: 1px solid ${color}30;
            display: inline-block;
        `;
        return badge;
    }
    
    addSuggestionClickHandler(emailElement, suggestions) {
        // Add a context menu or click handler for applying suggestions
        emailElement.addEventListener('contextmenu', (e) => {
            if (e.ctrlKey || e.metaKey) { // Ctrl+right-click or Cmd+right-click
                e.preventDefault();
                this.showSuggestionMenu(e, suggestions);
            }
        });
    }
    
    showLabelSuggestionDialog(suggestedLabels) {
        const dialog = document.createElement('div');
        dialog.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            border: 1px solid #dadce0;
            border-radius: 8px;
            box-shadow: 0 4px 16px rgba(0,0,0,0.2);
            padding: 16px;
            z-index: 10000;
            font-family: 'Google Sans', sans-serif;
            max-width: 300px;
        `;
        
        dialog.innerHTML = `
            <h3 style="margin: 0 0 12px 0; font-size: 16px;">AI Suggested Labels</h3>
            <p style="margin: 0 0 12px 0; color: #5f6368; font-size: 14px;">
                Apply these suggested labels to this email:
            </p>
            <div style="margin-bottom: 16px;">
                ${suggestedLabels.map(label => `
                    <span style="
                        display: inline-block;
                        background: #e8f0fe;
                        color: #1a73e8;
                        padding: 4px 8px;
                        border-radius: 4px;
                        margin: 2px;
                        font-size: 12px;
                    ">${label}</span>
                `).join('')}
            </div>
            <div style="text-align: right;">
                <button id="ai-cancel-labels" style="
                    background: #f8f9fa;
                    border: 1px solid #dadce0;
                    border-radius: 4px;
                    padding: 6px 12px;
                    margin-right: 8px;
                    cursor: pointer;
                ">Cancel</button>
                <button id="ai-apply-labels" style="
                    background: #1a73e8;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    padding: 6px 12px;
                    cursor: pointer;
                ">Apply Labels</button>
            </div>
        `;
        
        document.body.appendChild(dialog);
        
        dialog.querySelector('#ai-cancel-labels').addEventListener('click', () => {
            dialog.remove();
        });
        
        dialog.querySelector('#ai-apply-labels').addEventListener('click', () => {
            // Here you would integrate with Gmail's labeling API
            alert(`Labels would be applied: ${suggestedLabels.join(', ')}\n\n(Integration with Gmail's labeling system would be implemented here)`);
            dialog.remove();
        });
        
        // Close on outside click
        setTimeout(() => {
            document.addEventListener('click', function closeDialog(e) {
                if (!dialog.contains(e.target)) {
                    dialog.remove();
                    document.removeEventListener('click', closeDialog);
                }
            });
        }, 100);
    }
    
    showSuggestionMenu(event, suggestions) {
        const menu = document.createElement('div');
        menu.style.cssText = `
            position: fixed;
            left: ${event.pageX}px;
            top: ${event.pageY}px;
            background: white;
            border: 1px solid #dadce0;
            border-radius: 4px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            z-index: 10000;
            font-family: 'Google Sans', sans-serif;
            font-size: 14px;
            min-width: 200px;
        `;
        
        let menuItems = '';
        
        if (suggestions.labels && suggestions.labels.length > 0) {
            menuItems += `<div class="ai-menu-item" data-action="apply-labels">🏷️ Apply suggested labels</div>`;
        }
        
        if (suggestions.isNewsletter) {
            menuItems += `<div class="ai-menu-item" data-action="mark-newsletter">📰 Mark as newsletter</div>`;
        }
        
        if (suggestions.priority !== 'normal') {
            menuItems += `<div class="ai-menu-item" data-action="set-priority">⭐ Set ${suggestions.priority} priority</div>`;
        }
        
        menu.innerHTML = menuItems;
        
        // Add styles and event listeners for menu items
        menu.querySelectorAll('.ai-menu-item').forEach(item => {
            item.style.cssText = `
                padding: 8px 12px;
                cursor: pointer;
                border-bottom: 1px solid #f0f0f0;
            `;
            
            item.addEventListener('mouseenter', () => {
                item.style.backgroundColor = '#f8f9fa';
            });
            
            item.addEventListener('mouseleave', () => {
                item.style.backgroundColor = 'white';
            });
            
            item.addEventListener('click', () => {
                const action = item.dataset.action;
                this.handleSuggestionAction(action, suggestions);
                menu.remove();
            });
        });
        
        document.body.appendChild(menu);
        
        // Remove menu on outside click
        setTimeout(() => {
            document.addEventListener('click', function removeMenu() {
                menu.remove();
                document.removeEventListener('click', removeMenu);
            });
        }, 100);
    }
    
    handleSuggestionAction(action, suggestions) {
        switch (action) {
            case 'apply-labels':
                this.showLabelSuggestionDialog(suggestions.labels);
                break;
            case 'mark-newsletter':
                alert('Newsletter handling would be implemented here');
                break;
            case 'set-priority':
                alert(`Priority setting (${suggestions.priority}) would be implemented here`);
                break;
        }
    }
}

// Global instances
let aiService = null;
let emailAnalyzer = null;

// Initialize AI services when script loads
(async function initializeAI() {
    try {
        aiService = new AIService();
        await aiService.loadSettings();
        emailAnalyzer = new EmailAnalyzer(aiService);
        
        console.log('Gmail AI Service initialized');
        
        // Start processing emails every 5 seconds
        setInterval(() => {
            if (aiService.isConfigured()) {
                emailAnalyzer.processVisibleEmails();
            }
        }, 5000);
        
    } catch (error) {
        console.error('AI service initialization error:', error);
    }
})();