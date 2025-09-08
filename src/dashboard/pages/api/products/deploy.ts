// Deployment API endpoint
// Handles product deployment requests

import type { APIRoute } from 'astro';
import { ProductDeploymentManager } from '../../../api/products';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { product_id, environment = 'preview' } = body;

    if (!product_id) {
      return new Response(JSON.stringify({ 
        error: 'Missing required field: product_id' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const deploymentManager = new ProductDeploymentManager();
    const result = await deploymentManager.deployProduct(product_id, environment);

    if (!result.success) {
      return new Response(JSON.stringify({ 
        error: result.error || 'Deployment failed' 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      message: 'Deployment initiated successfully',
      deployment: result.deployment,
      url: result.url
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Deployment API error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};