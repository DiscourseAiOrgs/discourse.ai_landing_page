// ============================================
// apps/api/src/routes/auth.ts
// Authentication routes
// ============================================

import { Hono } from "hono";
import { validateBody } from "../middleware/validate";
import { signupSchema, loginSchema } from "../validators";
import { successResponse, errorResponse, generateId } from "../utils";
import type { User, SafeUser, AuthResponse } from "../types";

/**
 * Create a new Hono router instance
 * 
 * We create separate routers for each feature (auth, users, debates)
 * then mount them on the main app with app.route("/api/auth", auth)
 */
const auth = new Hono();

// ==================== TEMPORARY IN-MEMORY STORAGE ====================
/**
 * WARNING: This is temporary! Data is lost when server restarts.
 * We'll replace this with PostgreSQL in Article 6.
 * 
 * StoredUser extends User but includes passwordHash
 * which we never send to the client
 */

interface StoredUser extends User {
  passwordHash: string;
}

// Array to store users (temporary - will be database table)
const users: StoredUser[] = [];

// Map to store sessions: token -> userId
// This tracks who is logged in
const sessions: Map<string, string> = new Map();

// ==================== HELPER FUNCTIONS ====================

/**
 * Hash a password for storage
 * 
 * SECURITY NOTE: This is a TEMPORARY simple hash!
 * In Article 7, we'll use Argon2 which is cryptographically secure.
 * Never use Base64 for real password hashing!
 */
function hashPassword(password: string): string {
  return Buffer.from(password).toString("base64");
}

/**
 * Verify a password against its hash
 */
function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

/**
 * Generate a random session token
 * 
 * In Article 7, we'll replace this with proper JWT tokens
 */
function generateToken(): string {
  return `tok_${generateId("sess")}`;
}

/**
 * Remove sensitive fields before sending user to client
 * 
 * We NEVER want to send passwordHash to the frontend
 */
function toSafeUser(user: StoredUser): SafeUser {
  // Destructure to remove passwordHash, keep everything else
  const { passwordHash, ...safe } = user;
  return safe;
}

// ==================== ROUTES ====================

/**
 * POST /api/auth/signup
 * 
 * Creates a new user account
 * 
 * Flow:
 * 1. validateBody middleware validates the request
 * 2. Check if email/username already exists
 * 3. Hash the password
 * 4. Create user object
 * 5. Create session token
 * 6. Return user + token
 */
auth.post("/signup", validateBody(signupSchema), async (c) => {
  // Get validated data from middleware
  // We know this is safe because validation already passed
  const { email, username, password } = c.get("validatedBody") as {
    email: string;
    username: string;
    password: string;
  };

  // Check if email already exists
  // .find() returns undefined if not found
  if (users.find((u) => u.email === email)) {
    return c.json(errorResponse("Email already registered"), 400);
  }

  // Check if username already exists
  if (users.find((u) => u.username === username)) {
    return c.json(errorResponse("Username already taken"), 400);
  }

  // Create user object
  const user: StoredUser = {
    id: generateId("usr"),           // e.g., "usr_m5x8k2abc123"
    email,
    username,
    passwordHash: hashPassword(password),
    emailVerified: false,            // Email not verified yet
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Save to "database" (array for now)
  users.push(user);

  // Create session - generate token and map it to user ID
  const token = generateToken();
  sessions.set(token, user.id);

  // Build response (without password!)
  const response: AuthResponse = {
    user: toSafeUser(user),
    token,
  };

  // Return 201 Created (standard for resource creation)
  return c.json(successResponse(response, "Account created successfully"), 201);
});

/**
 * POST /api/auth/login
 * 
 * Authenticates a user and returns a session token
 * 
 * Flow:
 * 1. Validate email and password
 * 2. Find user by email
 * 3. Verify password
 * 4. Create new session token
 * 5. Return user + token
 */
auth.post("/login", validateBody(loginSchema), async (c) => {
  const { email, password } = c.get("validatedBody") as {
    email: string;
    password: string;
  };

  // Find user by email
  const user = users.find((u) => u.email === email);
  if (!user) {
    // Security: Don't reveal whether email exists or password is wrong
    // Always use the same error message for both cases
    return c.json(errorResponse("Invalid email or password"), 401);
  }

  // Verify password
  if (!verifyPassword(password, user.passwordHash)) {
    return c.json(errorResponse("Invalid email or password"), 401);
  }

  // Create new session
  const token = generateToken();
  sessions.set(token, user.id);

  const response: AuthResponse = {
    user: toSafeUser(user),
    token,
  };

  return c.json(successResponse(response, "Login successful"));
});

/**
 * POST /api/auth/logout
 * 
 * Invalidates the current session
 * 
 * The token comes in the Authorization header:
 * Authorization: Bearer tok_xxxxx
 */
auth.post("/logout", async (c) => {
  // Get Authorization header
  const authHeader = c.req.header("Authorization");
  
  // Check if it's a Bearer token
  if (authHeader?.startsWith("Bearer ")) {
    // Extract the token (everything after "Bearer ")
    const token = authHeader.slice(7);
    // Remove from sessions map
    sessions.delete(token);
  }

  // Always return success (even if token didn't exist)
  // This prevents attackers from knowing if a token was valid
  return c.json(successResponse(null, "Logged out successfully"));
});

/**
 * GET /api/auth/me
 * 
 * Returns the currently logged-in user
 * 
 * This is used by the frontend to check if user is still logged in
 * and to get fresh user data
 */
auth.get("/me", async (c) => {
  const authHeader = c.req.header("Authorization");
  
  // Check for Bearer token
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json(errorResponse("Unauthorized"), 401);
  }

  // Extract token
  const token = authHeader.slice(7);
  
  // Look up user ID from session
  const userId = sessions.get(token);
  if (!userId) {
    return c.json(errorResponse("Invalid or expired token"), 401);
  }

  // Find user
  const user = users.find((u) => u.id === userId);
  if (!user) {
    return c.json(errorResponse("User not found"), 404);
  }

  return c.json(successResponse({ user: toSafeUser(user) }));
});

// Export the router
export { auth as authRoutes };

// Export these for use in auth middleware (other files need access)
export { sessions, users };