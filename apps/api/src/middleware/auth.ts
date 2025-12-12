// ============================================
// apps/api/src/middleware/auth.ts
// Authentication middleware
// ============================================

import { createMiddleware } from "hono/factory";
import { errorResponse } from "../utils";
import type { SafeUser, UserId } from "../types";

/**
 * Extend Hono's context to include auth info
 */
declare module "hono" {
  interface ContextVariableMap {
    userId: UserId;
    user: SafeUser;
  }
}

/**
 * In-memory session store (temporary)
 * 
 * ⚠️ This will be replaced with database sessions in Article 6.
 * For now, we store sessions in memory for development.
 */
export const sessions = new Map<string, { userId: string; user: SafeUser }>();

/**
 * In-memory user store (temporary)
 * 
 * ⚠️ This will be replaced with database in Article 6.
 */
export const users: Array<{
  id: string;
  email: string;
  username: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
  emailVerified: boolean;
}> = [];

/**
 * Extract token from Authorization header
 * 
 * Expects format: "Bearer <token>"
 * Returns just the token part.
 * 
 * @param authHeader - The Authorization header value
 * @returns Token string or null if invalid
 */
function extractToken(authHeader: string | undefined): string | null {
  if (!authHeader) return null;
  
  // Check for "Bearer " prefix
  if (!authHeader.startsWith("Bearer ")) return null;
  
  // Extract token (everything after "Bearer ")
  const token = authHeader.slice(7).trim();
  
  return token || null;
}

/**
 * Require authentication middleware
 * 
 * Blocks request if no valid token is provided.
 * Adds userId and user to context if valid.
 * 
 * Use for protected routes that require login.
 * 
 * @example
 * app.get("/profile", requireAuth, async (c) => {
 *   const userId = c.get("userId"); // Guaranteed to exist
 * });
 */
export const requireAuth = createMiddleware(async (c, next) => {
  // Get Authorization header
  const authHeader = c.req.header("Authorization");
  
  // Extract token
  const token = extractToken(authHeader);
  
  if (!token) {
    return c.json(
      errorResponse("Authentication required. Please provide a valid token."),
      401  // 401 Unauthorized
    );
  }
  
  // Look up session
  const session = sessions.get(token);
  
  if (!session) {
    return c.json(
      errorResponse("Invalid or expired token. Please log in again."),
      401
    );
  }
  
  // Add user info to context
  c.set("userId", session.userId);
  c.set("user", session.user);
  
  // Continue to route handler
  await next();
});

/**
 * Optional authentication middleware
 * 
 * Adds user to context if valid token provided,
 * but continues even without authentication.
 * 
 * Use for routes that work for both logged-in and anonymous users.
 * 
 * @example
 * app.get("/debates/:id", optionalAuth, async (c) => {
 *   const userId = c.get("userId"); // May be undefined
 *   if (userId) {
 *     // Show personalized content
 *   }
 * });
 */
export const optionalAuth = createMiddleware(async (c, next) => {
  const authHeader = c.req.header("Authorization");
  const token = extractToken(authHeader);
  
  if (token) {
    const session = sessions.get(token);
    if (session) {
      c.set("userId", session.userId);
      c.set("user", session.user);
    }
  }
  
  // Always continue, even without auth
  await next();
});

/**
 * Generate a session token (temporary)
 * 
 * ⚠️ This will be replaced with JWT in a later article.
 * For now, we use a simple random token.
 */
export function generateToken(): string {
  return `tok_${Date.now().toString(36)}${Math.random().toString(36).substring(2)}`;
}

/**
 * Simple password hashing (temporary)
 * 
 * ⚠️ This is NOT secure! Will be replaced with Argon2.
 * Only for development/testing purposes.
 */
export function hashPassword(password: string): string {
  // Base64 encode - NOT SECURE, just for development
  return Buffer.from(password).toString("base64");
}

/**
 * Simple password verification (temporary)
 * 
 * ⚠️ This is NOT secure! Will be replaced with Argon2.
 */
export function verifyPassword(password: string, hash: string): boolean {
  return Buffer.from(password).toString("base64") === hash;
}