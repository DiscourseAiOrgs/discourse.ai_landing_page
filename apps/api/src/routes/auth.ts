// ============================================
// apps/api/src/routes/auth.ts
// Authentication routes with Argon2 + JWT
// ============================================

import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { db, users } from "@cortify/db";
import { requireAuth } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { signupSchema, loginSchema } from "../validators";
import {
  successResponse,
  errorResponse,
  hashPassword,
  verifyPassword,
  createToken,
} from "../utils";
import type { SignupInput, LoginInput } from "../validators";
import type { SafeUser } from "../types";

const authRouter = new Hono();

/**
 * Helper to create safe user (without password)
 */
function toSafeUser(user: typeof users.$inferSelect): SafeUser {
  const { passwordHash, ...safe } = user;
  return safe as SafeUser;
}

// ==================== SIGNUP ====================

/**
 * POST /api/auth/signup
 * 
 * Register a new user account.
 * 
 * Security improvements:
 * 1. Password hashed with Argon2id (not Base64!)
 * 2. JWT token returned (stateless auth)
 * 
 * Request body:
 * {
 *   "email": "user@example.com",
 *   "username": "username",
 *   "password": "password123"
 * }
 */
authRouter.post(
  "/signup",
  validateBody(signupSchema),
  async (c) => {
    const { email, username, password } = c.get("validatedBody") as SignupInput;

    // Check if email already exists
    const existingEmail = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (existingEmail) {
      return c.json(
        errorResponse("An account with this email already exists"),
        409
      );
    }

    // Check if username already exists
    const existingUsername = await db.query.users.findFirst({
      where: eq(users.username, username),
    });

    if (existingUsername) {
      return c.json(errorResponse("This username is already taken"), 409);
    }

    // Hash password with Argon2 (secure!)
    const hashedPassword = await hashPassword(password);

    // Create user in database
    const [user] = await db
      .insert(users)
      .values({
        email,
        username,
        passwordHash: hashedPassword,
      })
      .returning();

    // Create JWT token
    const token = await createToken(user.id, user.email);

    // Return user and token
    return c.json(
      successResponse(
        { user: toSafeUser(user), token },
        "Account created successfully"
      ),
      201
    );
  }
);

// ==================== LOGIN ====================

/**
 * POST /api/auth/login
 * 
 * Authenticate and get a JWT token.
 */
authRouter.post(
  "/login",
  validateBody(loginSchema),
  async (c) => {
    const { email, password } = c.get("validatedBody") as LoginInput;

    // Find user by email
    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!user) {
      return c.json(errorResponse("Invalid email or password"), 401);
    }

    // Verify password with Argon2
    const isValid = await verifyPassword(password, user.passwordHash);

    if (!isValid) {
      return c.json(errorResponse("Invalid email or password"), 401);
    }

    // Create JWT token
    const token = await createToken(user.id, user.email);

    // Update last login time (optional)
    await db
      .update(users)
      .set({ updatedAt: new Date() })
      .where(eq(users.id, user.id));

    return c.json(
      successResponse(
        { user: toSafeUser(user), token },
        "Logged in successfully"
      )
    );
  }
);

// ==================== LOGOUT ====================

/**
 * POST /api/auth/logout
 * 
 * With JWT, logout is handled client-side by deleting the token.
 * This endpoint exists for API consistency and can be used for:
 * - Token blacklisting (if implemented)
 * - Clearing server-side session data (if any)
 * - Analytics/audit logging
 */
authRouter.post("/logout", requireAuth, async (c) => {
  // With JWT, we don't need to do anything server-side
  // The client should delete the token
  
  // In the future, you could:
  // 1. Add token to a blacklist (Redis)
  // 2. Log the logout event
  // 3. Invalidate refresh tokens

  return c.json(successResponse(null, "Logged out successfully"));
});

// ==================== GET CURRENT USER ====================

/**
 * GET /api/auth/me
 * 
 * Get the currently authenticated user.
 */
authRouter.get("/me", requireAuth, async (c) => {
  const user = c.get("user");
  const jwtPayload = c.get("jwtPayload");

  return c.json(
    successResponse({
      user,
      // Include token info for debugging/display
      tokenInfo: {
        issuedAt: new Date(jwtPayload.iat * 1000).toISOString(),
        expiresAt: new Date(jwtPayload.exp * 1000).toISOString(),
      },
    })
  );
});

// ==================== REFRESH TOKEN (Optional) ====================

/**
 * POST /api/auth/refresh
 * 
 * Get a new token before the current one expires.
 * The user must still be authenticated.
 */
authRouter.post("/refresh", requireAuth, async (c) => {
  const user = c.get("user");

  // Create new token
  const token = await createToken(user.id, user.email);

  return c.json(
    successResponse(
      { token },
      "Token refreshed successfully"
    )
  );
});

export { authRouter as authRoutes };