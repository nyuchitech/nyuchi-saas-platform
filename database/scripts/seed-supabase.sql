-- Insert products
INSERT INTO products (slug, name, description, icon, status, features) VALUES
('seo-manager', 'SEO Manager', 'Automated SEO optimization for WordPress sites', 'search', 'active', 
 '["AI-powered optimization", "Yoast integration", "Bulk updates", "Scheduled automation", "Meta tag generation", "Social media optimization"]'
),
('mailsense', 'MailSense', 'AI-powered email management and organization', 'mail', 'active',
 '["Smart categorization", "AI email summaries", "Smart filters", "Priority inbox", "Auto-replies", "Email analytics", "Gmail integration"]'
),
('analytics-pro', 'Analytics Pro', 'Advanced analytics and insights for your business', 'chart-bar', 'coming_soon',
 '["Real-time analytics", "Custom dashboards", "Data exports", "API access"]'
),
('content-hub', 'Content Hub', 'Centralized content management across platforms', 'file-text', 'coming_soon',
 '["Multi-platform sync", "Content calendar", "Team collaboration", "Version control"]'
);

-- Insert SEO Manager plans
INSERT INTO subscription_plans (product_id, name, slug, price_monthly, price_yearly, features, limits, sort_order)
SELECT 
    id,
    'Free',
    'free',
    0,
    0,
    '{"sites": 1, "basic_seo": true, "reports": "monthly"}'::jsonb,
    '{"sites": 1, "content_items": 100, "api_calls_per_month": 1000}'::jsonb,
    1
FROM products WHERE slug = 'seo-manager'
UNION ALL
SELECT 
    id,
    'Starter',
    'starter',
    29,
    290,
    '{"sites": 3, "ai_optimization": true, "reports": "weekly", "support": "email"}'::jsonb,
    '{"sites": 3, "content_items": 1000, "api_calls_per_month": 10000}'::jsonb,
    2
FROM products WHERE slug = 'seo-manager'
UNION ALL
SELECT 
    id,
    'Professional',
    'professional',
    99,
    990,
    '{"sites": 10, "ai_optimization": true, "reports": "daily", "support": "priority", "api_access": true}'::jsonb,
    '{"sites": 10, "content_items": 10000, "api_calls_per_month": 100000}'::jsonb,
    3
FROM products WHERE slug = 'seo-manager'
UNION ALL
SELECT 
    id,
    'Enterprise',
    'enterprise',
    299,
    2990,
    '{"sites": -1, "ai_optimization": true, "reports": "real-time", "support": "dedicated", "api_access": true, "white_label": true}'::jsonb,
    '{"sites": -1, "content_items": -1, "api_calls_per_month": -1}'::jsonb,
    4
FROM products WHERE slug = 'seo-manager';

-- Insert MailSense plans
INSERT INTO subscription_plans (product_id, name, slug, price_monthly, price_yearly, features, limits, sort_order)
SELECT 
    id,
    'Free',
    'free',
    0,
    0,
    '{"email_accounts": 1, "basic_categorization": true, "ai_summaries": false, "smart_filters": 5}'::jsonb,
    '{"email_accounts": 1, "ai_credits_per_month": 50, "storage_gb": 1, "api_calls_per_month": 500}'::jsonb,
    1
FROM products WHERE slug = 'mailsense'
UNION ALL
SELECT 
    id,
    'Pro',
    'pro',
    19,
    190,
    '{"email_accounts": 3, "ai_categorization": true, "ai_summaries": true, "smart_filters": 20, "priority_inbox": true}'::jsonb,
    '{"email_accounts": 3, "ai_credits_per_month": 500, "storage_gb": 10, "api_calls_per_month": 5000}'::jsonb,
    2
FROM products WHERE slug = 'mailsense'
UNION ALL
SELECT 
    id,
    'Business',
    'business',
    49,
    490,
    '{"email_accounts": 10, "ai_categorization": true, "ai_summaries": true, "smart_filters": 100, "priority_inbox": true, "team_collaboration": true}'::jsonb,
    '{"email_accounts": 10, "ai_credits_per_month": 2000, "storage_gb": 50, "api_calls_per_month": 25000}'::jsonb,
    3
FROM products WHERE slug = 'mailsense'
UNION ALL
SELECT 
    id,
    'Enterprise',
    'enterprise',
    99,
    990,
    '{"email_accounts": -1, "ai_categorization": true, "ai_summaries": true, "smart_filters": -1, "priority_inbox": true, "team_collaboration": true, "custom_integrations": true}'::jsonb,
    '{"email_accounts": -1, "ai_credits_per_month": -1, "storage_gb": -1, "api_calls_per_month": -1}'::jsonb,
    4
FROM products WHERE slug = 'mailsense';

-- Insert default MailSense categories (will be created for each organization)
-- Note: These will be created dynamically when organizations are set up
-- This is just a reference of the default categories that should be created
