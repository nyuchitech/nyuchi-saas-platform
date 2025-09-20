-- Initial schema for Nyuchi SaaS Platform
-- Creates the core tables for user management, organizations, and multi-tenancy

-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- Organizations table (for multi-tenancy)
create table public.organizations (
    id uuid primary key default uuid_generate_v4(),
    name varchar(255) not null,
    slug varchar(100) unique not null,
    description text,
    settings jsonb default '{}',
    subscription_plan varchar(50) default 'free',
    subscription_status varchar(50) default 'active',
    trial_ends_at timestamp with time zone,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

-- Profiles table (extends auth.users)
create table public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    organization_id uuid references public.organizations(id) on delete cascade,
    email varchar(255) unique not null,
    full_name varchar(255),
    avatar_url text,
    role varchar(50) default 'user',
    permissions jsonb default '[]',
    status varchar(50) default 'active',
    last_login_at timestamp with time zone,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

-- Organization members table (many-to-many relationship)
create table public.organization_members (
    id uuid primary key default uuid_generate_v4(),
    organization_id uuid references public.organizations(id) on delete cascade,
    user_id uuid references auth.users(id) on delete cascade,
    role varchar(50) default 'member',
    permissions jsonb default '[]',
    status varchar(50) default 'active',
    invited_by uuid references auth.users(id),
    invited_at timestamp with time zone default now(),
    joined_at timestamp with time zone,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now(),
    unique(organization_id, user_id)
);

-- Mail accounts table (for Mail Organizer product)
create table public.mail_accounts (
    id uuid primary key default uuid_generate_v4(),
    organization_id uuid references public.organizations(id) on delete cascade,
    user_id uuid references auth.users(id) on delete cascade,
    email varchar(255) not null,
    provider varchar(50) not null, -- gmail, outlook, etc.
    provider_id varchar(255),
    access_token text,
    refresh_token text,
    token_expires_at timestamp with time zone,
    settings jsonb default '{}',
    status varchar(50) default 'active',
    last_sync_at timestamp with time zone,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now(),
    unique(organization_id, email)
);

-- Mail categories table
create table public.mail_categories (
    id uuid primary key default uuid_generate_v4(),
    organization_id uuid references public.organizations(id) on delete cascade,
    user_id uuid references auth.users(id) on delete cascade,
    name varchar(100) not null,
    description text,
    color varchar(7) default '#3B82F6',
    rules jsonb default '{}',
    is_system boolean default false,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now(),
    unique(organization_id, user_id, name)
);

-- SEO sites table (for SEO Manager product)
create table public.seo_sites (
    id uuid primary key default uuid_generate_v4(),
    organization_id uuid references public.organizations(id) on delete cascade,
    user_id uuid references auth.users(id) on delete cascade,
    url varchar(255) not null,
    name varchar(255),
    description text,
    settings jsonb default '{}',
    status varchar(50) default 'active',
    last_crawled_at timestamp with time zone,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now(),
    unique(organization_id, url)
);

-- Analytics events table (for Analytics Pro product)
create table public.analytics_events (
    id uuid primary key default uuid_generate_v4(),
    organization_id uuid references public.organizations(id) on delete cascade,
    user_id uuid references auth.users(id),
    event_type varchar(100) not null,
    event_data jsonb default '{}',
    session_id varchar(255),
    user_agent text,
    ip_address inet,
    referrer text,
    page_url text,
    created_at timestamp with time zone default now()
);

-- Content items table (for Content Hub)
create table public.content_items (
    id uuid primary key default uuid_generate_v4(),
    organization_id uuid references public.organizations(id) on delete cascade,
    user_id uuid references auth.users(id) on delete cascade,
    title varchar(255) not null,
    content text,
    content_type varchar(50) default 'article',
    status varchar(50) default 'draft',
    metadata jsonb default '{}',
    tags text[],
    published_at timestamp with time zone,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

-- System logs table
create table public.system_logs (
    id uuid primary key default uuid_generate_v4(),
    organization_id uuid references public.organizations(id) on delete cascade,
    user_id uuid references auth.users(id),
    action varchar(100) not null,
    resource_type varchar(100),
    resource_id uuid,
    details jsonb default '{}',
    ip_address inet,
    user_agent text,
    created_at timestamp with time zone default now()
);

-- API usage tracking table
create table public.api_usage (
    id uuid primary key default uuid_generate_v4(),
    organization_id uuid references public.organizations(id) on delete cascade,
    user_id uuid references auth.users(id),
    endpoint varchar(255) not null,
    method varchar(10) not null,
    status_code integer,
    response_time_ms integer,
    request_size_bytes integer,
    response_size_bytes integer,
    created_at timestamp with time zone default now()
);

-- Row Level Security (RLS) Policies
alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.organization_members enable row level security;
alter table public.mail_accounts enable row level security;
alter table public.mail_categories enable row level security;
alter table public.seo_sites enable row level security;
alter table public.analytics_events enable row level security;
alter table public.content_items enable row level security;
alter table public.system_logs enable row level security;
alter table public.api_usage enable row level security;

-- Organizations policies
create policy "Organizations are viewable by members" on public.organizations
    for select using (
        auth.uid() in (
            select user_id from public.organization_members 
            where organization_id = organizations.id and status = 'active'
        )
    );

create policy "Organizations are editable by admins" on public.organizations
    for update using (
        auth.uid() in (
            select user_id from public.organization_members 
            where organization_id = organizations.id 
            and role in ('admin', 'owner') 
            and status = 'active'
        )
    );

-- Profiles policies
create policy "Profiles are viewable by organization members" on public.profiles
    for select using (
        organization_id in (
            select organization_id from public.organization_members 
            where user_id = auth.uid() and status = 'active'
        ) or id = auth.uid()
    );

create policy "Users can update own profile" on public.profiles
    for update using (auth.uid() = id);

-- Organization members policies
create policy "Organization members are viewable by members" on public.organization_members
    for select using (
        organization_id in (
            select organization_id from public.organization_members 
            where user_id = auth.uid() and status = 'active'
        )
    );

-- Mail accounts policies
create policy "Mail accounts are viewable by organization members" on public.mail_accounts
    for select using (
        organization_id in (
            select organization_id from public.organization_members 
            where user_id = auth.uid() and status = 'active'
        )
    );

create policy "Mail accounts are editable by owner or admins" on public.mail_accounts
    for all using (
        user_id = auth.uid() or
        organization_id in (
            select organization_id from public.organization_members 
            where user_id = auth.uid() 
            and role in ('admin', 'owner') 
            and status = 'active'
        )
    );

-- Similar policies for other tables...
-- (Additional policies would be created for each table following the same pattern)

-- Functions for updated_at timestamps
create or replace function public.handle_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

-- Triggers for updated_at
create trigger organizations_updated_at
    before update on public.organizations
    for each row execute function public.handle_updated_at();

create trigger profiles_updated_at
    before update on public.profiles
    for each row execute function public.handle_updated_at();

create trigger organization_members_updated_at
    before update on public.organization_members
    for each row execute function public.handle_updated_at();

create trigger mail_accounts_updated_at
    before update on public.mail_accounts
    for each row execute function public.handle_updated_at();

create trigger mail_categories_updated_at
    before update on public.mail_categories
    for each row execute function public.handle_updated_at();

create trigger seo_sites_updated_at
    before update on public.seo_sites
    for each row execute function public.handle_updated_at();

create trigger content_items_updated_at
    before update on public.content_items
    for each row execute function public.handle_updated_at();

-- Create indexes for performance
create index organizations_slug_idx on public.organizations(slug);
create index profiles_organization_id_idx on public.profiles(organization_id);
create index profiles_email_idx on public.profiles(email);
create index organization_members_org_id_idx on public.organization_members(organization_id);
create index organization_members_user_id_idx on public.organization_members(user_id);
create index mail_accounts_org_id_idx on public.mail_accounts(organization_id);
create index mail_accounts_user_id_idx on public.mail_accounts(user_id);
create index mail_categories_org_id_idx on public.mail_categories(organization_id);
create index seo_sites_org_id_idx on public.seo_sites(organization_id);
create index analytics_events_org_id_idx on public.analytics_events(organization_id);
create index analytics_events_created_at_idx on public.analytics_events(created_at);
create index content_items_org_id_idx on public.content_items(organization_id);
create index system_logs_org_id_idx on public.system_logs(organization_id);
create index system_logs_created_at_idx on public.system_logs(created_at);
create index api_usage_org_id_idx on public.api_usage(organization_id);
create index api_usage_created_at_idx on public.api_usage(created_at);
