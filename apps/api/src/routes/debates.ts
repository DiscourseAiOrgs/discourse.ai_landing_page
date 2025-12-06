// ============================================
// apps/api/src/routes/debates.ts
// Debate routes
// ============================================

import { Hono } from "hono";
import { requireAuth } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { createDebateSchema, sendMessageSchema } from "../validators";
import { successResponse, errorResponse, generateId } from "../utils";
import type { 
  Debate, 
  DebateParticipant, 
  DebateMessage,
  DebateSettings 
} from "../types";

const debates = new Hono();

// ==================== TEMPORARY IN-MEMORY STORAGE ====================

// Store all debates
const debatesStore: Debate[] = [];

// Store participants (who's in each debate)
const participantsStore: DebateParticipant[] = [];

// Store messages (what's been said in each debate)
const messagesStore: DebateMessage[] = [];

/**
 * Default debate settings
 * Used when user doesn't specify all settings
 */
const DEFAULT_SETTINGS: DebateSettings = {
  maxRounds: 3,
  timePerTurn: 180,      // 3 minutes per turn
  rebuttalTime: 60,      // 1 minute for rebuttals
  allowVoice: true,
  aiModel: "llama-3.3-70b-versatile",
};

// ==================== ROUTES ====================

/**
 * POST /api/debates
 * 
 * Create a new debate
 * 
 * This is the most complex endpoint - it:
 * 1. Creates the debate record
 * 2. Adds the creator as first participant
 * 3. If AI format, adds AI as opponent
 */
debates.post("/", requireAuth, validateBody(createDebateSchema), async (c) => {
  // Get current user's ID
  const userId = c.get("userId");
  
  // Get validated input
  const input = c.get("validatedBody") as {
    topic: string;
    description?: string;
    format: Debate["format"];
    settings?: Partial<DebateSettings>;
  };

  // Create debate object
  // Spread operator (...) merges default settings with user's settings
  const debate: Debate = {
    id: generateId("dbt"),
    topic: input.topic,
    description: input.description,
    format: input.format,
    status: "waiting",                              // Hasn't started yet
    settings: { ...DEFAULT_SETTINGS, ...input.settings },  // Merge defaults with user settings
    currentRound: 1,
    createdBy: userId,
    createdAt: new Date(),
  };

  // Save debate
  debatesStore.push(debate);

  // Add creator as first participant (the "proposer" - argues FOR)
  const participant: DebateParticipant = {
    id: generateId("prt"),
    debateId: debate.id,
    userId,
    role: "proposer",
    isAi: false,
    score: 0,
    joinedAt: new Date(),
  };

  participantsStore.push(participant);

  // If this is an AI debate, add AI opponent automatically
  if (input.format === "one_v_one_ai") {
    const aiParticipant: DebateParticipant = {
      id: generateId("prt"),
      debateId: debate.id,
      // No userId - AI isn't a real user
      role: "opposer",                // Argues AGAINST
      isAi: true,
      aiConfig: {
        model: debate.settings.aiModel,
        personality: debate.settings.aiPersonality || "balanced",
        stance: "against",
      },
      score: 0,
      joinedAt: new Date(),
    };
    participantsStore.push(aiParticipant);
  }

  // Return 201 Created with debate info
  return c.json(
    successResponse({ debate, participant }, "Debate created successfully"),
    201
  );
});

/**
 * GET /api/debates
 * 
 * List all debates created by the current user
 * 
 * Protected route - only shows YOUR debates
 */
debates.get("/", requireAuth, async (c) => {
  const userId = c.get("userId");

  // Filter debates to only those created by this user
  const userDebates = debatesStore.filter((d) => d.createdBy === userId);

  return c.json(
    successResponse({
      debates: userDebates,
      total: userDebates.length,
    })
  );
});

/**
 * GET /api/debates/:id
 * 
 * Get detailed information about a specific debate
 * 
 * This returns:
 * - The debate itself
 * - All participants
 * - All messages
 * 
 * Public endpoint - anyone can view a debate
 */
