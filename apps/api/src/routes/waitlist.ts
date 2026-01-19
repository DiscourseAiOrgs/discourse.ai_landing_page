// ============================================
// apps/api/src/routes/waitlist.ts
// Waitlist routes with database
// ============================================

import { Hono } from "hono";
import { eq, count } from "drizzle-orm";
import { db, waitlist } from "@cortify/db";
import { validateBody } from "../middleware/validate";
import { joinWaitlistSchema } from "../validators";
import { successResponse, errorResponse } from "../utils";
import type { JoinWaitlistInput } from "../validators";

const waitlistRouter = new Hono();

// ==================== JOIN WAITLIST ====================

waitlistRouter.post("/", validateBody(joinWaitlistSchema), async (c) => {
  const { email, source } = c.get("validatedBody") as JoinWaitlistInput;

  // Check if already on waitlist
  const existing = await db.query.waitlist.findFirst({
    where: eq(waitlist.email, email),
  });

  if (existing) {
    // Get position
    const [result] = await db
      .select({ count: count() })
      .from(waitlist);

    return c.json(
      successResponse(
        { position: result.count },
        "You're already on the waitlist!"
      )
    );
  }

  // Add to waitlist
  await db.insert(waitlist).values({
    email,
    source,
  });

  // Get new position
  const [result] = await db
    .select({ count: count() })
    .from(waitlist);

  return c.json(
    successResponse(
      { position: result.count },
      "You've been added to the waitlist!"
    ),
    201
  );
});

// ==================== CHECK STATUS ====================

waitlistRouter.get("/status", async (c) => {
  const email = c.req.query("email");

  if (!email) {
    return c.json(errorResponse("Email is required"), 400);
  }

  const entry = await db.query.waitlist.findFirst({
    where: eq(waitlist.email, email.toLowerCase()),
  });

  if (!entry) {
    return c.json(
      successResponse({
        onWaitlist: false,
      })
    );
  }

  return c.json(
    successResponse({
      onWaitlist: true,
      joinedAt: entry.createdAt,
    })
  );
});

// ==================== GET COUNT ====================

waitlistRouter.get("/count", async (c) => {
  const [result] = await db
    .select({ count: count() })
    .from(waitlist);

  return c.json(
    successResponse({
      count: result.count,
    })
  );
});

export { waitlistRouter as waitlistRoutes };