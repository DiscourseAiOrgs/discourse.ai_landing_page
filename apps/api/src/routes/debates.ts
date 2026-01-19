// ============================================
// apps/api/src/routes/debates.ts
// Debate management routes
// ============================================

import { Hono } from "hono";
import { requireAuth, optionalAuth } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import {
  createDebateSchema,
  sendMessageSchema,
  aiDebateStatementSchema,
  scoreRoundSchema,
} from "../validators";
import { successResponse, errorResponse, generateId, generateInviteCode } from "../utils";
import type {
  CreateDebateInput,
  SendMessageInput,
  AIDebateStatementInput,
} from "../validators";
import type {
  Debate,
  DebateSettings,
  DebateMessage,
  DebateHistoryEntry,
  Room,
} from "../types";
import { config } from "../config";

const debateRouter = new Hono();

// ==================== IN-MEMORY STORES (TEMPORARY) ====================

/**
 * Temporary storage - will be replaced with database in Article 6
 */
const debates: Debate[] = [];
const debateParticipants: Array<{
  id: string;
  debateId: string;
  userId?: string;
  role: string;
  isAi: boolean;
  aiConfig?: { model: string; personality: string; stance: string };
  score: number;
}> = [];
const debateMessages: DebateMessage[] = [];
const rooms: Room[] = [];

// ==================== DEFAULT SETTINGS ====================

const DEFAULT_SETTINGS: DebateSettings = {
  maxRounds: 3,
  timePerTurn: 180,
  rebuttalTime: 60,
  allowVoice: true,
  aiModel: "llama-3.3-70b-versatile",
};

// ==================== AI BACKEND INTEGRATION ====================

/**
 * Call AI debate backend
 * 
 * Based on your debateService.ts sendStatement method.
 */
async function callAIDebate(request: {
  sessionId: string;
  round: number;
  topic: string;
  aiSide: "for" | "against";
  humanStatement: string;
  history: DebateHistoryEntry[];
}) {
  const response = await fetch(`${config.aiBackendUrl}/debate/cortifyWithAi`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`AI API error: ${response.status} - ${errorBody}`);
  }

  return response.json();
}

/**
 * Call AI scoring backend
 */