debates.get("/:id", async (c) => {
  const debateId = c.req.param("id");

  // Find debate
  const debate = debatesStore.find((d) => d.id === debateId);
  if (!debate) {
    return c.json(errorResponse("Debate not found"), 404);
  }

  // Get participants for this debate
  const participants = participantsStore.filter((p) => p.debateId === debateId);
  
  // Get messages for this debate
  const messages = messagesStore.filter((m) => m.debateId === debateId);

  return c.json(
    successResponse({
      debate,
      participants,
      messages,
    })
  );
});

/**
 * POST /api/debates/:id/messages
 * 
 * Send a message (argument) in a debate
 * 
 * This is the core debate interaction:
 * 1. Validate user is a participant
 * 2. Check debate is active
 * 3. Save the message
 * 4. (In Article 8) Generate AI response if needed
 */
debates.post(
  "/:id/messages",
  requireAuth,
  validateBody(sendMessageSchema),
  async (c) => {
    const debateId = c.req.param("id");
    const userId = c.get("userId");
    const input = c.get("validatedBody") as {
      content: string;
      audioUrl?: string;
      transcription?: string;
    };

    // Find debate
    const debate = debatesStore.find((d) => d.id === debateId);
    if (!debate) {
      return c.json(errorResponse("Debate not found"), 404);
    }

    // Check user is a participant
    const participant = participantsStore.find(
      (p) => p.debateId === debateId && p.userId === userId
    );
    if (!participant) {
      return c.json(errorResponse("You are not a participant in this debate"), 403);
    }

    // Check debate is active
    if (debate.status !== "waiting" && debate.status !== "in_progress") {
      return c.json(errorResponse("Debate is not active"), 400);
    }

    // Create message object
    const message: DebateMessage = {
      id: generateId("msg"),
      debateId,
      participantId: participant.id,
      round: debate.currentRound,
      content: input.content,
      audioUrl: input.audioUrl,
      transcription: input.transcription,
      metadata: {
        wordCount: input.content.split(/\s+/).length,
        duration: 0,
        sentiment: 0,      // Will be calculated later
        keyPoints: [],     // Will be extracted later
      },
      createdAt: new Date(),
    };

    // Save message
    messagesStore.push(message);

    // Start debate if this is first message
    if (debate.status === "waiting") {
      debate.status = "in_progress";
      debate.startedAt = new Date();
    }

    // TODO: In Article 8, we'll generate AI response here
    // if (debate.format === "one_v_one_ai") {
    //   const aiResponse = await generateAIResponse(debate, message);
    //   messagesStore.push(aiResponse);
    // }

    return c.json(successResponse({ message }, "Message sent"));
  }
);

/**
 * POST /api/debates/:id/end
 * 
 * End a debate and mark it as completed
 * 
 * Only the creator can end a debate
 * In Article 8, this will also generate AI analysis
 */
debates.post("/:id/end", requireAuth, async (c) => {
  const debateId = c.req.param("id");
  const userId = c.get("userId");

  // Find debate
  const debate = debatesStore.find((d) => d.id === debateId);
  if (!debate) {
    return c.json(errorResponse("Debate not found"), 404);
  }

  // Only creator can end debate
  if (debate.createdBy !== userId) {
    return c.json(errorResponse("Only the creator can end this debate"), 403);
  }

  // Update status
  debate.status = "completed";
  debate.endedAt = new Date();

  // TODO: In Article 8, we'll generate AI analysis here
  // const analysis = await generateDebateAnalysis(debate);

  return c.json(successResponse({ debate }, "Debate ended"));
});

/**
 * DELETE /api/debates/:id
 * 
 * Delete a debate
 * 
 * Only the creator can delete
 * This removes the debate but messages remain orphaned
 * (In real app with database, we'd use CASCADE delete)
 */
debates.delete("/:id", requireAuth, async (c) => {
  const debateId = c.req.param("id");
  const userId = c.get("userId");

  // Find debate index
  const debateIndex = debatesStore.findIndex((d) => d.id === debateId);
  if (debateIndex === -1) {
    return c.json(errorResponse("Debate not found"), 404);
  }

  // Check ownership
  if (debatesStore[debateIndex].createdBy !== userId) {
    return c.json(errorResponse("Only the creator can delete this debate"), 403);
  }

  // Remove from array
  // splice(index, count) removes `count` items starting at `index`
  debatesStore.splice(debateIndex, 1);

  return c.json(successResponse(null, "Debate deleted"));
});

export { debates as debateRoutes };
