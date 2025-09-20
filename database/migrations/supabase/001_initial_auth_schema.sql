-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- =====================================================
-- CORE PLATFORM TABLES
-- =====================================================

-- Organizations (for team/company accounts)
CREATE TABLE public.organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    owner_id UUID NOT NULL REFERENCES auth.users(id),
    settings JSONB DEFAULT '{}'::jsonb,
    plan_type TEXT DEFAULT 'free',
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Organization members
CREATE TABLE public.organization_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'user', -- 'super_admin', 'admin', 'manager', 'user', 'viewer'
    permissions JSONB DEFAULT '[]'::jsonb,
    status TEXT DEFAULT 'active',
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, user_id)
);

-- User profiles (extends Supabase auth.users)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    current_organization_id UUID REFERENCES organizations(id),
    global_role TEXT DEFAULT 'user', -- Platform-wide role for super admins
    preferences JSONB DEFAULT '{
        "theme": "light",
        "notifications": true,
        "language": "en"
    }'::jsonb,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Platform products/services
CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug TEXT UNIQUE NOT NULL, -- 'mailsense', 'seo-manager', 'analytics-pro', etc.
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    status TEXT DEFAULT 'active', -- 'active', 'beta', 'coming_soon', 'deprecated'
    features JSONB DEFAULT '[]'::jsonb,
    settings_schema JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Product subscriptions
CREATE TABLE public.product_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    status TEXT DEFAULT 'active', -- 'active', 'trialing', 'cancelled', 'past_due'
    trial_ends_at TIMESTAMPTZ,
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    settings JSONB DEFAULT '{}'::jsonb,
    usage_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, product_id)
);

-- Platform-wide activity feed
CREATE TABLE public.activity_feed (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    product_id UUID REFERENCES products(id),
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id UUID,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id),
    product_id UUID REFERENCES products(id),
    type TEXT NOT NULL, -- 'info', 'warning', 'error', 'success'
    title TEXT NOT NULL,
    message TEXT,
    action_url TEXT,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- API keys for external integrations
CREATE TABLE public.api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id), -- NULL for platform-wide keys
    name TEXT NOT NULL,
    key_hash TEXT NOT NULL UNIQUE, -- Store hashed version
    key_preview TEXT NOT NULL, -- First 8 chars for identification
    permissions JSONB DEFAULT '[]'::jsonb,
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES auth.users(id)
);

