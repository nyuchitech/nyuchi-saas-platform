// Unified database schema definitions
import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

// Users table
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  role: text('role').notNull().default('user'), // super_admin, admin, manager, user, viewer
  organizationId: text('organization_id').notNull(),
  permissions: text('permissions').notNull().default('[]'), // JSON array
  status: text('status').notNull().default('active'), // active, inactive, suspended
  lastLoginAt: text('last_login_at'),
  suspensionReason: text('suspension_reason'),
  createdAt: text('created_at').notNull().default(sql`datetime('now')`),
  updatedAt: text('updated_at').notNull().default(sql`datetime('now')`)
});

// Organizations table
export const organizations = sqliteTable('organizations', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description'),
  settings: text('settings').notNull().default('{}'), // JSON object
  planType: text('plan_type').notNull().default('free'), // free, pro, enterprise
  status: text('status').notNull().default('active'),
  createdAt: text('created_at').notNull().default(sql`datetime('now')`),
  updatedAt: text('updated_at').notNull().default(sql`datetime('now')`)
});

// MailSense - Email accounts
export const mailAccounts = sqliteTable('mail_accounts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  organizationId: text('organization_id').notNull(),
  userId: text('user_id').notNull(),
  email: text('email').notNull(),
  provider: text('provider').notNull(), // gmail, outlook, etc.
  accountName: text('account_name'),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  status: text('status').notNull().default('active'),
  lastSyncAt: text('last_sync_at'),
  createdAt: text('created_at').notNull().default(sql`datetime('now')`),
  updatedAt: text('updated_at').notNull().default(sql`datetime('now')`)
});

// MailSense - Email messages
export const mailMessages = sqliteTable('mail_messages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  accountId: integer('account_id').notNull(),
  messageId: text('message_id').notNull().unique(),
  threadId: text('thread_id'),
  subject: text('subject'),
  sender: text('sender'),
  recipient: text('recipient'),
  content: text('content'),
  category: text('category'),
  priority: text('priority').default('normal'),
  isRead: integer('is_read').notNull().default(0),
  isStarred: integer('is_starred').notNull().default(0),
  attachments: text('attachments').default('[]'), // JSON array
  aiSummary: text('ai_summary'),
  receivedAt: text('received_at'),
  createdAt: text('created_at').notNull().default(sql`datetime('now')`)
});

// MailSense - Categories
export const mailCategories = sqliteTable('mail_categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  organizationId: text('organization_id').notNull(),
  name: text('name').notNull(),
  color: text('color').notNull().default('#3b82f6'),
  icon: text('icon').notNull().default('folder'),
  isSystem: integer('is_system').notNull().default(0),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: text('created_at').notNull().default(sql`datetime('now')`)
});

// SEO Manager - WordPress sites
export const seoSites = sqliteTable('seo_sites', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  organizationId: text('organization_id').notNull(),
  name: text('name').notNull(),
  url: text('url').notNull(),
  wpApiKey: text('wp_api_key'),
  wpUsername: text('wp_username'),
  status: text('status').notNull().default('active'),
  lastSyncAt: text('last_sync_at'),
  createdAt: text('created_at').notNull().default(sql`datetime('now')`),
  updatedAt: text('updated_at').notNull().default(sql`datetime('now')`)
});

// SEO Manager - Optimization tasks
export const seoTasks = sqliteTable('seo_tasks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  siteId: integer('site_id').notNull(),
  taskType: text('task_type').notNull(), // optimize_content, bulk_optimize, etc.
  status: text('status').notNull().default('pending'), // pending, running, completed, failed
  inputData: text('input_data'), // JSON
  outputData: text('output_data'), // JSON
  errorMessage: text('error_message'),
  completedAt: text('completed_at'),
  createdAt: text('created_at').notNull().default(sql`datetime('now')`)
});

// Analytics Pro - Events
export const analyticsEvents = sqliteTable('analytics_events', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  organizationId: text('organization_id').notNull(),
  eventType: text('event_type').notNull(),
  eventData: text('event_data').notNull().default('{}'), // JSON
  userId: text('user_id'),
  sessionId: text('session_id'),
  userAgent: text('user_agent'),
  ipAddress: text('ip_address'),
  createdAt: text('created_at').notNull().default(sql`datetime('now')`)
});

