-- D1 Database Seed Data for Nyuchi Platform

-- Insert products
INSERT INTO products (slug, name, description, icon, status, features) VALUES
('mail-organizer', 'Mail Organizer', 'AI-powered email management and organization', 'mail', 'active',
 '["Smart categorization", "AI email summaries", "Smart filters", "Priority inbox", "Auto-replies", "Email analytics", "Gmail integration"]'
),
('seo-manager', 'SEO Manager', 'Automated WordPress SEO optimization', 'search', 'active',
 '["AI optimization", "WordPress integration", "Automated reports", "Bulk updates", "Keyword tracking", "Performance monitoring"]'
),
('analytics-pro', 'Analytics Pro', 'Advanced business analytics and insights', 'chart', 'active',
 '["Real-time analytics", "Custom dashboards", "Data exports", "API access", "Team collaboration", "Advanced reporting"]'
),
('travel-platform', 'Travel Platform', 'Community-driven travel platform and business directory', 'globe', 'active',
 '["Business submissions", "Community reviews", "Travel guides", "Local recommendations", "Interactive maps", "Social features"]'
),
('content-hub', 'Content Hub', 'Multi-platform content management system', 'file-text', 'active',
 '["Multi-platform sync", "Content calendar", "Team collaboration", "Version control", "AI content generation", "Analytics"]'
),
('event-widget', 'Event Widget', 'Event management and notification system', 'calendar', 'active',
 '["Event creation", "RSVP management", "Notifications", "Calendar integration", "Social sharing", "Analytics"]'
);

-- Insert Mail Organizer plans
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
FROM products WHERE slug = 'mail-organizer'
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
FROM products WHERE slug = 'mail-organizer'
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
FROM products WHERE slug = 'mail-organizer'
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
FROM products WHERE slug = 'mail-organizer';

-- Insert SEO Manager plans
INSERT INTO subscription_plans (product_id, name, slug, price_monthly, price_yearly, features, limits, sort_order)
SELECT
    id,
    'Free',
    'free',
    0,
    0,
    '{"wordpress_sites": 1, "basic_optimization": true, "manual_updates": true}'::jsonb,
    '{"wordpress_sites": 1, "optimizations_per_month": 10, "api_calls_per_month": 100}'::jsonb,
    1
FROM products WHERE slug = 'seo-manager'
UNION ALL
SELECT
    id,
    'Starter',
    'starter',
    29,
    290,
    '{"wordpress_sites": 3, "automated_optimization": true, "email_support": true}'::jsonb,
    '{"wordpress_sites": 3, "optimizations_per_month": 100, "api_calls_per_month": 1000}'::jsonb,
    2
FROM products WHERE slug = 'seo-manager'
UNION ALL
SELECT
    id,
    'Professional',
    'professional',
    99,
    990,
    '{"wordpress_sites": 10, "api_access": true, "priority_support": true}'::jsonb,
    '{"wordpress_sites": 10, "optimizations_per_month": 500, "api_calls_per_month": 5000}'::jsonb,
    3
FROM products WHERE slug = 'seo-manager'
UNION ALL
SELECT
    id,
    'Agency',
    'agency',
    299,
    2990,
    '{"wordpress_sites": -1, "white_label": true, "dedicated_support": true}'::jsonb,
    '{"wordpress_sites": -1, "optimizations_per_month": -1, "api_calls_per_month": -1}'::jsonb,
    4
FROM products WHERE slug = 'seo-manager';

-- Insert Analytics Pro plans
INSERT INTO subscription_plans (product_id, name, slug, price_monthly, price_yearly, features, limits, sort_order)
SELECT
    id,
    'Free',
    'free',
    0,
    0,
    '{"basic_analytics": true, "simple_dashboards": true}'::jsonb,
    '{"data_points_per_month": 1000, "api_calls_per_month": 100}'::jsonb,
    1
FROM products WHERE slug = 'analytics-pro'
UNION ALL
SELECT
    id,
    'Pro',
    'pro',
    49,
    490,
    '{"real_time_analytics": true, "custom_dashboards": true, "data_exports": true}'::jsonb,
    '{"data_points_per_month": 10000, "api_calls_per_month": 1000}'::jsonb,
    2
