// ============================================
// apps/api/src/routes/waitlist.ts
// Waitlist routes for landing page
// ============================================

import { Hono } from "hono";
import type { JoinWaitlistRequest, ApiResponse, WaitlistEntry } from "../types";
import { successResponse, errorResponse, generateId } from "../utils";
import { isValidEmail } from "../utils";

const waitlist = new Hono();

// In-memory storage (will be replaced with database later)
const waitlistEntries: WaitlistEntry[] = [];

// Join waitlist
waitlist.post("/", async (c) => {
  try {
    const body = await c.req.json<JoinWaitlistRequest>();
    
    // Validate email
    if (!body.email || !isValidEmail(body.email)) {
      return c.json(errorResponse("Invalid email address"), 400);
    }
    
    // Check if already exists
    const exists = waitlistEntries.find((e) => e.email === body.email);
    if (exists) {
      return c.json(successResponse({ position: waitlistEntries.indexOf(exists) + 1 }, "Already on waitlist"));
    }
    
    // Add to waitlist
    const entry: WaitlistEntry = {
      id: generateId("wl"),
      email: body.email,
      source: body.source,
      createdAt: new Date(),
    };
    
    waitlistEntries.push(entry);
    
    return c.json(
      successResponse(
        { position: waitlistEntries.length },
        "Successfully joined the waitlist!"
      ),
      201
    );
  } catch (error) {
    return c.json(errorResponse("Invalid request body"), 400);
  }
});

// Check waitlist status
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

// Get waitlist count (public)
waitlist.get("/count", (c) => {
  return c.json(successResponse({ count: waitlistEntries.length }));
});

export { waitlist as waitlistRoutes };