// Analytics Pro - Dashboards
export const analyticsDashboards = sqliteTable('analytics_dashboards', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  organizationId: text('organization_id').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  widgets: text('widgets').notNull().default('[]'), // JSON array
  layout: text('layout').notNull().default('grid'),
  isPublic: integer('is_public').notNull().default(0),
  createdBy: text('created_by').notNull(),
  createdAt: text('created_at').notNull().default(sql`datetime('now')`),
  updatedAt: text('updated_at').notNull().default(sql`datetime('now')`)
});

// Travel Platform - Submissions
export const travelSubmissions = sqliteTable('travel_submissions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  organizationId: text('organization_id').notNull(),
  submitterName: text('submitter_name').notNull(),
  submitterEmail: text('submitter_email').notNull(),
  businessName: text('business_name').notNull(),
  businessType: text('business_type').notNull(),
  location: text('location').notNull(),
  description: text('description'),
  website: text('website'),
  phone: text('phone'),
  images: text('images').default('[]'), // JSON array
  status: text('status').notNull().default('pending'), // pending, approved, rejected
  moderatedBy: text('moderated_by'),
  moderatedAt: text('moderated_at'),
  createdAt: text('created_at').notNull().default(sql`datetime('now')`)
});

// Content Hub - Content items
export const contentItems = sqliteTable('content_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  organizationId: text('organization_id').notNull(),
  title: text('title').notNull(),
  content: text('content'),
  contentType: text('content_type').notNull(), // post, page, article, etc.
  platform: text('platform').notNull(), // wordpress, social, email, etc.
  status: text('status').notNull().default('draft'), // draft, published, scheduled
  aiGenerated: integer('ai_generated').notNull().default(0),
  scheduledAt: text('scheduled_at'),
  publishedAt: text('published_at'),
  createdBy: text('created_by').notNull(),
  createdAt: text('created_at').notNull().default(sql`datetime('now')`),
  updatedAt: text('updated_at').notNull().default(sql`datetime('now')`)
});

// Event Widget - Events
export const events = sqliteTable('events', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  organizationId: text('organization_id').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  location: text('location'),
  startTime: text('start_time').notNull(),
  endTime: text('end_time').notNull(),
  timezone: text('timezone').notNull().default('UTC'),
  maxAttendees: integer('max_attendees'),
  rsvpRequired: integer('rsvp_required').notNull().default(1),
  status: text('status').notNull().default('active'), // active, cancelled, completed
  createdBy: text('created_by').notNull(),
  createdAt: text('created_at').notNull().default(sql`datetime('now')`),
  updatedAt: text('updated_at').notNull().default(sql`datetime('now')`)
});

// Event Widget - RSVPs
export const eventRsvps = sqliteTable('event_rsvps', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  eventId: integer('event_id').notNull(),
  attendeeName: text('attendee_name').notNull(),
  attendeeEmail: text('attendee_email').notNull(),
  status: text('status').notNull().default('attending'), // attending, not_attending, maybe
  notes: text('notes'),
  createdAt: text('created_at').notNull().default(sql`datetime('now')`)
});

// System logs for admin monitoring
export const systemLogs = sqliteTable('system_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  level: text('level').notNull(), // info, warn, error, debug
  message: text('message').notNull(),
  category: text('category').notNull(), // auth, api, system, etc.
  userId: text('user_id'),
  organizationId: text('organization_id'),
  metadata: text('metadata').default('{}'), // JSON
  createdAt: text('created_at').notNull().default(sql`datetime('now')`)
});

// API usage tracking
export const apiUsage = sqliteTable('api_usage', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  organizationId: text('organization_id').notNull(),
  userId: text('user_id'),
  endpoint: text('endpoint').notNull(),
  method: text('method').notNull(),
  statusCode: integer('status_code').notNull(),
  responseTime: integer('response_time'), // milliseconds
  userAgent: text('user_agent'),
  ipAddress: text('ip_address'),
  createdAt: text('created_at').notNull().default(sql`datetime('now')`)
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;
export type MailAccount = typeof mailAccounts.$inferSelect;
export type NewMailAccount = typeof mailAccounts.$inferInsert;
export type MailMessage = typeof mailMessages.$inferSelect;
export type NewMailMessage = typeof mailMessages.$inferInsert;
