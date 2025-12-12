// ============================================
// apps/api/src/routes/users.ts
// User profile routes
// ============================================

import { Hono } from "hono";
import { requireAuth, optionalAuth, users } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { updateProfileSchema } from "../validators";
import { successResponse, errorResponse } from "../utils";
import type { UpdateProfileInput } from "../validators";
import type { SafeUser, UserStats } from "../types";

const userRouter = new Hono();

/**
 * In-memory stats store (temporary)
 * 
 * ⚠️ Will be replaced with database in Article 6.
 */
const userStats = new Map<string, UserStats>();

// ==================== GET USER PROFILE ====================

/**
 * GET /api/users/:id
 * 
 * Get public profile of any user.
 * Works for both authenticated and anonymous users.
 */
userRouter.get("/:id", optionalAuth, async (c) => {
  const userId = c.req.param("id");

  // Find user
  const user = users.find((u) => u.id === userId);

  if (!user) {
    return c.json(errorResponse("User not found"), 404);
  }

  // Return public profile (no email for other users)
  const currentUserId = c.get("userId");
  const isOwner = currentUserId === userId;

  const profile = {
    id: user.id,
    username: user.username,
    bio: undefined,  // Will come from database
    avatarUrl: undefined,
    createdAt: user.createdAt,
    // Only include email if viewing own profile
    ...(isOwner && { email: user.email }),
  };

  return c.json(successResponse({ user: profile }));
});

// ==================== UPDATE PROFILE ====================

/**
 * PATCH /api/users/me
 * 
 * Update the current user's profile.
 * Requires authentication.
 * 
 * Request body (all optional):
 * {
 *   "username": "newusername",
 *   "bio": "About me...",
 *   "avatarUrl": "https://..."
 * }
 */
userRouter.patch(
  "/me",
  requireAuth,
  validateBody(updateProfileSchema),
  async (c) => {
    const userId = c.get("userId");
    const updates = c.get("validatedBody") as UpdateProfileInput;

    // Find user index
    const userIndex = users.findIndex((u) => u.id === userId);

    if (userIndex === -1) {
      return c.json(errorResponse("User not found"), 404);
    }

    // Check username uniqueness if changing
    if (updates.username) {
      const existingUsername = users.find(
        (u) => u.username === updates.username && u.id !== userId
      );
      if (existingUsername) {
        return c.json(errorResponse("Username already taken"), 409);
      }
    }

    // Update user
    const user = users[userIndex];
    if (updates.username) user.username = updates.username;
    user.updatedAt = new Date();

    // Return updated user (without password)
    const { passwordHash, ...safeUser } = user;

    return c.json(
      successResponse({ user: safeUser }, "Profile updated successfully")
    );
  }
);

// ==================== GET USER STATS ====================

/**
 * GET /api/users/:id/stats
 * 
 * Get debate statistics for a user.
 */
userRouter.get("/:id/stats", async (c) => {
  const userId = c.req.param("id");

  // Check if user exists
  const user = users.find((u) => u.id === userId);
  if (!user) {
    return c.json(errorResponse("User not found"), 404);
  }

  // Get or create stats
  let stats = userStats.get(userId);
  
  if (!stats) {
    stats = {
      totalDebates: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      avgScore: 0,
    };
    userStats.set(userId, stats);
  }

  return c.json(successResponse({ stats }));
});

export { userRouter as userRoutes };