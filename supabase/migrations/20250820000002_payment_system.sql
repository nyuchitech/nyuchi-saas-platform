-- Payment system tables for Nyuchi SaaS Platform
-- Supports both Stripe and Paynow payment providers

-- Payments table
create table public.payments (
    id uuid primary key default uuid_generate_v4(),
    organization_id uuid references public.organizations(id) on delete cascade,
    user_id uuid references auth.users(id) on delete cascade,
    
    -- Payment details
    amount numeric(10,2) not null,
    currency varchar(3) default 'USD',
    description text,
    
    -- Provider information
    provider varchar(20) not null, -- 'stripe', 'paynow'
    provider_payment_id varchar(255) unique,
    provider_customer_id varchar(255),
    
    -- Status tracking
    status varchar(50) default 'pending', -- pending, processing, completed, failed, cancelled, refunded
    payment_method varchar(50), -- card, mobile_money, bank_transfer, etc.
    
    -- Metadata
    metadata jsonb default '{}',
    provider_response jsonb default '{}',
    
    -- Timestamps
    processed_at timestamp with time zone,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

-- Payment refunds table
create table public.payment_refunds (
    id uuid primary key default uuid_generate_v4(),
    payment_id uuid references public.payments(id) on delete cascade,
    organization_id uuid references public.organizations(id) on delete cascade,
    
    -- Refund details
    amount numeric(10,2) not null,
    reason text,
    
    -- Provider information
    provider varchar(20) not null,
    provider_refund_id varchar(255) unique,
    
    -- Status
    status varchar(50) default 'pending', -- pending, processing, completed, failed
    
    -- Metadata
    metadata jsonb default '{}',
    provider_response jsonb default '{}',
    
    -- Timestamps
    processed_at timestamp with time zone,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

-- Webhook logs table (for debugging payment webhooks)
create table public.webhook_logs (
    id uuid primary key default uuid_generate_v4(),
    provider varchar(20) not null, -- 'stripe', 'paynow'
    webhook_id varchar(255),
    event_type varchar(100),
    event_data jsonb,
    headers jsonb,
    processed boolean default false,
    processing_attempts integer default 0,
    last_processing_error text,
    created_at timestamp with time zone default now(),
    processed_at timestamp with time zone
);

-- Webhook processing errors table
create table public.webhook_errors (
    id uuid primary key default uuid_generate_v4(),
    webhook_log_id uuid references public.webhook_logs(id) on delete cascade,
    error_message text not null,
    error_details jsonb default '{}',
    stack_trace text,
    created_at timestamp with time zone default now()
);

-- Customer payment methods table
create table public.payment_methods (
    id uuid primary key default uuid_generate_v4(),
    organization_id uuid references public.organizations(id) on delete cascade,
    user_id uuid references auth.users(id) on delete cascade,
    
    -- Provider information
    provider varchar(20) not null, -- 'stripe', 'paynow'
    provider_method_id varchar(255) unique,
    provider_customer_id varchar(255),
    
    -- Method details
    method_type varchar(50) not null, -- 'card', 'mobile_money', 'bank_account'
    last_four varchar(4),
    brand varchar(50), -- visa, mastercard, ecocash, onemoney, etc.
    expires_month integer,
    expires_year integer,
    
    -- Status
    is_default boolean default false,
    status varchar(50) default 'active', -- active, inactive, expired
    
    -- Metadata
    metadata jsonb default '{}',
    
    -- Timestamps
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

-- Billing addresses table
create table public.billing_addresses (
    id uuid primary key default uuid_generate_v4(),
    organization_id uuid references public.organizations(id) on delete cascade,
    user_id uuid references auth.users(id) on delete cascade,
    payment_method_id uuid references public.payment_methods(id) on delete cascade,
    
    -- Address details
    line1 varchar(255),
    line2 varchar(255),
    city varchar(100),
    state varchar(100),
    postal_code varchar(20),
    country varchar(2), -- ISO country code
    
    -- Contact information
    name varchar(255),
    phone varchar(50),
    
    -- Timestamps
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

-- Subscriptions table (for recurring payments)
create table public.subscriptions (
    id uuid primary key default uuid_generate_v4(),
    organization_id uuid references public.organizations(id) on delete cascade,
    
    -- Subscription details
    plan_name varchar(100) not null,
    plan_price numeric(10,2) not null,
    billing_cycle varchar(20) default 'monthly', -- monthly, yearly, quarterly
    currency varchar(3) default 'USD',
    
    -- Provider information
    provider varchar(20) not null, -- 'stripe', 'paynow'
    provider_subscription_id varchar(255) unique,
    provider_customer_id varchar(255),
    
    -- Status and dates
    status varchar(50) default 'active', -- active, cancelled, past_due, unpaid
    current_period_start timestamp with time zone,
    current_period_end timestamp with time zone,
    trial_start timestamp with time zone,
    trial_end timestamp with time zone,
    cancelled_at timestamp with time zone,
    ended_at timestamp with time zone,
    
    -- Metadata
    metadata jsonb default '{}',
    
    -- Timestamps
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

-- Row Level Security (RLS) policies for payment tables
alter table public.payments enable row level security;
alter table public.payment_refunds enable row level security;
alter table public.webhook_logs enable row level security;
alter table public.webhook_errors enable row level security;
alter table public.payment_methods enable row level security;
alter table public.billing_addresses enable row level security;
alter table public.subscriptions enable row level security;

-- Payments policies
create policy "Payments are viewable by organization members" on public.payments
    for select using (
        organization_id in (
            select organization_id from public.organization_members 
            where user_id = auth.uid() and status = 'active'
        )
    );

create policy "Payments are editable by organization admins" on public.payments
    for all using (
        organization_id in (
            select organization_id from public.organization_members 
            where user_id = auth.uid() 
            and role in ('admin', 'owner') 
            and status = 'active'
        )
    );

-- Payment refunds policies
create policy "Payment refunds are viewable by organization members" on public.payment_refunds
    for select using (
        organization_id in (
            select organization_id from public.organization_members 
            where user_id = auth.uid() and status = 'active'
        )
    );

-- Payment methods policies
create policy "Payment methods are viewable by organization members" on public.payment_methods
    for select using (
        organization_id in (
            select organization_id from public.organization_members 
            where user_id = auth.uid() and status = 'active'
        )
    );

create policy "Payment methods are editable by owner or admins" on public.payment_methods
    for all using (
        user_id = auth.uid() or
        organization_id in (
            select organization_id from public.organization_members 
            where user_id = auth.uid() 
            and role in ('admin', 'owner') 
            and status = 'active'
        )
    );

-- Subscriptions policies
create policy "Subscriptions are viewable by organization members" on public.subscriptions
    for select using (
        organization_id in (
            select organization_id from public.organization_members 
            where user_id = auth.uid() and status = 'active'
        )
    );

create policy "Subscriptions are editable by organization admins" on public.subscriptions
    for all using (
        organization_id in (
            select organization_id from public.organization_members 
            where user_id = auth.uid() 
            and role in ('admin', 'owner') 
            and status = 'active'
        )
    );

-- Add triggers for updated_at
create trigger payments_updated_at
    before update on public.payments
    for each row execute function public.handle_updated_at();

create trigger payment_refunds_updated_at
    before update on public.payment_refunds
    for each row execute function public.handle_updated_at();

create trigger payment_methods_updated_at
    before update on public.payment_methods
    for each row execute function public.handle_updated_at();

create trigger billing_addresses_updated_at
    before update on public.billing_addresses
    for each row execute function public.handle_updated_at();

create trigger subscriptions_updated_at
    before update on public.subscriptions
    for each row execute function public.handle_updated_at();

-- Create indexes for performance
create index payments_org_id_idx on public.payments(organization_id);
create index payments_user_id_idx on public.payments(user_id);
create index payments_provider_payment_id_idx on public.payments(provider_payment_id);
create index payments_status_idx on public.payments(status);
create index payments_created_at_idx on public.payments(created_at);

create index payment_refunds_payment_id_idx on public.payment_refunds(payment_id);
create index payment_refunds_org_id_idx on public.payment_refunds(organization_id);

create index webhook_logs_provider_idx on public.webhook_logs(provider);
create index webhook_logs_processed_idx on public.webhook_logs(processed);
create index webhook_logs_created_at_idx on public.webhook_logs(created_at);

create index payment_methods_org_id_idx on public.payment_methods(organization_id);
create index payment_methods_user_id_idx on public.payment_methods(user_id);
create index payment_methods_provider_method_id_idx on public.payment_methods(provider_method_id);

create index subscriptions_org_id_idx on public.subscriptions(organization_id);
create index subscriptions_provider_subscription_id_idx on public.subscriptions(provider_subscription_id);
create index subscriptions_status_idx on public.subscriptions(status);
