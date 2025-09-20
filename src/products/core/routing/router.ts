// Product Router - Handles routing and navigation for all products
// Provides centralized routing logic for multi-product architecture

import { PRODUCTS, type ProductConfig } from '../registry/products';

export interface RouteParams {
  productId: string;
  action?: string;
  id?: string;
}

export interface ProductRoute {
  path: string;
  component: string;
  requiresAuth: boolean;
  permissions?: string[];
  title?: string;
}

// Generate routes for all products
export function generateProductRoutes(): ProductRoute[] {
  const routes: ProductRoute[] = [];
  
  // Add routes for each product
  for (const productId in PRODUCTS) {
    const product = PRODUCTS[productId];
    
    // Dashboard route
    routes.push({
      path: product.routes.dashboard,
      component: `/src/products/${productId}/pages/index.astro`,
      requiresAuth: true,
      permissions: [`${productId}.read`],
      title: `${product.name} Dashboard`
    });
    
    // Settings route (if exists)
    if (product.routes.settings) {
      routes.push({
        path: product.routes.settings,
        component: `/src/products/${productId}/pages/settings.astro`,
        requiresAuth: true,
        permissions: [`${productId}.admin`],
        title: `${product.name} Settings`
      });
    }
  }
  
  return routes;
}

// Get product from route path
export function getProductFromRoute(path: string): ProductConfig | null {
  for (const productId in PRODUCTS) {
    const product = PRODUCTS[productId];
    if (path.startsWith(product.routes.dashboard) || path.startsWith(product.routes.api)) {
      return product;
    }
  }
  return null;
}

// Generate breadcrumbs for product pages
export function generateBreadcrumbs(path: string): Array<{label: string, href: string}> {
  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' }
  ];
  
  const product = getProductFromRoute(path);
  if (product) {
    breadcrumbs.push({
      label: product.name,
      href: product.routes.dashboard
    });
    
    // Add specific page if not main dashboard
    if (path !== product.routes.dashboard) {
      const pageName = path.split('/').pop() || 'Page';
      breadcrumbs.push({
        label: pageName.charAt(0).toUpperCase() + pageName.slice(1),
        href: path
      });
    }
  }
  
  return breadcrumbs;
}

// Validate user access to product
export function canAccessProduct(userPermissions: string[], productId: string, action: 'read' | 'write' | 'admin' = 'read'): boolean {
  // Admin users can access everything
  if (userPermissions.includes('admin') || userPermissions.includes('super_admin')) {
    return true;
  }
  
  // Check specific product permission
  const requiredPermission = `${productId}.${action}`;
  return userPermissions.indexOf(requiredPermission) !== -1;
}

// Get user's accessible products
export function getUserProducts(userPermissions: string[]): ProductConfig[] {
  const accessibleProducts: ProductConfig[] = [];
  
  for (const productId in PRODUCTS) {
    if (canAccessProduct(userPermissions, productId, 'read')) {
      accessibleProducts.push(PRODUCTS[productId]);
    }
  }
  
  return accessibleProducts;
}