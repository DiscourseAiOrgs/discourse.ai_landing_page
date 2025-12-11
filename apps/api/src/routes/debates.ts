// ============================================
// apps/api/src/routes/debates.ts
// Debate routes with AI integration
// Based on your debateService.ts patterns
// ============================================

import { Hono } from "hono";
import { eq, desc, and } from "drizzle-orm";
import { db, debates, debateParticipants, debateMessages, rooms } from "@discourse/db";
import { requireAuth, optionalAuth } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import {
  createDebateSchema,
  sendMessageSchema,
  aiDebateSetupSchema,
  aiDebateStatementSchema,
  scoreRoundSchema,
} from "../validators";
import { successResponse, errorResponse, generateId } from "../utils";
import { config } from "../config";
import type { DebateSettings, DebateHistoryEntry, ModeratorFeedback } from "../types";

const debatesRouter = new Hono();

// ==================== CONSTANTS ====================

/**
 * Default debate settings
 * Applied when user doesn't specify all settings
 */
const DEFAULT_SETTINGS: DebateSettings = {
  maxRounds: 3,
  timePerTurn: 180,
  rebuttalTime: 60,
  allowVoice: true,
  aiModel: "llama-3.3-70b-versatile",
};

/**
 * AI backend URL
 * From your debateService.ts: process.env.NEXT_PUBLIC_ANALYSIS_API_URL
 */
const AI_BACKEND_URL = config.aiBackendUrl || "http://discourse-agents.5.161.237.174.sslip.io";

// ==================== AI HELPER FUNCTIONS ====================

/**
 * Call the AI debate backend
 * Based on your debateService.ts sendStatement method
 */
async function callAIDebate(request: {
  sessionId: string;
  round: number;
  topic: string;
  aiSide: "for" | "against";
  humanStatement: string;
  history: DebateHistoryEntry[];
}) {
  const response = await fetch(`${AI_BACKEND_URL}/debate/discourseWithAi`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`AI API error: ${response.status} - ${errorBody}`);
  }

  return response.json();
}

/**
 * Call the AI scoring backend
 * Based on your debateService.ts scoreRound method
 */
