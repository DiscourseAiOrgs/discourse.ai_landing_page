// ============================================
// apps/api/src/routes/users.ts
// User profile routes
// ============================================

import { Hono } from "hono";
import { requireAuth } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { updateProfileSchema } from "../validators";
import { successResponse, errorResponse } from "../utils";
import { users } from "./auth";
import type { UserStats, SafeUser } from "../types";

const usersRouter = new Hono();

// ==================== TEMPORARY DATA ====================

/**
 * Map to store user statistics
 * Key: userId
 * Value: UserStats object
 * 
 * Will be replaced with database table in Article 6
 */
const userStats: Map<string, UserStats> = new Map();

/**
 * Get or create stats for a user
 * Returns existing stats or creates default stats
 */
function getOrCreateStats(userId: string): UserStats {
  if (!userStats.has(userId)) {
    userStats.set(userId, {
      totalDebates: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      avgScore: 0,
    });
  }
  return userStats.get(userId)!;  // ! tells TypeScript it's definitely defined
}

// ==================== ROUTES ====================

/**
 * GET /api/users/:id
 * 
 * Get a user's PUBLIC profile (anyone can view)
 * 
 * :id is a URL parameter - the actual value replaces :id
 * Example: GET /api/users/usr_abc123
 * 
 * We only return public fields (no email, no password)
 */
usersRouter.get("/:id", async (c) => {
  // Extract the :id parameter from URL
  const userId = c.req.param("id");
  
  // Find user
  const user = users.find((u) => u.id === userId);
  if (!user) {
    return c.json(errorResponse("User not found"), 404);
  }

  // Return only public fields
  // Note: No email included for privacy
  const publicProfile = {
    id: user.id,
    username: user.username,
    bio: user.bio,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt,
  };

  return c.json(successResponse(publicProfile));
});

/**
 * PATCH /api/users/me
 * 
 * Update your OWN profile (requires login)
 * 
 * PATCH means partial update - only send fields you want to change
 * This is different from PUT which replaces the entire resource
 * 
 * requireAuth middleware ensures:
 * 1. User must be logged in
 * 2. c.get("userId") contains their ID
 */
usersRouter.patch("/me", requireAuth, validateBody(updateProfileSchema), async (c) => {
  // Get logged-in user's ID from auth middleware
  const userId = c.get("userId");
  
  // Get validated update data
  const updates = c.get("validatedBody") as {
    username?: string;
    bio?: string;
    avatarUrl?: string;
  };

  // Find user's index in array (so we can update it)
  const userIndex = users.findIndex((u) => u.id === userId);
  if (userIndex === -1) {
    return c.json(errorResponse("User not found"), 404);
  }

  // If changing username, check it's not taken by someone else
  if (updates.username) {
    const existing = users.find(
      (u) => u.username === updates.username && u.id !== userId
    );
    if (existing) {
      return c.json(errorResponse("Username already taken"), 400);
    }
  }

  // Apply updates
  const user = users[userIndex];
  if (updates.username) user.username = updates.username;
  if (updates.bio !== undefined) user.bio = updates.bio;  // Allow empty string
  if (updates.avatarUrl !== undefined) user.avatarUrl = updates.avatarUrl;
  user.updatedAt = new Date();

  // Return updated user (without password)
  const { passwordHash, ...safeUser } = user;

  return c.json(successResponse(safeUser, "Profile updated successfully"));
});

/**
 * GET /api/users/:id/stats
 * 
 * Get a user's debate statistics (public)
 */
usersRouter.get("/:id/stats", async (c) => {
  const userId = c.req.param("id");
  
  // Verify user exists
  const user = users.find((u) => u.id === userId);
  if (!user) {
    return c.json(errorResponse("User not found"), 404);
  }

  // Get or create stats
  const stats = getOrCreateStats(userId);

  return c.json(successResponse(stats));
});

export { usersRouter as userRoutes };