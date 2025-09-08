// Product Management API
// Handles CRUD operations for external product repositories

import { createClient } from '@supabase/supabase-js';
import type { APIRoute } from 'astro';

// Initialize Supabase client
const supabase = createClient(
  import.meta.env.SUPABASE_URL,
  import.meta.env.SUPABASE_SERVICE_ROLE_KEY
);

export interface ProductRepository {
  id: string;
  name: string;
  slug: string;
  description?: string;
  repository_url: string;
  repository_type: 'github' | 'gitlab' | 'bitbucket';
  branch: string;
  deployment_config: {
    build_command?: string;
    output_directory?: string;
    environment_variables?: Record<string, string>;
    worker_type?: 'javascript' | 'typescript' | 'python';
    memory_limit?: number;
    timeout?: number;
  };
  status: 'active' | 'inactive' | 'deploying' | 'failed';
  last_deployed_at?: string;
  health_check_url?: string;
  api_endpoint?: string;
}

export interface DeploymentRecord {
  id: string;
  product_id: string;
  environment: 'preview' | 'production';
  status: 'pending' | 'deploying' | 'success' | 'failed';
  deployment_url?: string;
  logs?: string;
  started_at: string;
  completed_at?: string;
}

// GET /api/products - List all products
export const GET: APIRoute = async ({ url }) => {
  try {
    const { data: products, error } = await supabase
      .from('products')
      .select(`
        *,
        product_deployments (
          id,
          deployment_name,
          deployment_url,
          environment,
          status,
          deployed_at
        )
      `)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error fetching products:', error);
      return new Response(JSON.stringify({ error: 'Failed to fetch products' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ products }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Products API Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// POST /api/products - Register new product
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const {
      name,
      slug,
      description,
      repository_url,
      repository_type = 'github',
      branch = 'main',
      deployment_config = {},
      category_id
    } = body;

    // Validate required fields
    if (!name || !slug || !repository_url) {
      return new Response(JSON.stringify({ 
        error: 'Missing required fields: name, slug, repository_url' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if slug already exists
    const { data: existingProduct } = await supabase
      .from('products')
      .select('id')
      .eq('slug', slug)
      .single();

    if (existingProduct) {
      return new Response(JSON.stringify({ 
        error: 'Product with this slug already exists' 
      }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Insert new product
    const { data: product, error } = await supabase
      .from('products')
      .insert({
        name,
        slug,
        description,
        repository_url,
        repository_type,
        branch,
        deployment_config,
        category_id,
        status: 'active',
        version: '1.0.0'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating product:', error);
      return new Response(JSON.stringify({ error: 'Failed to create product' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ product }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Product creation error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// PUT /api/products/[id] - Update product
export const PUT: APIRoute = async ({ params, request }) => {
  try {
    const productId = params.id;
    const body = await request.json();

    const { data: product, error } = await supabase
      .from('products')
      .update(body)
      .eq('id', productId)
      .select()
      .single();

    if (error) {
      console.error('Error updating product:', error);
      return new Response(JSON.stringify({ error: 'Failed to update product' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!product) {
      return new Response(JSON.stringify({ error: 'Product not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ product }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Product update error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// DELETE /api/products/[id] - Soft delete product
export const DELETE: APIRoute = async ({ params }) => {
  try {
    const productId = params.id;

    const { data: product, error } = await supabase
      .from('products')
      .update({ is_active: false })
      .eq('id', productId)
      .select()
      .single();

    if (error) {
      console.error('Error deleting product:', error);
      return new Response(JSON.stringify({ error: 'Failed to delete product' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!product) {
      return new Response(JSON.stringify({ error: 'Product not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ message: 'Product deleted successfully' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Product deletion error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// Helper functions for deployment management
export class ProductDeploymentManager {
  private supabase;

  constructor() {
    this.supabase = createClient(
      import.meta.env.SUPABASE_URL,
      import.meta.env.SUPABASE_SERVICE_ROLE_KEY
    );
  }

  async deployProduct(productId: string, environment: 'preview' | 'production' = 'preview') {
    try {
      // Get product details
      const { data: product, error: productError } = await this.supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();

      if (productError || !product) {
        throw new Error('Product not found');
      }

      // Create deployment record
      const { data: deployment, error: deploymentError } = await this.supabase
        .from('product_deployments')
        .insert({
          product_id: productId,
          deployment_name: `${product.slug}-${environment}`,
          environment,
          status: 'deploying',
          config: product.deployment_config
        })
        .select()
        .single();

      if (deploymentError) {
        throw new Error('Failed to create deployment record');
      }

      // Trigger actual deployment (this would integrate with Cloudflare Workers API)
      const deploymentResult = await this.triggerWorkerDeployment(product, environment);

      // Update deployment record with results
      await this.supabase
        .from('product_deployments')
        .update({
          status: deploymentResult.success ? 'active' : 'failed',
          deployment_url: deploymentResult.url,
          deployed_at: new Date().toISOString()
        })
        .eq('id', deployment.id);

      return {
        success: deploymentResult.success,
        deployment: deployment,
        url: deploymentResult.url,
        error: deploymentResult.error
      };
    } catch (error) {
      console.error('Deployment error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown deployment error'
      };
    }
  }

  private async triggerWorkerDeployment(product: any, environment: string) {
    // This is where you would integrate with Cloudflare Workers API
    // For now, return a mock response
    try {
      const workerName = `${product.slug}-${environment}`;
      const deploymentUrl = `${workerName}.${import.meta.env.CLOUDFLARE_ACCOUNT_ID}.workers.dev`;

      // TODO: Implement actual Cloudflare Workers deployment
      // - Clone repository
      // - Run build command
      // - Deploy to Workers
      // - Update DNS if needed

      return {
        success: true,
        url: `https://${deploymentUrl}`,
        workerId: workerName
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Deployment failed'
      };
    }
  }

  async getDeploymentLogs(deploymentId: string) {
    try {
      const { data: deployment, error } = await this.supabase
        .from('product_deployments')
        .select('*')
        .eq('id', deploymentId)
        .single();

      if (error || !deployment) {
        throw new Error('Deployment not found');
      }

      // TODO: Fetch actual logs from Cloudflare Workers
      const logs = [
        `[${new Date().toISOString()}] Starting deployment...`,
        `[${new Date().toISOString()}] Cloning repository: ${deployment.config?.repository_url}`,
        `[${new Date().toISOString()}] Running build command...`,
        `[${new Date().toISOString()}] Deployment completed successfully`,
        `[${new Date().toISOString()}] Available at: ${deployment.deployment_url}`
      ];

      return { logs };
    } catch (error) {
      console.error('Error fetching logs:', error);
      return { 
        error: error instanceof Error ? error.message : 'Failed to fetch logs' 
      };
    }
  }
}