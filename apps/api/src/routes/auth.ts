// ============================================
// apps/api/src/routes/auth.ts
// Authentication routes with database
// ============================================

import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { db, users, sessions } from "@discourse/db";
import {
  requireAuth,
  generateToken,
  getSessionExpiry,
  hashPassword,
  verifyPassword,
} from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { signupSchema, loginSchema } from "../validators";
import { successResponse, errorResponse } from "../utils";
import type { SignupInput, LoginInput } from "../validators";
import type { SafeUser } from "../types";

const authRouter = new Hono();

/**
 * Helper to create safe user (without password)
 */
function toSafeUser(user: typeof users.$inferSelect): SafeUser {
  const { passwordHash, ...safe } = user;
  return safe;
}

// ==================== SIGNUP ====================

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

    // Create user in database
    const [user] = await db
      .insert(users)
      .values({
        email,
        username,
        passwordHash: hashPassword(password),
      })
      .returning();

    // Create session
    const token = generateToken();
    await db.insert(sessions).values({
      userId: user.id,
      token,
      expiresAt: getSessionExpiry(),
    });

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

    // Verify password
    if (!verifyPassword(password, user.passwordHash)) {
      return c.json(errorResponse("Invalid email or password"), 401);
    }

    // Create session
    const token = generateToken();
    await db.insert(sessions).values({
      userId: user.id,
      token,
      expiresAt: getSessionExpiry(),
    });

    return c.json(
      successResponse(
        { user: toSafeUser(user), token },
        "Logged in successfully"
      )
    );
  }
);

// ==================== LOGOUT ====================

authRouter.post("/logout", requireAuth, async (c) => {
  const authHeader = c.req.header("Authorization");
  const token = authHeader?.slice(7);

  if (token) {
    await db.delete(sessions).where(eq(sessions.token, token));
  }

  return c.json(successResponse(null, "Logged out successfully"));
});

// ==================== GET CURRENT USER ====================

authRouter.get("/me", requireAuth, async (c) => {
  const user = c.get("user");
  return c.json(successResponse({ user }));
});

export { authRouter as authRoutes };