-- System audit logs
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id),
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Core platform indexes
CREATE INDEX idx_org_members_user ON organization_members(user_id);
CREATE INDEX idx_org_members_org ON organization_members(organization_id);
CREATE INDEX idx_profiles_org ON profiles(current_organization_id);
CREATE INDEX idx_product_subs_org ON product_subscriptions(organization_id);
CREATE INDEX idx_product_subs_status ON product_subscriptions(status);
CREATE INDEX idx_activity_feed_org ON activity_feed(organization_id, created_at DESC);
CREATE INDEX idx_notifications_user ON notifications(user_id, read_at) WHERE read_at IS NULL;
CREATE INDEX idx_api_keys_org ON api_keys(organization_id);
CREATE INDEX idx_audit_logs_org ON audit_logs(organization_id, created_at DESC);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id, created_at DESC);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to check organization membership
CREATE OR REPLACE FUNCTION is_org_member(org_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_id = org_id
        AND organization_members.user_id = user_id
        AND status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_org_admin(org_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_id = org_id
        AND organization_members.user_id = user_id
        AND role IN ('super_admin', 'admin')
        AND status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is super admin
CREATE OR REPLACE FUNCTION is_super_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles
        WHERE id = user_id
        AND global_role = 'super_admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Organizations policies
CREATE POLICY "Users can view organizations they belong to" ON organizations
    FOR SELECT USING (is_org_member(id, auth.uid()) OR is_super_admin(auth.uid()));

CREATE POLICY "Users can create organizations" ON organizations
    FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners and admins can update organizations" ON organizations
    FOR UPDATE USING (
        owner_id = auth.uid() 
        OR is_org_admin(id, auth.uid()) 
        OR is_super_admin(auth.uid())
    );

-- Organization members policies
CREATE POLICY "Members can view their organization members" ON organization_members
    FOR SELECT USING (
        is_org_member(organization_id, auth.uid()) 
        OR is_super_admin(auth.uid())
    );

CREATE POLICY "Admins can manage organization members" ON organization_members
    FOR ALL USING (
        is_org_admin(organization_id, auth.uid()) 
        OR is_super_admin(auth.uid())
    );

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Super admins can view all profiles" ON profiles
    FOR SELECT USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update any profile" ON profiles
    FOR UPDATE USING (is_super_admin(auth.uid()));

-- Products policies (public read, admin write)
CREATE POLICY "Anyone can view active products" ON products
    FOR SELECT USING (status = 'active');

CREATE POLICY "Super admins can manage products" ON products
    FOR ALL USING (is_super_admin(auth.uid()));

-- Product subscriptions policies  
CREATE POLICY "Members can view their org subscriptions" ON product_subscriptions
    FOR SELECT USING (
        is_org_member(organization_id, auth.uid()) 
        OR is_super_admin(auth.uid())
    );

CREATE POLICY "Admins can manage org subscriptions" ON product_subscriptions
    FOR ALL USING (
        is_org_admin(organization_id, auth.uid()) 
        OR is_super_admin(auth.uid())
    );

-- Activity feed policies
CREATE POLICY "Members can view their org activity" ON activity_feed
    FOR SELECT USING (
        is_org_member(organization_id, auth.uid()) 
        OR is_super_admin(auth.uid())
    );

CREATE POLICY "System can insert activity" ON activity_feed
    FOR INSERT WITH CHECK (true); -- Will be controlled by service role

-- Notifications policies
CREATE POLICY "Users can view their notifications" ON notifications
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their notifications" ON notifications
    FOR UPDATE USING (user_id = auth.uid());

-- API keys policies
CREATE POLICY "Members can view their org API keys" ON api_keys
    FOR SELECT USING (
        is_org_member(organization_id, auth.uid()) 
        OR is_super_admin(auth.uid())
    );

CREATE POLICY "Admins can manage org API keys" ON api_keys
    FOR ALL USING (
        is_org_admin(organization_id, auth.uid()) 
        OR is_super_admin(auth.uid())
    );

-- Audit logs policies
CREATE POLICY "Admins can view their org audit logs" ON audit_logs
    FOR SELECT USING (
        is_org_admin(organization_id, auth.uid()) 
        OR is_super_admin(auth.uid())
    );

CREATE POLICY "System can insert audit logs" ON audit_logs
    FOR INSERT WITH CHECK (true); -- Will be controlled by service role

-- =====================================================
-- TRIGGERS AND FUNCTIONS
-- =====================================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to relevant tables
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_product_subscriptions_updated_at BEFORE UPDATE ON product_subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create profile and organization on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    org_id UUID;
    org_name TEXT;
BEGIN
    -- Extract name from metadata or use email prefix
    org_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        split_part(NEW.email, '@', 1)
    );
    
    -- Create profile
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
        NEW.id, 
        NEW.email,
        org_name
    );
    
    -- Create personal organization
    INSERT INTO public.organizations (name, owner_id)
    VALUES (org_name || '''s Organization', NEW.id)
    RETURNING id INTO org_id;
    
    -- Add user as owner
    INSERT INTO public.organization_members (organization_id, user_id, role)
    VALUES (org_id, NEW.id, 'admin');
    
    -- Set as current organization
    UPDATE public.profiles
    SET current_organization_id = org_id
    WHERE id = NEW.id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Audit log trigger
CREATE OR REPLACE FUNCTION audit_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.audit_logs (
            organization_id,
            user_id,
            action,
            resource_type,
            resource_id,
            new_values
        ) VALUES (
            COALESCE(NEW.organization_id, (SELECT current_organization_id FROM profiles WHERE id = auth.uid())),
            auth.uid(),
            TG_OP,
            TG_TABLE_NAME,
            NEW.id::TEXT,
            to_jsonb(NEW)
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO public.audit_logs (
            organization_id,
            user_id,
            action,
            resource_type,
            resource_id,
            old_values,
            new_values
        ) VALUES (
            COALESCE(NEW.organization_id, (SELECT current_organization_id FROM profiles WHERE id = auth.uid())),
            auth.uid(),
            TG_OP,
            TG_TABLE_NAME,
            NEW.id::TEXT,
            to_jsonb(OLD),
            to_jsonb(NEW)
        );
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO public.audit_logs (
            organization_id,
            user_id,
            action,
            resource_type,
            resource_id,
            old_values
        ) VALUES (
            COALESCE(OLD.organization_id, (SELECT current_organization_id FROM profiles WHERE id = auth.uid())),
            auth.uid(),
            TG_OP,
            TG_TABLE_NAME,
            OLD.id::TEXT,
            to_jsonb(OLD)
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- SEED DATA
-- =====================================================

-- Insert default products
INSERT INTO public.products (slug, name, description, icon, status, features) VALUES
('mailsense', 'MailSense', 'AI-powered email management with smart categorization and summaries', '📧', 'active', '["ai_categorization", "smart_filters", "email_summaries", "multi_account"]'),
('seo-manager', 'SEO Manager', 'Automated WordPress SEO optimization with AI recommendations', '🔍', 'active', '["wordpress_integration", "ai_seo", "bulk_optimization", "performance_tracking"]'),
('analytics-pro', 'Analytics Pro', 'Advanced business analytics with real-time dashboards and insights', '📊', 'active', '["real_time_analytics", "custom_dashboards", "data_export", "advanced_filters"]'),
('travel-platform', 'Travel Platform', 'Community-driven travel platform with business directory and reviews', '✈️', 'active', '["business_directory", "reviews", "community_submissions", "travel_guides"]'),
('content-hub', 'Content Hub', 'Multi-platform content management with AI generation and scheduling', '📝', 'active', '["ai_content", "multi_platform", "scheduling", "collaboration"]'),
('event-widget', 'Event Widget', 'Event management system with RSVP tracking and notifications', '📅', 'active', '["rsvp_tracking", "notifications", "calendar_integration", "analytics"]');

-- Insert system admin profile (will be created when first super admin signs up)
-- This is handled by the trigger, no manual insert needed
