/// <reference path="../.astro/types.d.ts" />

declare namespace App {
  interface Locals {
    runtime?: {
      env: {
        D1_DATABASE: D1Database;
        SUPABASE_URL: string;
        SUPABASE_ANON_KEY: string;
        SUPABASE_SERVICE_KEY?: string;
        PAYNOW_INTEGRATION_ID?: string;
        PAYNOW_INTEGRATION_KEY?: string;
        PAYNOW_RETURN_URL?: string;
        PAYNOW_RESULT_URL?: string;
        STRIPE_SECRET_KEY?: string;
        STRIPE_WEBHOOK_SECRET?: string;
        ENVIRONMENT?: string;
      };
      cf?: {
        colo: string;
        country?: string;
        city?: string;
      };
      ctx?: {
        waitUntil: (promise: Promise<unknown>) => void;
        passThroughOnException: () => void;
      };
    };
    user?: {
      id: string;
      email: string;
      role: string;
      organizationId?: string;
    };
    organization?: {
      id: string;
      name: string;
      plan: string;
    };
  }
}