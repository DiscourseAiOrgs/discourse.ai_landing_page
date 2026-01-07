// ============================================
// apps/api/src/middleware/auth.ts
// Authentication middleware with JWT
// ============================================

import { createMiddleware } from "hono/factory";
import { eq } from "drizzle-orm";
import { db, users } from "@discourse/db";
import { verifyToken } from "../utils/jwt";
import { errorResponse } from "../utils";
import type { SafeUser, UserId } from "../types";

/**
 * Extend Hono's context to include auth info
 */
declare module "hono" {
  interface ContextVariableMap {
    userId: UserId;
    user: SafeUser;
    jwtPayload: {
      userId: string;
      email: string;
      iat: number;
      exp: number;
    };
  }
}

/**
 * Extract token from Authorization header
 * 
 * Expects format: "Bearer <token>"
 */
function extractToken(authHeader: string | undefined): string | null {
  if (!authHeader) return null;
  if (!authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7).trim();
  return token || null;
}

/**
 * Require authentication middleware (JWT version)
 * 
 * This validates the JWT token and loads the user from database.
 * 
 * Benefits of JWT over session tokens:
 * 1. Stateless - no database lookup for token validation
 * 2. Self-contained - includes user info and expiration
 * 3. Scalable - works across multiple servers
 * 
 * We still load the user from DB to get latest data,
 * but the token validation itself is stateless.
 */
export const requireAuth = createMiddleware(async (c, next) => {
  const authHeader = c.req.header("Authorization");
  const token = extractToken(authHeader);

  if (!token) {
    return c.json(
      errorResponse("Authentication required. Please provide a valid token."),
      401
    );
  }

  // Verify JWT (stateless - no database lookup)
  const payload = await verifyToken(token);

  if (!payload) {
    return c.json(
      errorResponse("Invalid or expired token. Please log in again."),
      401
    );
  }

  // Load user from database (to get latest data)
  const user = await db.query.users.findFirst({
    where: eq(users.id, payload.userId),
  });

  if (!user) {
    return c.json(
      errorResponse("User not found. Account may have been deleted."),
      401
    );
  }

  // Remove password from user object
  const { passwordHash, ...safeUser } = user;

  // Add to context
  c.set("userId", user.id);
  c.set("user", safeUser as SafeUser);
  c.set("jwtPayload", payload);

  await next();
});

/**
 * Optional authentication middleware (JWT version)
 * 
 * Adds user to context if valid token provided,
 * but continues even without authentication.
 */
export const optionalAuth = createMiddleware(async (c, next) => {
  const authHeader = c.req.header("Authorization");
  const token = extractToken(authHeader);

  if (token) {
    const payload = await verifyToken(token);

    if (payload) {
      const user = await db.query.users.findFirst({
        where: eq(users.id, payload.userId),
      });

      if (user) {
        const { passwordHash, ...safeUser } = user;
        c.set("userId", user.id);
        c.set("user", safeUser as SafeUser);
        c.set("jwtPayload", payload);
      }
    }
  }

  await next();
});