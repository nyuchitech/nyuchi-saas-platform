// API middleware functions

import { requireAuth } from '../auth/middleware';
import { errorResponse, jsonResponse } from './utils';
import type { ApiResponse } from './types';

// Validate request method
export function validateMethod(request: Request, allowedMethods: string[]): Response | null {
  if (!allowedMethods.includes(request.method)) {
    return jsonResponse(
      errorResponse(`Method ${request.method} not allowed`),
      405
    );
  }
  return null;
}

// Require authentication for API endpoint
export async function requireApiAuth(request: Request): Promise<Response | null> {
  const session = await requireAuth(request);
  if (!session) {
    return jsonResponse(
      errorResponse('Authentication required'),
      401
    );
  }
  return null;
}

// Parse JSON body safely
export async function parseJsonBody(request: Request): Promise<any> {
  try {
    return await request.json();
  } catch {
    throw new Error('Invalid JSON body');
  }
}

// Validate required fields
export function validateFields(data: any, requiredFields: string[]): string[] {
  const missing = requiredFields.filter(field => !data[field]);
  return missing;
}