async function callAIScoreRound(request: {
  sessionId: string;
  round: number;
  topic: string;
  history: DebateHistoryEntry[];
}) {
  const response = await fetch(`${AI_BACKEND_URL}/debate/scoreRound`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
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
 * Create a new debate
 * 
 * Can optionally create an associated room for P2P
 */
debatesRouter.post(
  "/",
  requireAuth,
  validateBody(createDebateSchema),
  async (c) => {
    const userId = c.get("userId");
    const input = c.get("validatedBody") as {
      topic: string;
      description?: string;
      format: "one_v_one_ai" | "one_v_one_human" | "multi_ai_mod" | "free_form";
      settings?: Partial<DebateSettings>;
      createRoom?: boolean;
    };

    // Merge settings with defaults
    const settings = { ...DEFAULT_SETTINGS, ...input.settings };

    // Create debate
    const [debate] = await db
      .insert(debates)
      .values({
        topic: input.topic,
        description: input.description,
        format: input.format,
        settings,
        createdBy: userId,
        status: "waiting",
      })
      .returning();

    // Add creator as participant
    const [participant] = await db
      .insert(debateParticipants)
      .values({
        debateId: debate.id,
        userId,
        role: "proposer",
        isAi: false,
      })
      .returning();

    // Add AI opponent for AI debates
    if (input.format === "one_v_one_ai") {
      await db.insert(debateParticipants).values({
        debateId: debate.id,
        role: "opposer",
        isAi: true,
        aiConfig: {
          model: settings.aiModel,
          personality: settings.aiPersonality || "balanced",
          stance: "against",
        },
      });
    }

    // Optionally create associated room
    let room = null;
    if (input.createRoom && input.format !== "one_v_one_ai") {
      // Generate invite code
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      let inviteCode = "";
      for (let i = 0; i < 8; i++) {
        inviteCode += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      [room] = await db
        .insert(rooms)
        .values({
          inviteCode,
          debateId: debate.id,
          createdBy: userId,
          maxParticipants: 2,
          status: "active",
        })
        .returning();
    }

    return c.json(
      successResponse(
        {
          debate,
          participant,
          room: room
            ? {
                roomId: room.id,
                inviteCode: room.inviteCode,
              }
            : null,
        },
        "Debate created successfully"
      ),
      201
    );
  }
);

/**
 * POST /api/debates/:id/ai-respond
 * Send a statement and get AI response
 * 
 * This integrates with your debateService.ts
 */
debatesRouter.post(
  "/:id/ai-respond",
  requireAuth,
  validateBody(aiDebateStatementSchema),
  async (c) => {
    const debateId = c.req.param("id");
    const userId = c.get("userId");
    const { round, humanStatement } = c.get("validatedBody") as {
      round: number;
      humanStatement: string;
    };

    // Get debate
    const debate = await db.query.debates.findFirst({
      where: eq(debates.id, debateId),
      with: {
        participants: true,
      },
    });

    if (!debate) {
      return c.json(errorResponse("Debate not found"), 404);
    }

    // Verify this is an AI debate
    if (debate.format !== "one_v_one_ai") {
      return c.json(errorResponse("This endpoint is only for AI debates"), 400);
    }

    // Verify user is participant
    const userParticipant = debate.participants?.find(
      (p) => p.userId === userId && !p.isAi
    );
    if (!userParticipant) {
      return c.json(errorResponse("You are not a participant"), 403);
    }

    // Get debate history from messages
    const existingMessages = await db.query.debateMessages.findMany({
      where: eq(debateMessages.debateId, debateId),
      orderBy: [debateMessages.createdAt],
    });

    // Build history in the format your AI backend expects
    const history: DebateHistoryEntry[] = existingMessages.map((msg) => ({
      round: msg.round,
      speaker: msg.metadata?.speaker || "human",
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

    // Determine AI side based on debate settings
    const aiSide = debate.settings?.aiPersonality === "for" ? "for" : "against";

    try {
      // Call AI backend
      const aiResponse = await callAIDebate({
        sessionId: debateId,
        round,
        topic: debate.topic,
        aiSide: aiSide as "for" | "against",
        humanStatement,
        history,
      });

      // Save human message
      const [humanMessage] = await db
        .insert(debateMessages)
        .values({
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
        })
        .returning();

      // Find AI participant
      const aiParticipant = debate.participants?.find((p) => p.isAi);

      // Save AI message
      const [aiMessage] = await db
        .insert(debateMessages)
        .values({
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
        })
        .returning();

      // Update debate status
      if (debate.status === "waiting") {
        await db
          .update(debates)
          .set({
            status: "in_progress",
            startedAt: new Date(),
            currentRound: round,
          })
          .where(eq(debates.id, debateId));
      } else {
        await db
          .update(debates)
          .set({ currentRound: round })
          .where(eq(debates.id, debateId));
      }

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
 * Score a completed round
 * 
 * Based on your debateService.ts scoreRound
 */
debatesRouter.post(
  "/:id/score-round",
  requireAuth,
  validateBody(scoreRoundSchema),
  async (c) => {
    const debateId = c.req.param("id");
    const userId = c.get("userId");
    const { round } = c.get("validatedBody") as { round: number };

    // Get debate with messages
    const debate = await db.query.debates.findFirst({
      where: eq(debates.id, debateId),
    });

    if (!debate) {
      return c.json(errorResponse("Debate not found"), 404);
    }

    if (debate.createdBy !== userId) {
      return c.json(errorResponse("Only debate creator can score rounds"), 403);
    }

    // Get messages for building history
    const messages = await db.query.debateMessages.findMany({
      where: eq(debateMessages.debateId, debateId),
      orderBy: [debateMessages.createdAt],
    });

    const history = messages.map((msg) => ({
      round: msg.round,
      speaker: msg.metadata?.speaker || "human",
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
 * GET /api/debates
 * List user's debates
 */
debatesRouter.get("/", requireAuth, async (c) => {
  const userId = c.get("userId");

  const userDebates = await db.query.debates.findMany({
    where: eq(debates.createdBy, userId),
    orderBy: [desc(debates.createdAt)],
    with: {
      participants: {
        columns: {
          id: true,
          role: true,
          isAi: true,
          score: true,
        },
      },
    },
  });

  return c.json(
    successResponse({
      debates: userDebates,
      total: userDebates.length,
    })
  );
});

/**
 * GET /api/debates/:id
 * Get debate with all details
 */
debatesRouter.get("/:id", optionalAuth, async (c) => {
  const debateId = c.req.param("id");

  const debate = await db.query.debates.findFirst({
    where: eq(debates.id, debateId),
    with: {
      participants: {
        with: {
          user: {
            columns: {
              id: true,
              username: true,
              avatarUrl: true,
            },
          },
        },
      },
      messages: {
        orderBy: [debateMessages.createdAt],
      },
      room: true,
    },
  });

  if (!debate) {
    return c.json(errorResponse("Debate not found"), 404);
  }

  return c.json(successResponse(debate));
});

/**
 * POST /api/debates/:id/messages
 * Send a message (for non-AI debates)
 */
debatesRouter.post(
  "/:id/messages",
  requireAuth,
  validateBody(sendMessageSchema),
  async (c) => {
    const debateId = c.req.param("id");
    const userId = c.get("userId");
    const input = c.get("validatedBody") as {
      content: string;
      audioUrl?: string;
    };

    const debate = await db.query.debates.findFirst({
      where: eq(debates.id, debateId),
      with: {
        participants: true,
      },
    });

    if (!debate) {
      return c.json(errorResponse("Debate not found"), 404);
    }

    const participant = debate.participants?.find((p) => p.userId === userId);
    if (!participant) {
      return c.json(errorResponse("You are not a participant"), 403);
    }

    if (debate.status === "completed" || debate.status === "cancelled") {
      return c.json(errorResponse("Debate is not active"), 400);
    }

    const [message] = await db
      .insert(debateMessages)
      .values({
        debateId,
        participantId: participant.id,
        round: debate.currentRound || 1,
        content: input.content,
        audioUrl: input.audioUrl,
        metadata: {
          wordCount: input.content.split(/\s+/).length,
          duration: 0,
          sentiment: 0,
          keyPoints: [],
        },
      })
      .returning();

    // Update debate status if first message
    if (debate.status === "waiting") {
      await db
        .update(debates)
        .set({
          status: "in_progress",
          startedAt: new Date(),
        })
        .where(eq(debates.id, debateId));
    }

    return c.json(successResponse({ message }, "Message sent"));
  }
);

/**
 * POST /api/debates/:id/end
 * End the debate
 */
debatesRouter.post("/:id/end", requireAuth, async (c) => {
  const debateId = c.req.param("id");
  const userId = c.get("userId");

  const debate = await db.query.debates.findFirst({
    where: eq(debates.id, debateId),
  });

  if (!debate) {
    return c.json(errorResponse("Debate not found"), 404);
  }

  if (debate.createdBy !== userId) {
    return c.json(errorResponse("Only creator can end debate"), 403);
  }

  const [updated] = await db
    .update(debates)
    .set({
      status: "completed",
      endedAt: new Date(),
    })
    .where(eq(debates.id, debateId))
    .returning();

  // Also close associated room if exists
  if (debate.id) {
    await db
      .update(rooms)
      .set({
        status: "closed",
        closedAt: new Date(),
      })
      .where(eq(rooms.debateId, debateId));
  }

  return c.json(successResponse({ debate: updated }, "Debate ended"));
});

/**
 * DELETE /api/debates/:id
 * Delete a debate
 */
debatesRouter.delete("/:id", requireAuth, async (c) => {
  const debateId = c.req.param("id");
  const userId = c.get("userId");

  const debate = await db.query.debates.findFirst({
    where: eq(debates.id, debateId),
  });

  if (!debate) {
    return c.json(errorResponse("Debate not found"), 404);
  }

  if (debate.createdBy !== userId) {
    return c.json(errorResponse("Only creator can delete"), 403);
  }

  await db.delete(debates).where(eq(debates.id, debateId));

  return c.json(successResponse(null, "Debate deleted"));
});

export { debatesRouter as debateRoutes };