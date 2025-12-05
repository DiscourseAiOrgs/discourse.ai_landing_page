// ============================================
// apps/api/src/middleware/requestId.ts
// Adds unique request ID to each request
// ============================================

import { createMiddleware } from "hono/factory";
import { generateId } from "../utils";

// Extend Hono's context to include requestId
declare module "hono" {
  interface ContextVariableMap {
    requestId: string;
  }
}

export const requestIdMiddleware = createMiddleware(async (c, next) => {
  const requestId = generateId("req");
  
  // Store in context (accessible in route handlers)
  c.set("requestId", requestId);
  
  // Add to response headers
  c.header("X-Request-ID", requestId);
  
  await next();
});