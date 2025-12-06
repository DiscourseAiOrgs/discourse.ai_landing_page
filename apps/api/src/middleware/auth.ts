// ============================================
// apps/api/src/middleware/auth.ts
// Authentication middleware
// ============================================

import { createMiddleware } from "hono/factory";
import { errorResponse } from "../utils";
import { sessions, users } from "../routes/auth";

// ==================== EXTEND HONO'S CONTEXT ====================

/**
 * Tell TypeScript that our context will have userId and user
 * 
 * After requireAuth middleware runs, route handlers can use:
 * - c.get("userId") → the logged-in user's ID
 * - c.get("user") → the logged-in user's basic info
 */
declare module "hono" {
  interface ContextVariableMap {
    userId: string;
    user: {
      id: string;
      email: string;
      username: string;
    };
  }
}

/**
 * Middleware that REQUIRES authentication
 * 
 * Use this on routes that should only be accessible to logged-in users:
 * 
 * debates.post("/", requireAuth, async (c) => {
 *   const userId = c.get("userId");  // Guaranteed to exist
 *   // ...
 * });
 * 
 * If no valid token is provided, returns 401 and route never runs.
 */
export const requireAuth = createMiddleware(async (c, next) => {
  // Step 1: Get Authorization header
  const authHeader = c.req.header("Authorization");

  // Step 2: Check format - must be "Bearer <token>"
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json(errorResponse("Unauthorized - No token provided"), 401);
  }

  // Step 3: Extract the token
  const token = authHeader.slice(7);  // Remove "Bearer " prefix
  
  // Step 4: Look up session
  const userId = sessions.get(token);
  if (!userId) {
    return c.json(errorResponse("Unauthorized - Invalid or expired token"), 401);
  }

  // Step 5: Find user
  const user = users.find((u) => u.id === userId);
  if (!user) {
    return c.json(errorResponse("Unauthorized - User not found"), 401);
  }

  // Step 6: Add user info to context for route handlers
  c.set("userId", userId);
  c.set("user", {
    id: user.id,
    email: user.email,
    username: user.username,
  });

  // Step 7: Continue to route handler
  await next();
});

/**
 * OPTIONAL auth middleware
 * 
 * Use this on routes that work without login but have extra features when logged in.
 * 
 * Example: Viewing a public debate
 * - Anonymous: Can view debate
 * - Logged in: Can view + see if you participated
 * 
 * This middleware:
 * - If valid token: adds userId and user to context
 * - If no token or invalid: continues anyway (doesn't fail)
 */
export const optionalAuth = createMiddleware(async (c, next) => {
  const authHeader = c.req.header("Authorization");

  // Only try to authenticate if header is present
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const userId = sessions.get(token);

    if (userId) {
      const user = users.find((u) => u.id === userId);
      if (user) {
        c.set("userId", userId);
        c.set("user", {
          id: user.id,
          email: user.email,
          username: user.username,
        });
      }
    }
  }

  // Always continue - this middleware never blocks
  await next();
});