async function callAIScoreRound(request: {
  sessionId: string;
  round: number;
  topic: string;
  history: DebateHistoryEntry[];
}) {
  const response = await fetch(`${config.aiBackendUrl}/debate/scoreRound`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Score API error: ${response.status} - ${errorBody}`);
  }

  return response.json();
}

// ==================== ROUTES ====================

/**
 * POST /api/debates
 * 
 * Create a new debate.
 */
debateRouter.post(
  "/",
  requireAuth,
  validateBody(createDebateSchema),
  async (c) => {
    const userId = c.get("userId");
    const input = c.get("validatedBody") as CreateDebateInput;

    // Merge settings with defaults
    const settings = { ...DEFAULT_SETTINGS, ...input.settings };

    // Create debate
    const debate: Debate = {
      id: generateId("dbt"),
      topic: input.topic,
      description: input.description,
      format: input.format,
      status: "waiting",
      settings,
      currentRound: 1,
      createdBy: userId,
      createdAt: new Date(),
    };

    debates.push(debate);

    // Add creator as participant
    const participant = {
      id: generateId("prt"),
      debateId: debate.id,
      userId,
      role: "proposer",
      isAi: false,
      score: 0,
    };
    debateParticipants.push(participant);

    // Add AI opponent for AI debates
    if (input.format === "one_v_one_ai") {
      const aiParticipant = {
        id: generateId("prt"),
        debateId: debate.id,
        role: "opposer",
        isAi: true,
        aiConfig: {
          model: settings.aiModel,
          personality: settings.aiPersonality || "balanced",
          stance: "against",
        },
        score: 0,
      };
      debateParticipants.push(aiParticipant);
    }

    // Optionally create room
    let room: Room | null = null;
    if (input.createRoom && input.format !== "one_v_one_ai") {
      room = {
        id: generateId("room"),
        inviteCode: generateInviteCode(),
        debateId: debate.id,
        createdBy: userId,
        status: "active",
        maxParticipants: 2,
        createdAt: new Date(),
      };
      rooms.push(room);
    }

    return c.json(
      successResponse(
        {
          debate,
          participant,
          room: room ? { roomId: room.id, inviteCode: room.inviteCode } : null,
        },
        "Debate created successfully"
      ),
      201
    );
  }
);

/**
 * GET /api/debates
 * 
 * List current user's debates.
 */
debateRouter.get("/", requireAuth, async (c) => {
  const userId = c.get("userId");

  const userDebates = debates
    .filter((d) => d.createdBy === userId)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

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
 * Get debate with participants and messages.
 */
debateRouter.get("/:id", optionalAuth, async (c) => {
  const debateId = c.req.param("id");

  const debate = debates.find((d) => d.id === debateId);

  if (!debate) {
    return c.json(errorResponse("Debate not found"), 404);
  }

  const participants = debateParticipants.filter((p) => p.debateId === debateId);
  const messages = debateMessages.filter((m) => m.debateId === debateId);
  const room = rooms.find((r) => r.debateId === debateId);

  return c.json(
    successResponse({
      ...debate,
      participants,
      messages,
      room: room ? { roomId: room.id, inviteCode: room.inviteCode } : null,
    })
  );
});

/**
 * POST /api/debates/:id/ai-respond
 * 
 * Send statement and get AI response.
 */
debateRouter.post(
  "/:id/ai-respond",
  requireAuth,
  validateBody(aiDebateStatementSchema),
  async (c) => {
    const debateId = c.req.param("id");
    const userId = c.get("userId");
    const { round, humanStatement } = c.get("validatedBody") as AIDebateStatementInput;

    // Find debate
    const debate = debates.find((d) => d.id === debateId);
    if (!debate) {
      return c.json(errorResponse("Debate not found"), 404);
    }

    // Verify this is an AI debate
    if (debate.format !== "one_v_one_ai") {
      return c.json(errorResponse("This endpoint is only for AI debates"), 400);
    }

    // Verify user is participant
    const userParticipant = debateParticipants.find(
      (p) => p.debateId === debateId && p.userId === userId && !p.isAi
    );
    if (!userParticipant) {
      return c.json(errorResponse("You are not a participant"), 403);
    }

    // Build history
    const history = debateMessages
      .filter((m) => m.debateId === debateId)
      .map((msg) => ({
        round: msg.round,
        speaker: (msg.metadata?.speaker || "human") as "human" | "ai",
        statement: msg.content,
        moderator: msg.metadata?.moderator || {
          toxicCount: 0,
          isDisqualified: false,
          argumentScore: 0,
          factScore: 0,
          fallacyScore: 0,
          finalScore: 0,
          feedback: [],
        },
      }));

    const aiSide = debate.settings?.aiSide || "against";

    try {
      // Call AI backend
      const aiResponse = await callAIDebate({
        sessionId: debateId,
        round,
        topic: debate.topic,
        aiSide,
        humanStatement,
        history,
      });

      // Save human message
      const humanMessage: DebateMessage = {
        id: generateId("msg"),
        debateId,
        participantId: userParticipant.id,
        round,
        content: humanStatement,
        metadata: {
          wordCount: humanStatement.split(/\s+/).length,
          duration: 0,
          sentiment: 0,
          keyPoints: [],
          speaker: "human",
          moderator: aiResponse.moderator?.human,
        },
        createdAt: new Date(),
      };
      debateMessages.push(humanMessage);

      // Find AI participant
      const aiParticipant = debateParticipants.find(
        (p) => p.debateId === debateId && p.isAi
      );

      // Save AI message
      const aiMessage: DebateMessage = {
        id: generateId("msg"),
        debateId,
        participantId: aiParticipant?.id || userParticipant.id,
        round,
        content: aiResponse.aiStatement,
        metadata: {
          wordCount: aiResponse.aiStatement.split(/\s+/).length,
          duration: 0,
          sentiment: 0,
          keyPoints: [],
          speaker: "ai",
          moderator: aiResponse.moderator?.ai,
        },
        createdAt: new Date(),
      };
      debateMessages.push(aiMessage);

      // Update debate status
      if (debate.status === "waiting") {
        debate.status = "in_progress";
        debate.startedAt = new Date();
      }
      debate.currentRound = round;

      return c.json(
        successResponse({
          humanMessage,
          aiMessage,
          aiStatement: aiResponse.aiStatement,
          moderator: aiResponse.moderator,
          round,
        })
      );
    } catch (error: any) {
      console.error("AI debate error:", error);
      return c.json(
        errorResponse(`AI service error: ${error.message}`),
        500
      );
    }
  }
);

/**
 * POST /api/debates/:id/score-round
 * 
 * Score a completed round.
 */
debateRouter.post(
  "/:id/score-round",
  requireAuth,
  validateBody(scoreRoundSchema),
  async (c) => {
    const debateId = c.req.param("id");
    const userId = c.get("userId");
    const { round } = c.get("validatedBody") as { round: number };

    const debate = debates.find((d) => d.id === debateId);
    if (!debate) {
      return c.json(errorResponse("Debate not found"), 404);
    }

    if (debate.createdBy !== userId) {
      return c.json(errorResponse("Only debate creator can score rounds"), 403);
    }

    const messages = debateMessages.filter((m) => m.debateId === debateId);
    const history = messages.map((msg) => ({
      round: msg.round,
      speaker: (msg.metadata?.speaker || "human") as "human" | "ai",
      statement: msg.content,
      moderator: msg.metadata?.moderator || {
        toxicCount: 0,
        isDisqualified: false,
        argumentScore: 0,
        factScore: 0,
        fallacyScore: 0,
        finalScore: 0,
        feedback: [],
      },
    }));

    try {
      const scoreResult = await callAIScoreRound({
        sessionId: debateId,
        round,
        topic: debate.topic,
        history,
      });

      return c.json(
        successResponse({
          round,
          roundWinner: scoreResult.round_winner,
          humanTotal: scoreResult.human_total,
          aiTotal: scoreResult.ai_total,
          margin: scoreResult.margin,
          confidence: scoreResult.confidence,
          keyInsights: scoreResult.key_insights,
        })
      );
    } catch (error: any) {
      console.error("Score round error:", error);
      return c.json(
        errorResponse(`Scoring service error: ${error.message}`),
        500
      );
    }
  }
);

/**
 * POST /api/debates/:id/messages
 * 
 * Send a message in the debate (for non-AI debates).
 */
debateRouter.post(
  "/:id/messages",
  requireAuth,
  validateBody(sendMessageSchema),
  async (c) => {
    const debateId = c.req.param("id");
    const userId = c.get("userId");
    const input = c.get("validatedBody") as SendMessageInput;

    const debate = debates.find((d) => d.id === debateId);
    if (!debate) {
      return c.json(errorResponse("Debate not found"), 404);
    }

    const participant = debateParticipants.find(
      (p) => p.debateId === debateId && p.userId === userId
    );
    if (!participant) {
      return c.json(errorResponse("You are not a participant"), 403);
    }

    if (debate.status === "completed" || debate.status === "cancelled") {
      return c.json(errorResponse("Debate is not active"), 400);
    }

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
        sentiment: 0,
        keyPoints: [],
      },
      createdAt: new Date(),
    };

    debateMessages.push(message);

    // Update debate status if first message
    if (debate.status === "waiting") {
      debate.status = "in_progress";
      debate.startedAt = new Date();
    }

    return c.json(successResponse({ message }, "Message sent"));
  }
);

/**
 * POST /api/debates/:id/end
 * 
 * End the debate.
 */
debateRouter.post("/:id/end", requireAuth, async (c) => {
  const debateId = c.req.param("id");
  const userId = c.get("userId");

  const debate = debates.find((d) => d.id === debateId);
  if (!debate) {
    return c.json(errorResponse("Debate not found"), 404);
  }

  if (debate.createdBy !== userId) {
    return c.json(errorResponse("Only creator can end debate"), 403);
  }

  debate.status = "completed";
  debate.endedAt = new Date();

  // Close associated room
  const room = rooms.find((r) => r.debateId === debateId);
  if (room) {
    room.status = "closed";
    room.closedAt = new Date();
  }

  return c.json(successResponse({ debate }, "Debate ended"));
});

/**
 * DELETE /api/debates/:id
 * 
 * Delete a debate.
 */
debateRouter.delete("/:id", requireAuth, async (c) => {
  const debateId = c.req.param("id");
  const userId = c.get("userId");

  const debateIndex = debates.findIndex((d) => d.id === debateId);
  if (debateIndex === -1) {
    return c.json(errorResponse("Debate not found"), 404);
  }

  if (debates[debateIndex].createdBy !== userId) {
    return c.json(errorResponse("Only creator can delete"), 403);
  }

  // Remove debate and related data
  debates.splice(debateIndex, 1);
  
  // Remove participants
  const pIndexes = debateParticipants
    .map((p, i) => (p.debateId === debateId ? i : -1))
    .filter((i) => i !== -1)
    .reverse();
  pIndexes.forEach((i) => debateParticipants.splice(i, 1));
  
  // Remove messages
  const mIndexes = debateMessages
    .map((m, i) => (m.debateId === debateId ? i : -1))
    .filter((i) => i !== -1)
    .reverse();
  mIndexes.forEach((i) => debateMessages.splice(i, 1));

  return c.json(successResponse(null, "Debate deleted"));
});

export { debateRouter as debateRoutes };