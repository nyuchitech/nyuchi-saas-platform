-- MailSense Rebrand Migration Script for Supabase
-- Run this on Supabase database

-- Update products table to rebrand from mail-organizer to mailsense
UPDATE products SET 
  slug = 'mailsense',
  name = 'MailSense',
  description = 'AI-powered email intelligence and organization for Gmail'
WHERE slug = 'mail-organizer';

-- Update any API route references if they exist in other tables
-- (Add additional updates here as needed based on your schema)

-- Verify the update
SELECT * FROM products WHERE slug = 'mailsense';
