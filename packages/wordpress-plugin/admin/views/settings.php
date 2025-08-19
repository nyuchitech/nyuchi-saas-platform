<?php
if (!defined('ABSPATH')) {
    exit;
}

$api_key = get_option('nyuchi_api_key');
$auto_sync = get_option('nyuchi_auto_sync', true);
?>

<div class="wrap">
    <h1><?php echo esc_html(get_admin_page_title()); ?></h1>
    
    <div class="nyuchi-header">
        <h2>🚀 Nyuchi Platform</h2>
        <p><em>Your premier SEO management platform</em></p>
    </div>
    
    <?php if (empty($api_key)): ?>
        <div class="notice notice-warning">
            <p><strong>Get Started:</strong> Connect your site to Nyuchi Platform to enable powerful SEO automation.</p>
        </div>
    <?php else: ?>
        <div class="notice notice-success">
            <p><strong>Connected!</strong> Your site is connected to Nyuchi Platform.</p>
        </div>
    <?php endif; ?>
    
    <form method="post" action="options.php">
        <?php settings_fields('nyuchi_settings'); ?>
        
        <table class="form-table">
            <tr>
                <th scope="row">
                    <label for="nyuchi_api_key">API Key</label>
                </th>
                <td>
                    <input type="password" name="nyuchi_api_key" id="nyuchi_api_key"
                           value="<?php echo esc_attr($api_key); ?>" 
                           class="regular-text" />
                    <p class="description">
                        Get your API key from 
                        <a href="https://dashboard.nyuchi.com/settings/api" target="_blank">
                            Nyuchi Dashboard
                        </a>
                    </p>
                </td>
            </tr>
            
            <tr>
                <th scope="row">
                    <label for="nyuchi_auto_sync">Auto Sync</label>
                </th>
                <td>
                    <label>
                        <input type="checkbox" name="nyuchi_auto_sync" id="nyuchi_auto_sync" value="1"
                               <?php checked($auto_sync, 1); ?> />
                        Enable automatic synchronization with Nyuchi Platform
                    </label>
                    <p class="description">
                        When enabled, your site data will be automatically synced with the platform.
                    </p>
                </td>
            </tr>
        </table>
        
        <?php submit_button(); ?>
    </form>
    
    <?php if (!empty($api_key)): ?>
        <div class="nyuchi-dashboard-section">
            <h3>🎯 Manage Your SEO</h3>
            <p>Access your complete SEO management dashboard with advanced tools and analytics.</p>
            <a href="https://dashboard.nyuchi.com" target="_blank" class="button button-primary button-hero">
                Open Nyuchi Dashboard →
            </a>
        </div>
        
        <div class="nyuchi-features">
            <h3>✨ Platform Features</h3>
            <div class="feature-grid">
                <div class="feature-item">
                    <h4>🤖 AI-Powered SEO</h4>
                    <p>Intelligent optimization for titles, descriptions, and keywords</p>
                </div>
                <div class="feature-item">
                    <h4>📊 Advanced Analytics</h4>
                    <p>Comprehensive SEO performance tracking and insights</p>
                </div>
                <div class="feature-item">
                    <h4>⏰ Automated Updates</h4>
                    <p>Scheduled optimization and maintenance across all sites</p>
                </div>
                <div class="feature-item">
                    <h4>🏢 Multi-Site Management</h4>
                    <p>Manage unlimited WordPress sites from one dashboard</p>
                </div>
            </div>
        </div>
    <?php endif; ?>
</div>

<style>
.nyuchi-header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 20px;
    border-radius: 8px;
    margin: 20px 0;
}

.nyuchi-header h2 {
    margin: 0 0 5px 0;
    color: white;
}

.nyuchi-dashboard-section {
    background: #f8f9fa;
    border: 1px solid #dee2e6;
    border-radius: 8px;
    padding: 20px;
    margin: 20px 0;
}

.feature-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 20px;
    margin-top: 15px;
}

.feature-item {
    background: white;
    padding: 15px;
    border-radius: 6px;
    border: 1px solid #e9ecef;
}

.feature-item h4 {
    margin: 0 0 8px 0;
    color: #495057;
}

.feature-item p {
    margin: 0;
    color: #6c757d;
    font-size: 14px;
}
</style>
