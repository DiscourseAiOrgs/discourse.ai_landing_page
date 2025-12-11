// ============================================
// apps/api/src/routes/rooms.ts
// Room management routes for P2P debates
// Based on your desktop app's server.js
// ============================================

import { Hono } from "hono";
import { eq, desc, and, isNull } from "drizzle-orm";
import { db, rooms, roomParticipants } from "@discourse/db";
import { requireAuth, optionalAuth } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { createRoomSchema, joinRoomSchema } from "../validators";
import { successResponse, errorResponse, generateId } from "../utils";

const roomsRouter = new Hono();

// ==================== HELPER FUNCTIONS ====================

/**
 * Generate a short invite code
 * Similar to your server.js: roomId.split('-')[0].toUpperCase()
 * But we make it more user-friendly
 */
function generateInviteCode(): string {
  // Generate 8-character alphanumeric code
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Removed confusing chars (0,O,1,I)
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// ==================== ROUTES ====================

/**
 * POST /api/rooms
 * Create a new P2P room
 * 
 * This mirrors your server.js:
 * app.post('/api/rooms', (req, res) => { ... })
 * 
 * But stores in PostgreSQL instead of in-memory Map
 */
roomsRouter.post(
  "/",
  requireAuth,
  validateBody(createRoomSchema),
  async (c) => {
    const userId = c.get("userId");
    const input = c.get("validatedBody") as {
      debateId?: string;
      maxParticipants?: number;
    };

    // Generate unique invite code
    let inviteCode = generateInviteCode();
    
    // Ensure invite code is unique (unlikely collision but check anyway)
    let attempts = 0;
    while (attempts < 5) {
      const existing = await db.query.rooms.findFirst({
        where: eq(rooms.inviteCode, inviteCode),
      });
      if (!existing) break;
      inviteCode = generateInviteCode();
      attempts++;
    }

    // Create room in database
    const [room] = await db
      .insert(rooms)
      .values({
        inviteCode,
        debateId: input.debateId,
        createdBy: userId,
        maxParticipants: input.maxParticipants || 2,
        status: "active",
      })
      .returning();

    // Response matches your server.js format
    return c.json(
      successResponse(
        {
          roomId: room.id,
          inviteCode: room.inviteCode,
          inviteUrl: `/join/${room.id}`,
          maxParticipants: room.maxParticipants,
        },
        "Room created successfully"
      ),
      201
    );
  }
);

/**
 * GET /api/rooms
 * List active rooms
 * 
 * Similar to your server.js:
 * app.get('/api/rooms', (req, res) => { ... })
 */
roomsRouter.get("/", optionalAuth, async (c) => {
  const userId = c.get("userId");

  // Get active rooms (optionally filter by user's rooms)
  const activeRooms = await db.query.rooms.findMany({
    where: eq(rooms.status, "active"),
    orderBy: [desc(rooms.createdAt)],
    with: {
      participants: {
        where: isNull(roomParticipants.leftAt),
      },
    },
    limit: 50,
  });

  // Transform to match your server.js response format
  const roomList = activeRooms.map((room) => ({
    roomId: room.id,
    inviteCode: room.inviteCode,
    participants: room.participants?.length || 0,
    maxParticipants: room.maxParticipants,
    createdAt: room.createdAt,
    isActive: (room.participants?.length || 0) > 0,
    isOwner: room.createdBy === userId,
  }));

  return c.json(successResponse({ rooms: roomList }));
});

/**
 * GET /api/rooms/:id
 * Get room details
 * 
 * Similar to your server.js:
 * app.get('/api/rooms/:roomId', (req, res) => { ... })
 */
roomsRouter.get("/:id", async (c) => {
  const roomId = c.req.param("id");

  const room = await db.query.rooms.findFirst({
    where: eq(rooms.id, roomId),
    with: {
      participants: {
        where: isNull(roomParticipants.leftAt),
      },
      debate: true,
    },
  });

  if (!room) {
    return c.json(errorResponse("Room not found"), 404);
  }

  return c.json(
    successResponse({
      room: {
        roomId: room.id,
        inviteCode: room.inviteCode,
        participants: room.participants?.length || 0,
        maxParticipants: room.maxParticipants,
        createdAt: room.createdAt,
        status: room.status,
        isActive: room.status === "active",
        debate: room.debate
          ? {
              id: room.debate.id,
              topic: room.debate.topic,
              status: room.debate.status,
            }
          : null,
      },
    })
  );
});

/**
 * GET /api/rooms/invite/:code
 * Find room by invite code
 * 
 * Allows joining via short invite codes
 */
roomsRouter.get("/invite/:code", async (c) => {
  const inviteCode = c.req.param("code").toUpperCase();

  const room = await db.query.rooms.findFirst({
    where: and(
      eq(rooms.inviteCode, inviteCode),
      eq(rooms.status, "active")
    ),
    with: {
      participants: {
        where: isNull(roomParticipants.leftAt),
      },
    },
  });

  if (!room) {
    return c.json(errorResponse("Room not found or no longer active"), 404);
  }

  // Check if room is full
  const currentParticipants = room.participants?.length || 0;
  if (currentParticipants >= room.maxParticipants) {
    return c.json(errorResponse("Room is full"), 400);
  }

  return c.json(
    successResponse({
      roomId: room.id,
      inviteCode: room.inviteCode,
      participants: currentParticipants,
      maxParticipants: room.maxParticipants,
      spotsAvailable: room.maxParticipants - currentParticipants,
    })
  );
});

/**
 * POST /api/rooms/:id/join
 * Join a room (HTTP endpoint - Socket.IO also handles this)
 * 
 * This creates a participant record.
 * The actual WebRTC connection happens via Socket.IO
 */
roomsRouter.post(
  "/:id/join",
  optionalAuth,
  validateBody(joinRoomSchema),
  async (c) => {
    const roomId = c.req.param("id");
    const userId = c.get("userId"); // May be undefined for guests
    const { displayName } = c.get("validatedBody") as { displayName: string };

    // Find room
    const room = await db.query.rooms.findFirst({
      where: and(eq(rooms.id, roomId), eq(rooms.status, "active")),
      with: {
        participants: {
          where: isNull(roomParticipants.leftAt),
        },
      },
    });

    if (!room) {
      return c.json(errorResponse("Room not found or no longer active"), 404);
    }

    // Check if room is full
    const currentParticipants = room.participants?.length || 0;
    if (currentParticipants >= room.maxParticipants) {
      return c.json(errorResponse("Room is full"), 400);
    }

    // Check if user already in room (if authenticated)
    if (userId) {
      const existing = room.participants?.find((p) => p.userId === userId);
      if (existing) {
        return c.json(
          successResponse({
            participantId: existing.id,
            roomId: room.id,
            message: "Already in room",
          })
        );
      }
    }

    // Determine if this is the host (first participant or room creator)
    const isHost = room.createdBy === userId || currentParticipants === 0;

    // Create participant record
    // Note: socketId will be set when they connect via Socket.IO
    const [participant] = await db
      .insert(roomParticipants)
      .values({
        roomId,
        userId,
        displayName,
        socketId: "", // Set later when Socket.IO connects
        isHost,
      })
      .returning();

    return c.json(
      successResponse(
        {
          participantId: participant.id,
          roomId: room.id,
          inviteCode: room.inviteCode,
          isHost,
          totalParticipants: currentParticipants + 1,
        },
        "Joined room successfully"
      )
    );
  }
);

/**
 * DELETE /api/rooms/:id
 * Close/delete a room
 * Only the room creator can do this
 */
roomsRouter.delete("/:id", requireAuth, async (c) => {
  const roomId = c.req.param("id");
  const userId = c.get("userId");

  const room = await db.query.rooms.findFirst({
    where: eq(rooms.id, roomId),
  });

  if (!room) {
    return c.json(errorResponse("Room not found"), 404);
  }

  if (room.createdBy !== userId) {
    return c.json(errorResponse("Only the room creator can close this room"), 403);
  }

  // Mark room as closed (soft delete)
  await db
    .update(rooms)
    .set({
      status: "closed",
      closedAt: new Date(),
    })
    .where(eq(rooms.id, roomId));

  // Mark all participants as left
  await db
    .update(roomParticipants)
    .set({
      leftAt: new Date(),
    })
    .where(and(
      eq(roomParticipants.roomId, roomId),
      isNull(roomParticipants.leftAt)
    ));

  return c.json(successResponse(null, "Room closed"));
});

export { roomsRouter as roomRoutes };