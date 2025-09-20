// Product Registry - Central management for all Nyuchi products
// This file defines the structure and metadata for each product in the platform

export interface ProductConfig {
  id: string;
  name: string;
  slug: string;
  description: string;
  version: string;
  status: 'active' | 'beta' | 'coming-soon' | 'deprecated';
  category: 'productivity' | 'analytics' | 'marketing' | 'seo' | 'communications';
  icon: string;
  color: string; // Primary brand color for the product
  routes: {
    dashboard: string;
    api: string;
    settings?: string;
  };
  features: string[];
  permissions?: string[];
  subdomain?: string; // For future microservice deployment
}

// Product Registry
export const PRODUCTS: Record<string, ProductConfig> = {
  mailsense: {
    id: 'mailsense',
    name: 'MailSense',
    slug: 'mailsense',
    description: 'AI-powered email analytics and organization platform',
    version: '2.0.0',
    status: 'active',
    category: 'communications',
    icon: '📧',
    color: '#4F46E5',
    routes: {
      dashboard: '/dashboard/mailsense',
      api: '/api/mailsense',
      settings: '/dashboard/mailsense/settings'
    },
    features: [
      'Email Analytics',
      'Smart Categorization', 
      'Productivity Insights',
      'Gmail Integration',
      'Team Collaboration'
    ],
    permissions: ['mailsense.read', 'mailsense.write', 'mailsense.admin'],
    subdomain: 'mailsense'
  },

  'seo-manager': {
    id: 'seo-manager',
    name: 'SEO Manager',
    slug: 'seo-manager',
    description: 'Comprehensive SEO optimization and tracking platform',
    version: '1.5.0',
    status: 'active',
    category: 'seo',
    icon: '📈',
    color: '#059669',
    routes: {
      dashboard: '/dashboard/seo-manager',
      api: '/api/seo',
      settings: '/dashboard/seo-manager/settings'
    },
    features: [
      'Keyword Tracking',
      'Site Audits',
      'Competitor Analysis',
      'Backlink Monitoring',
      'Performance Reports'
    ],
    permissions: ['seo.read', 'seo.write', 'seo.admin'],
    subdomain: 'seo'
  },

  'analytics-pro': {
    id: 'analytics-pro',
    name: 'Analytics Pro',
    slug: 'analytics-pro',
    description: 'Advanced business intelligence and analytics platform',
    version: '3.1.0',
    status: 'active',
    category: 'analytics',
    icon: '📊',
    color: '#DC2626',
    routes: {
      dashboard: '/dashboard/analytics-pro',
      api: '/api/analytics',
      settings: '/dashboard/analytics-pro/settings'
    },
    features: [
      'Custom Dashboards',
      'Real-time Analytics',
      'Data Visualization',
      'Report Generation',
      'API Integration'
    ],
    permissions: ['analytics.read', 'analytics.write', 'analytics.admin'],
    subdomain: 'analytics'
  }
};

// Helper functions for product management
export function getProduct(id: string): ProductConfig | undefined {
  return PRODUCTS[id];
}

export function getAllProducts(): ProductConfig[] {
  return Object.values(PRODUCTS);
}

export function getActiveProducts(): ProductConfig[] {
  return getAllProducts().filter(product => product.status === 'active');
}

export function getProductsByCategory(category: ProductConfig['category']): ProductConfig[] {
  return getAllProducts().filter(product => product.category === category);
}

export function getProductBySlug(slug: string): ProductConfig | undefined {
  return getAllProducts().find(product => product.slug === slug);
}

export function hasProductPermission(userPermissions: string[], productId: string, action: string): boolean {
  const product = getProduct(productId);
  if (!product || !product.permissions) return false;
  
  const requiredPermission = `${productId}.${action}`;
  return userPermissions.includes(requiredPermission) || userPermissions.includes('admin');
}