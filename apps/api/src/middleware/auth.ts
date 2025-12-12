// ============================================
// apps/api/src/middleware/auth.ts
// Authentication middleware with database
// ============================================

import { createMiddleware } from "hono/factory";
import { eq } from "drizzle-orm";
import { db, users, sessions } from "@discourse/db";
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
 * Session expiration time (7 days in milliseconds)
 */
const SESSION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Extract token from Authorization header
 */
function extractToken(authHeader: string | undefined): string | null {
  if (!authHeader) return null;
  if (!authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7).trim();
  return token || null;
}

/**
 * Require authentication middleware
 * 
 * Now validates against database sessions.
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

  // Find session in database
  const session = await db.query.sessions.findFirst({
    where: eq(sessions.token, token),
    with: {
      user: true,
    },
  });

  if (!session) {
    return c.json(
      errorResponse("Invalid or expired token. Please log in again."),
      401
    );
  }

  // Check if session is expired
  if (new Date() > session.expiresAt) {
    // Delete expired session
    await db.delete(sessions).where(eq(sessions.id, session.id));
    return c.json(
      errorResponse("Session expired. Please log in again."),
      401
    );
  }

  // Remove password from user
  const { passwordHash, ...safeUser } = session.user;

  // Add user info to context
  c.set("userId", session.userId);
  c.set("user", safeUser as SafeUser);

  await next();
});

/**
 * Optional authentication middleware
 */
export const optionalAuth = createMiddleware(async (c, next) => {
  const authHeader = c.req.header("Authorization");
  const token = extractToken(authHeader);

  if (token) {
    const session = await db.query.sessions.findFirst({
      where: eq(sessions.token, token),
      with: {
        user: true,
      },
    });

    if (session && new Date() <= session.expiresAt) {
      const { passwordHash, ...safeUser } = session.user;
      c.set("userId", session.userId);
      c.set("user", safeUser as SafeUser);
    }
  }

  await next();
});

/**
 * Generate a session token
 */
export function generateToken(): string {
  return `tok_${Date.now().toString(36)}${Math.random().toString(36).substring(2)}`;
}

/**
 * Calculate session expiry date
 */
export function getSessionExpiry(): Date {
  return new Date(Date.now() + SESSION_EXPIRY_MS);
}

/**
 * Simple password hashing (temporary - use Argon2 in production)
 */
export function hashPassword(password: string): string {
  return Buffer.from(password).toString("base64");
}

/**
 * Simple password verification (temporary)
 */
export function verifyPassword(password: string, hash: string): boolean {
  return Buffer.from(password).toString("base64") === hash;
}