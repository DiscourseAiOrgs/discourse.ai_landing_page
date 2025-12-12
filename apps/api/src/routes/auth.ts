// ============================================
// apps/api/src/routes/auth.ts
// Authentication routes
// ============================================

import { Hono } from "hono";
import {
  requireAuth,
  sessions,
  users,
  generateToken,
  hashPassword,
  verifyPassword,
} from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { signupSchema, loginSchema } from "../validators";
import { successResponse, errorResponse, generateId } from "../utils";
import type { SignupInput, LoginInput } from "../validators";
import type { SafeUser } from "../types";

/**
 * Create Hono router for auth routes
 * 
 * This will be mounted at /api/auth in the main app.
 */
const authRouter = new Hono();

/**
 * Helper to create safe user (without password)
 * 
 * NEVER send passwordHash to clients!
 */
function toSafeUser(user: typeof users[0]): SafeUser {
  const { passwordHash, ...safe } = user;
  return safe;
}

// ==================== SIGNUP ====================

/**
 * POST /api/auth/signup
 * 
 * Register a new user account.
 * 
 * Request body:
 * {
 *   "email": "user@example.com",
 *   "username": "username",
 *   "password": "password123"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "user": { id, email, username, ... },
 *     "token": "tok_..."
 *   }
 * }
 */
authRouter.post(
  "/signup",
  validateBody(signupSchema),  // Validate request body
  async (c) => {
    // Get validated data (type-safe!)
    const { email, username, password } = c.get("validatedBody") as SignupInput;

    // Check if email already exists
    const existingEmail = users.find((u) => u.email === email);
    if (existingEmail) {
      return c.json(
        errorResponse("An account with this email already exists"),
        409  // 409 Conflict
      );
    }

    // Check if username already exists
    const existingUsername = users.find((u) => u.username === username);
    if (existingUsername) {
      return c.json(
        errorResponse("This username is already taken"),
        409
      );
    }

    // Create user object
    const now = new Date();
    const user = {
      id: generateId("usr"),
      email,
      username,
      passwordHash: hashPassword(password),
      createdAt: now,
      updatedAt: now,
      emailVerified: false,
    };

    // Store user (in-memory for now)
    users.push(user);

    // Create session
    const token = generateToken();
    const safeUser = toSafeUser(user);
    sessions.set(token, { userId: user.id, user: safeUser });

    // Return user and token
    return c.json(
      successResponse(
        { user: safeUser, token },
        "Account created successfully"
      ),
      201  // 201 Created
    );
  }
);

// ==================== LOGIN ====================

/**
 * POST /api/auth/login
 * 
 * Authenticate and get a session token.
 * 
 * Request body:
 * {
 *   "email": "user@example.com",
 *   "password": "password123"
 * }
 */
authRouter.post(
  "/login",
  validateBody(loginSchema),
  async (c) => {
    const { email, password } = c.get("validatedBody") as LoginInput;

    // Find user by email
    const user = users.find((u) => u.email === email);
    
    if (!user) {
      return c.json(
        errorResponse("Invalid email or password"),
        401  // 401 Unauthorized
      );
    }

    // Verify password
    if (!verifyPassword(password, user.passwordHash)) {
      return c.json(
        errorResponse("Invalid email or password"),
        401
      );
    }

    // Create session
    const token = generateToken();
    const safeUser = toSafeUser(user);
    sessions.set(token, { userId: user.id, user: safeUser });

    return c.json(
      successResponse(
        { user: safeUser, token },
        "Logged in successfully"
      )
    );
  }
);

// ==================== LOGOUT ====================

/**
 * POST /api/auth/logout
 * 
 * End the current session.
 * Requires authentication.
 */
authRouter.post("/logout", requireAuth, async (c) => {
  // Get token from header
  const authHeader = c.req.header("Authorization");
  const token = authHeader?.slice(7); // Remove "Bearer "

  if (token) {
    // Remove session
    sessions.delete(token);
  }

  return c.json(successResponse(null, "Logged out successfully"));
});

// ==================== GET CURRENT USER ====================

/**
 * GET /api/auth/me
 * 
 * Get the currently authenticated user.
 * Requires authentication.
 */
authRouter.get("/me", requireAuth, async (c) => {
  const user = c.get("user");
  return c.json(successResponse({ user }));
});

// Export router
export { authRouter as authRoutes };