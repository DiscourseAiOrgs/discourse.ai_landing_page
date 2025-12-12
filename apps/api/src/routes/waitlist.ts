// ============================================
// apps/api/src/routes/waitlist.ts
// Waitlist routes for landing page
// ============================================

import { Hono } from "hono";
import { validateBody } from "../middleware/validate";
import { joinWaitlistSchema } from "../validators";
import { successResponse, errorResponse, generateId } from "../utils";
import type { JoinWaitlistInput } from "../validators";

const waitlistRouter = new Hono();

// ==================== IN-MEMORY STORE (TEMPORARY) ====================

interface WaitlistEntry {
  id: string;
  email: string;
  source?: string;
  createdAt: Date;
}

const waitlist: WaitlistEntry[] = [];

// ==================== ROUTES ====================

/**
 * POST /api/waitlist
 * 
 * Join the waitlist.
 */
waitlistRouter.post("/", validateBody(joinWaitlistSchema), async (c) => {
  const { email, source } = c.get("validatedBody") as JoinWaitlistInput;

  // Check if already on waitlist
  const existing = waitlist.find((w) => w.email === email);
  if (existing) {
    return c.json(
      successResponse(
        { position: waitlist.indexOf(existing) + 1 },
        "You're already on the waitlist!"
      )
    );
  }

  // Add to waitlist
  const entry: WaitlistEntry = {
    id: generateId("wl"),
    email,
    source,
    createdAt: new Date(),
  };

  waitlist.push(entry);

  return c.json(
    successResponse(
      { position: waitlist.length },
      "You've been added to the waitlist!"
    ),
    201
  );
});

/**
 * GET /api/waitlist/status
 * 
 * Check waitlist status by email.
 */
waitlistRouter.get("/status", async (c) => {
  const email = c.req.query("email");

  if (!email) {
    return c.json(errorResponse("Email is required"), 400);
  }

  const entry = waitlist.find((w) => w.email === email.toLowerCase());

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
      position: waitlist.indexOf(entry) + 1,
      joinedAt: entry.createdAt,
    })
  );
});

/**
 * GET /api/waitlist/count
 * 
 * Get total waitlist count (for social proof).
 */
waitlistRouter.get("/count", async (c) => {
  return c.json(
    successResponse({
      count: waitlist.length,
    })
  );
});

export { waitlistRouter as waitlistRoutes };