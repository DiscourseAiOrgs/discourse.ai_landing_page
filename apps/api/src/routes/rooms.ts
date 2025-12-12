// ============================================
// apps/api/src/routes/rooms.ts
// P2P room management routes
// Based on your desktop app's server.js
// ============================================

import { Hono } from "hono";
import { requireAuth, optionalAuth } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { createRoomSchema, joinRoomSchema } from "../validators";
import { successResponse, errorResponse, generateId, generateInviteCode } from "../utils";
import type { CreateRoomInput, JoinRoomInput } from "../validators";
import type { Room, RoomParticipant } from "../types";

const roomRouter = new Hono();

// ==================== IN-MEMORY STORES (TEMPORARY) ====================

/**
 * Temporary storage - will be replaced with database in Article 6
 * 
 * These mirror your server.js structures:
 * const rooms = new Map();
 * const participants = new Map();
 */
const rooms: Room[] = [];
const roomParticipants: RoomParticipant[] = [];

// ==================== ROUTES ====================

/**
 * POST /api/rooms
 * 
 * Create a new P2P room.
 * 
 * This mirrors your server.js:
 * app.post('/api/rooms', (req, res) => { ... })
 */
roomRouter.post(
  "/",
  requireAuth,
  validateBody(createRoomSchema),
  async (c) => {
    const userId = c.get("userId");
    const input = c.get("validatedBody") as CreateRoomInput;

    // Generate unique invite code
    const inviteCode = generateInviteCode();

    // Create room
    const room: Room = {
      id: generateId("room"),
      inviteCode,
      debateId: input.debateId,
      createdBy: userId,
      status: "active",
      maxParticipants: input.maxParticipants || 2,
      createdAt: new Date(),
    };

    rooms.push(room);

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
 * 
 * List active rooms.
 * 
 * Similar to your server.js:
 * app.get('/api/rooms', (req, res) => { ... })
 */
roomRouter.get("/", optionalAuth, async (c) => {
  const userId = c.get("userId");

  // Get active rooms
  const activeRooms = rooms
    .filter((r) => r.status === "active")
    .map((room) => {
      const participants = roomParticipants.filter(
        (p) => p.roomId === room.id && !p.leftAt
      );
      return {
        roomId: room.id,
        inviteCode: room.inviteCode,
        participants: participants.length,
        maxParticipants: room.maxParticipants,
        createdAt: room.createdAt,
        isActive: participants.length > 0,
        isOwner: room.createdBy === userId,
      };
    });

  return c.json(successResponse({ rooms: activeRooms }));
});

/**
 * GET /api/rooms/:id
 * 
 * Get room details.
 */
roomRouter.get("/:id", async (c) => {
  const roomId = c.req.param("id");

  const room = rooms.find((r) => r.id === roomId);

  if (!room) {
    return c.json(errorResponse("Room not found"), 404);
  }

  const participants = roomParticipants.filter(
    (p) => p.roomId === roomId && !p.leftAt
  );

  return c.json(
    successResponse({
      room: {
        roomId: room.id,
        inviteCode: room.inviteCode,
        participants: participants.length,
        maxParticipants: room.maxParticipants,
        createdAt: room.createdAt,
        status: room.status,
        isActive: room.status === "active",
      },
    })
  );
});

/**
 * GET /api/rooms/invite/:code
 * 
 * Find room by invite code.
 */
roomRouter.get("/invite/:code", async (c) => {
  const inviteCode = c.req.param("code").toUpperCase();

  const room = rooms.find(
    (r) => r.inviteCode === inviteCode && r.status === "active"
  );

  if (!room) {
    return c.json(errorResponse("Room not found or no longer active"), 404);
  }

  const participants = roomParticipants.filter(
    (p) => p.roomId === room.id && !p.leftAt
  );

  if (participants.length >= room.maxParticipants) {
    return c.json(errorResponse("Room is full"), 400);
  }

  return c.json(
    successResponse({
      roomId: room.id,
      inviteCode: room.inviteCode,
      participants: participants.length,
      maxParticipants: room.maxParticipants,
      spotsAvailable: room.maxParticipants - participants.length,
    })
  );
});

/**
 * POST /api/rooms/:id/join
 * 
 * Join a room via HTTP.
 * The actual WebRTC connection happens via Socket.IO.
 */
roomRouter.post(
  "/:id/join",
  optionalAuth,
  validateBody(joinRoomSchema),
  async (c) => {
    const roomId = c.req.param("id");
    const userId = c.get("userId");
    const { displayName } = c.get("validatedBody") as JoinRoomInput;

    // Find room
    const room = rooms.find((r) => r.id === roomId && r.status === "active");

    if (!room) {
      return c.json(errorResponse("Room not found or no longer active"), 404);
    }

    // Get current participants
    const currentParticipants = roomParticipants.filter(
      (p) => p.roomId === roomId && !p.leftAt
    );

    // Check if room is full
    if (currentParticipants.length >= room.maxParticipants) {
      return c.json(errorResponse("Room is full"), 400);
    }

    // Check if user already in room
    if (userId) {
      const existing = currentParticipants.find((p) => p.userId === userId);
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

    // Determine if this is the host
    const isHost = room.createdBy === userId || currentParticipants.length === 0;

    // Create participant record
    const participant: RoomParticipant = {
      id: generateId("rp"),
      roomId,
      userId,
      displayName,
      socketId: "", // Set when Socket.IO connects
      isHost,
      joinedAt: new Date(),
    };

    roomParticipants.push(participant);

    return c.json(
      successResponse(
        {
          participantId: participant.id,
          roomId: room.id,
          inviteCode: room.inviteCode,
          isHost,
          totalParticipants: currentParticipants.length + 1,
        },
        "Joined room successfully"
      )
    );
  }
);

/**
 * DELETE /api/rooms/:id
 * 
 * Close/delete a room.
 */
roomRouter.delete("/:id", requireAuth, async (c) => {
  const roomId = c.req.param("id");
  const userId = c.get("userId");

  const room = rooms.find((r) => r.id === roomId);

  if (!room) {
    return c.json(errorResponse("Room not found"), 404);
  }

  if (room.createdBy !== userId) {
    return c.json(errorResponse("Only the room creator can close this room"), 403);
  }

  // Mark room as closed
  room.status = "closed";
  room.closedAt = new Date();

  // Mark all participants as left
  roomParticipants
    .filter((p) => p.roomId === roomId && !p.leftAt)
    .forEach((p) => {
      p.leftAt = new Date();
    });

  return c.json(successResponse(null, "Room closed"));
});

export { roomRouter as roomRoutes };