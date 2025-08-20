-- Migration for Payment System Tables
-- Version: 002_payment_system.sql

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  reference TEXT UNIQUE NOT NULL,
  user_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  provider TEXT NOT NULL, -- 'paynow' or 'stripe'
  transaction_id TEXT,
  poll_url TEXT,
  amount DECIMAL(10,2) NOT NULL,
  paid_amount DECIMAL(10,2),
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, succeeded, failed, cancelled, refunded
  items TEXT NOT NULL, -- JSON array of payment items
  description TEXT,
  phone_number TEXT, -- For mobile payments
  mobile_method TEXT, -- ecocash, onemoney
  instructions TEXT, -- Mobile payment instructions
  provider_reference TEXT, -- Provider's internal transaction reference
  metadata TEXT, -- JSON for additional data
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Payment refunds table
CREATE TABLE IF NOT EXISTS payment_refunds (
  id TEXT PRIMARY KEY,
  payment_id TEXT NOT NULL,
  transaction_id TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, completed, failed
  provider_reference TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE CASCADE
);

-- Webhook logs table
CREATE TABLE IF NOT EXISTS webhook_logs (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL, -- 'paynow' or 'stripe'
  event_type TEXT NOT NULL,
  reference TEXT,
  status TEXT,
  amount DECIMAL(10,2),
  currency TEXT,
  raw_data TEXT NOT NULL, -- JSON of webhook payload
  processed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Webhook errors table
CREATE TABLE IF NOT EXISTS webhook_errors (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  error_message TEXT NOT NULL,
  raw_data TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Payment methods table (for storing customer payment methods)
CREATE TABLE IF NOT EXISTS payment_methods (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  organization_id TEXT,
  provider TEXT NOT NULL,
  provider_method_id TEXT NOT NULL, -- Provider's payment method ID
  type TEXT NOT NULL, -- card, mobile, bank_transfer
  last_four TEXT, -- Last 4 digits for cards
  brand TEXT, -- visa, mastercard, ecocash, etc.
  expires_month INTEGER,
  expires_year INTEGER,
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  metadata TEXT, -- JSON for additional data
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Billing addresses table
CREATE TABLE IF NOT EXISTS billing_addresses (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  organization_id TEXT,
  name TEXT NOT NULL,
  line1 TEXT NOT NULL,
  line2 TEXT,
  city TEXT NOT NULL,
  state TEXT,
  postal_code TEXT,
  country TEXT NOT NULL,
  phone TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_organization_id ON payments(organization_id);
CREATE INDEX IF NOT EXISTS idx_payments_reference ON payments(reference);
CREATE INDEX IF NOT EXISTS idx_payments_transaction_id ON payments(transaction_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_provider ON payments(provider);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);

CREATE INDEX IF NOT EXISTS idx_payment_refunds_payment_id ON payment_refunds(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_refunds_transaction_id ON payment_refunds(transaction_id);
CREATE INDEX IF NOT EXISTS idx_payment_refunds_status ON payment_refunds(status);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_provider ON webhook_logs(provider);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_reference ON webhook_logs(reference);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at ON webhook_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_webhook_errors_provider ON webhook_errors(provider);
CREATE INDEX IF NOT EXISTS idx_webhook_errors_created_at ON webhook_errors(created_at);

CREATE INDEX IF NOT EXISTS idx_payment_methods_user_id ON payment_methods(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_organization_id ON payment_methods(organization_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_provider ON payment_methods(provider);
CREATE INDEX IF NOT EXISTS idx_payment_methods_is_default ON payment_methods(is_default);

CREATE INDEX IF NOT EXISTS idx_billing_addresses_user_id ON billing_addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_billing_addresses_organization_id ON billing_addresses(organization_id);
CREATE INDEX IF NOT EXISTS idx_billing_addresses_is_default ON billing_addresses(is_default);
