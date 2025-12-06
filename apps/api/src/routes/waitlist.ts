// ============================================
// apps/api/src/routes/waitlist.ts
// Waitlist routes for landing page
// ============================================

import { Hono } from "hono";
import { validateBody } from "../middleware/validate";
import { joinWaitlistSchema } from "../validators";
import { successResponse, errorResponse, generateId } from "../utils";
import type { WaitlistEntry } from "../types";

const waitlist = new Hono();

// In-memory storage for waitlist entries
const waitlistEntries: WaitlistEntry[] = [];

/**
 * POST /api/waitlist
 * 
 * Add email to waitlist
 * Used on landing page before the app launches
 */
waitlist.post("/", validateBody(joinWaitlistSchema), async (c) => {
  // Zod already validated the email format
  const { email, source } = c.get("validatedBody") as {
    email: string;
    source?: string;
  };

  // Check if email already on waitlist
  const exists = waitlistEntries.find((e) => e.email === email);
  if (exists) {
    // Not an error - just tell them their position
    return c.json(
      successResponse(
        { position: waitlistEntries.indexOf(exists) + 1 },
        "Already on waitlist"
      )
    );
  }

  // Add to waitlist
  const entry: WaitlistEntry = {
    id: generateId("wl"),
    email,
    source,              // Track where signup came from (landing, social, etc.)
    createdAt: new Date(),
  };

  waitlistEntries.push(entry);

  // Return position (1-indexed for human readability)
  return c.json(
    successResponse(
      { position: waitlistEntries.length },
      "Successfully joined the waitlist!"
    ),
    201
  );
});

/**
 * GET /api/waitlist/status
 * 
 * Check if an email is on the waitlist
 * Query parameter: ?email=test@example.com
 */
waitlist.get("/status", (c) => {
  const email = c.req.query("email");

  if (!email) {
    return c.json(errorResponse("Email query parameter required"), 400);
  }

  const entry = waitlistEntries.find((e) => e.email === email);

  if (!entry) {
    return c.json(successResponse({ onWaitlist: false }));
  }

  return c.json(
    successResponse({
      onWaitlist: true,
      position: waitlistEntries.indexOf(entry) + 1,
      joinedAt: entry.createdAt,
    })
  );
});

/**
 * GET /api/waitlist/count
 * 
 * Get total number of people on waitlist
 * Useful for social proof on landing page
 */
waitlist.get("/count", (c) => {
  return c.json(successResponse({ count: waitlistEntries.length }));
});

export { waitlist as waitlistRoutes };