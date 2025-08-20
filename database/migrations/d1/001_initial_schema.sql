-- D1 Database Schema for Nyuchi Platform Application Data
-- This handles MailSense, SEO Manager, Analytics, etc.
-- User profiles remain in Supabase

-- =====================================================
-- ORGANIZATIONS & USERS
-- =====================================================

-- Organizations
CREATE TABLE IF NOT EXISTS organizations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    settings TEXT DEFAULT '{}',
    plan_type TEXT DEFAULT 'free',
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Users (replicated from Supabase for quick access)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'user',
    organization_id TEXT NOT NULL,
    permissions TEXT DEFAULT '[]',
    status TEXT DEFAULT 'active',
    last_login_at DATETIME,
    suspension_reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

-- =====================================================
-- MAILSENSE TABLES
-- =====================================================

-- Mail accounts connected by users
CREATE TABLE IF NOT EXISTS mail_accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organization_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    email TEXT NOT NULL,
    provider TEXT NOT NULL,
    account_name TEXT,
    access_token TEXT,
    refresh_token TEXT,
    status TEXT DEFAULT 'active',
    last_sync_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id),
    UNIQUE(organization_id, email)
);

-- Email categories and labels
CREATE TABLE IF NOT EXISTS mail_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organization_id TEXT NOT NULL,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#3b82f6',
    icon TEXT DEFAULT 'folder',
    is_system INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id),
    UNIQUE(organization_id, name)
);

-- Email messages
CREATE TABLE IF NOT EXISTS mail_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER NOT NULL,
    message_id TEXT NOT NULL,
    thread_id TEXT,
    subject TEXT,
    sender TEXT NOT NULL,
    recipient TEXT,
    content TEXT,
    category TEXT,
    priority TEXT DEFAULT 'normal',
    is_read INTEGER DEFAULT 0,
    is_starred INTEGER DEFAULT 0,
    attachments TEXT DEFAULT '[]',
    ai_summary TEXT,
    received_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES mail_accounts(id),
    UNIQUE(account_id, message_id)
);

-- Smart filters and rules
CREATE TABLE IF NOT EXISTS mail_filters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organization_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    conditions TEXT NOT NULL,
    actions TEXT NOT NULL,
    is_active INTEGER DEFAULT 1,
    priority INTEGER DEFAULT 5,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

-- =====================================================
-- SEO MANAGER TABLES
-- =====================================================

-- WordPress sites managed by SEO Manager
CREATE TABLE IF NOT EXISTS seo_sites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organization_id TEXT NOT NULL,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    wp_api_key TEXT,
    wp_username TEXT,
    status TEXT DEFAULT 'active',
    last_sync_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

-- SEO optimization tasks
CREATE TABLE IF NOT EXISTS seo_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    site_id INTEGER NOT NULL,
    task_type TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    input_data TEXT,
    output_data TEXT,
    error_message TEXT,
    completed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (site_id) REFERENCES seo_sites(id)
);

-- =====================================================
-- ANALYTICS PRO TABLES
-- =====================================================

-- Analytics events
CREATE TABLE IF NOT EXISTS analytics_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organization_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    event_data TEXT DEFAULT '{}',
    user_id TEXT,
    session_id TEXT,
    user_agent TEXT,
    ip_address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

-- Analytics dashboards
CREATE TABLE IF NOT EXISTS analytics_dashboards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organization_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    widgets TEXT DEFAULT '[]',
    layout TEXT DEFAULT 'grid',
    is_public INTEGER DEFAULT 0,
    created_by TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

-- =====================================================
-- TRAVEL PLATFORM TABLES
-- =====================================================

-- Travel submissions
CREATE TABLE IF NOT EXISTS travel_submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organization_id TEXT NOT NULL,
    submitter_name TEXT NOT NULL,
    submitter_email TEXT NOT NULL,
    business_name TEXT NOT NULL,
    business_type TEXT NOT NULL,
    location TEXT NOT NULL,
    description TEXT,
    website TEXT,
    phone TEXT,
    images TEXT DEFAULT '[]',
    status TEXT DEFAULT 'pending',
    moderated_by TEXT,
    moderated_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