FROM products WHERE slug = 'analytics-pro'
UNION ALL
SELECT
    id,
    'Business',
    'business',
    149,
    1490,
    '{"team_collaboration": true, "advanced_reporting": true, "api_access": true}'::jsonb,
    '{"data_points_per_month": 100000, "api_calls_per_month": 10000}'::jsonb,
    3
FROM products WHERE slug = 'analytics-pro';

-- Insert Travel Platform plans (ALWAYS FREE)
INSERT INTO subscription_plans (product_id, name, slug, price_monthly, price_yearly, features, limits, sort_order)
SELECT
    id,
    'Free',
    'free',
    0,
    0,
    '{"unlimited_submissions": true, "all_features": true, "community_access": true}'::jsonb,
    '{"submissions": -1, "api_calls_per_month": 1000, "storage_gb": 5}'::jsonb,
    1
FROM products WHERE slug = 'travel-platform';

-- Insert Content Hub plans
INSERT INTO subscription_plans (product_id, name, slug, price_monthly, price_yearly, features, limits, sort_order)
SELECT
    id,
    'Free',
    'free',
    0,
    0,
    '{"basic_content_management": true, "3_platforms": true}'::jsonb,
    '{"content_items": 100, "platforms": 3, "api_calls_per_month": 500}'::jsonb,
    1
FROM products WHERE slug = 'content-hub'
UNION ALL
SELECT
    id,
    'Pro',
    'pro',
    39,
    390,
    '{"advanced_content_management": true, "unlimited_platforms": true, "ai_generation": true}'::jsonb,
    '{"content_items": 1000, "platforms": -1, "api_calls_per_month": 5000}'::jsonb,
    2
FROM products WHERE slug = 'content-hub'
UNION ALL
SELECT
    id,
    'Business',
    'business',
    99,
    990,
    '{"team_collaboration": true, "advanced_analytics": true, "white_label": true}'::jsonb,
    '{"content_items": -1, "platforms": -1, "api_calls_per_month": 25000}'::jsonb,
    3
FROM products WHERE slug = 'content-hub';

-- Insert Event Widget plans
INSERT INTO subscription_plans (product_id, name, slug, price_monthly, price_yearly, features, limits, sort_order)
SELECT
    id,
    'Free',
    'free',
    0,
    0,
    '{"basic_event_management": true, "rsvp_tracking": true}'::jsonb,
    '{"events_per_month": 5, "attendees_per_event": 100, "api_calls_per_month": 200}'::jsonb,
    1
FROM products WHERE slug = 'event-widget'
UNION ALL
SELECT
    id,
    'Pro',
    'pro',
    29,
    290,
    '{"advanced_event_management": true, "notifications": true, "analytics": true}'::jsonb,
    '{"events_per_month": 50, "attendees_per_event": 1000, "api_calls_per_month": 2000}'::jsonb,
    2
FROM products WHERE slug = 'event-widget'
UNION ALL
SELECT
    id,
    'Business',
    'business',
    79,
    790,
    '{"unlimited_events": true, "team_management": true, "custom_branding": true}'::jsonb,
    '{"events_per_month": -1, "attendees_per_event": -1, "api_calls_per_month": 10000}'::jsonb,
    3
FROM products WHERE slug = 'event-widget';

-- Insert default mail categories
INSERT INTO mail_categories (organization_id, name, color, icon, is_system, sort_order) VALUES
('default', 'Inbox', '#3b82f6', 'inbox', 1, 1),
('default', 'Work', '#10b981', 'briefcase', 0, 2),
('default', 'Personal', '#f59e0b', 'user', 0, 3),
('default', 'Newsletters', '#8b5cf6', 'newspaper', 0, 4),
('default', 'Finance', '#ef4444', 'credit-card', 0, 5),
('default', 'Travel', '#06b6d4', 'plane', 0, 6),
('default', 'Shopping', '#ec4899', 'shopping-cart', 0, 7),
('default', 'Social', '#84cc16', 'users', 0, 8);
