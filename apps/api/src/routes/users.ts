// ============================================
// apps/api/src/routes/users.ts
// User profile routes with database
// ============================================

import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { db, users } from "@discourse/db";
import { requireAuth, optionalAuth } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { updateProfileSchema } from "../validators";
import { successResponse, errorResponse } from "../utils";
import type { UpdateProfileInput } from "../validators";

const userRouter = new Hono();

// ==================== GET USER PROFILE ====================

userRouter.get("/:id", optionalAuth, async (c) => {
  const userId = c.req.param("id");

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      id: true,
      username: true,
      avatarUrl: true,
      bio: true,
      debateStats: true,
      createdAt: true,
      // Only include email if viewing own profile
      email: true,
    },
  });

  if (!user) {
    return c.json(errorResponse("User not found"), 404);
  }

  const currentUserId = c.get("userId");
  const isOwner = currentUserId === userId;

  // Remove email for other users
  const profile = isOwner
    ? user
    : { ...user, email: undefined };

  return c.json(successResponse({ user: profile }));
});

// ==================== UPDATE PROFILE ====================

userRouter.patch(
  "/me",
  requireAuth,
  validateBody(updateProfileSchema),
  async (c) => {
    const userId = c.get("userId");
    const updates = c.get("validatedBody") as UpdateProfileInput;

    // Check username uniqueness if changing
    if (updates.username) {
      const existingUsername = await db.query.users.findFirst({
        where: eq(users.username, updates.username),
      });

      if (existingUsername && existingUsername.id !== userId) {
        return c.json(errorResponse("Username already taken"), 409);
      }
    }

    // Update user
    const [updatedUser] = await db
      .update(users)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    if (!updatedUser) {
      return c.json(errorResponse("User not found"), 404);
    }

    // Remove password from response
    const { passwordHash, ...safeUser } = updatedUser;

    return c.json(
      successResponse({ user: safeUser }, "Profile updated successfully")
    );
  }
);

// ==================== GET USER STATS ====================

userRouter.get("/:id/stats", async (c) => {
  const userId = c.req.param("id");

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      debateStats: true,
    },
  });

  if (!user) {
    return c.json(errorResponse("User not found"), 404);
  }

  return c.json(successResponse({ stats: user.debateStats }));
});

export { userRouter as userRoutes };