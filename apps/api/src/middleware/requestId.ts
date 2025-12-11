// ============================================
// apps/api/src/middleware/requestId.ts
// Adds unique request ID to each request
// ============================================

import { createMiddleware } from "hono/factory";
import { generateId } from "../utils";

/**
 * Extend Hono's context to include requestId
 * 
 * TypeScript declaration merging adds our custom
 * property to the ContextVariableMap interface.
 * This gives us type safety when using c.get("requestId").
 */
declare module "hono" {
  interface ContextVariableMap {
    requestId: string;
  }
}

/**
 * Request ID middleware
 * 
 * createMiddleware() is a Hono helper that creates
 * a properly typed middleware function.
 * 
 * This middleware:
 * 1. Generates unique ID for the request
 * 2. Stores it in context (accessible in route handlers)
 * 3. Adds it to response headers (useful for debugging)
 * 4. Calls next() to continue to next middleware/route
 */
export const requestIdMiddleware = createMiddleware(async (c, next) => {
  // Generate unique request ID
  const requestId = generateId("req");
  
  // Store in context for route handlers to access
  c.set("requestId", requestId);
  
  // Add to response headers
  c.header("X-Request-ID", requestId);
  
  // Continue to next middleware or route handler
  await next();
});