-- =====================================================
-- CONTENT HUB TABLES
-- =====================================================

-- Content items
CREATE TABLE IF NOT EXISTS content_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organization_id TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    content_type TEXT NOT NULL,
    platform TEXT NOT NULL,
    status TEXT DEFAULT 'draft',
    ai_generated INTEGER DEFAULT 0,
    scheduled_at DATETIME,
    published_at DATETIME,
    created_by TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

-- =====================================================
-- EVENT WIDGET TABLES
-- =====================================================

-- Events
CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organization_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    location TEXT,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    timezone TEXT DEFAULT 'UTC',
    max_attendees INTEGER,
    rsvp_required INTEGER DEFAULT 1,
    status TEXT DEFAULT 'active',
    created_by TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

-- Event RSVPs
CREATE TABLE IF NOT EXISTS event_rsvps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL,
    attendee_name TEXT NOT NULL,
    attendee_email TEXT NOT NULL,
    status TEXT DEFAULT 'attending',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(id)
);

-- =====================================================
-- SYSTEM TABLES
-- =====================================================

-- System logs for admin monitoring
CREATE TABLE IF NOT EXISTS system_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    level TEXT NOT NULL,
    message TEXT NOT NULL,
    category TEXT NOT NULL,
    user_id TEXT,
    organization_id TEXT,
    metadata TEXT DEFAULT '{}',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- API usage tracking
CREATE TABLE IF NOT EXISTS api_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organization_id TEXT NOT NULL,
    user_id TEXT,
    endpoint TEXT NOT NULL,
    method TEXT NOT NULL,
    status_code INTEGER NOT NULL,
    response_time INTEGER,
    user_agent TEXT,
    ip_address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- INDEXES
-- =====================================================

-- User and organization indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_org ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- MailSense indexes
CREATE INDEX IF NOT EXISTS idx_mail_accounts_org ON mail_accounts(organization_id);
CREATE INDEX IF NOT EXISTS idx_mail_accounts_user ON mail_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_mail_messages_account ON mail_messages(account_id);
CREATE INDEX IF NOT EXISTS idx_mail_messages_received ON mail_messages(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_mail_messages_thread ON mail_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_mail_categories_org ON mail_categories(organization_id);
CREATE INDEX IF NOT EXISTS idx_mail_filters_org ON mail_filters(organization_id);

-- SEO Manager indexes
CREATE INDEX IF NOT EXISTS idx_seo_sites_org ON seo_sites(organization_id);
CREATE INDEX IF NOT EXISTS idx_seo_tasks_site ON seo_tasks(site_id);
CREATE INDEX IF NOT EXISTS idx_seo_tasks_status ON seo_tasks(status);

-- Analytics indexes
CREATE INDEX IF NOT EXISTS idx_analytics_events_org ON analytics_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created ON analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_dashboards_org ON analytics_dashboards(organization_id);

-- Travel platform indexes
CREATE INDEX IF NOT EXISTS idx_travel_submissions_org ON travel_submissions(organization_id);
CREATE INDEX IF NOT EXISTS idx_travel_submissions_status ON travel_submissions(status);

-- Content hub indexes
CREATE INDEX IF NOT EXISTS idx_content_items_org ON content_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_content_items_status ON content_items(status);
CREATE INDEX IF NOT EXISTS idx_content_items_type ON content_items(content_type);

-- Event widget indexes
CREATE INDEX IF NOT EXISTS idx_events_org ON events(organization_id);
CREATE INDEX IF NOT EXISTS idx_events_start_time ON events(start_time);
CREATE INDEX IF NOT EXISTS idx_event_rsvps_event ON event_rsvps(event_id);

-- System indexes
CREATE INDEX IF NOT EXISTS idx_system_logs_created ON system_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level);
CREATE INDEX IF NOT EXISTS idx_api_usage_org ON api_usage(organization_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_created ON api_usage(created_at);
