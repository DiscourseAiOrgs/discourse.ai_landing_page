// ============================================
// ADD TO: apps/api/src/validators/index.ts
// Room and P2P validation schemas
// ============================================

// ... keep all your existing schemas above ...

// ==================== ROOM SCHEMAS ====================

/**
 * Create room validation
 * Validates the request to create a new P2P room
 */
export const createRoomSchema = z.object({
  /** Optional debate to link with this room */
  debateId: z.string().uuid().optional(),
  
  /** Max participants allowed (1v1 = 2, group = more) */
  maxParticipants: z.number().min(2).max(10).default(2),
});

/**
 * Join room validation
 * Validates the request when a user joins a room
 */
export const joinRoomSchema = z.object({
  /** Display name shown to other participants */
  displayName: z
    .string()
    .min(1, "Display name is required")
    .max(50, "Display name too long"),
});

/**
 * Room ID parameter validation
 * Used for URL parameters like /rooms/:id
 */
export const roomIdSchema = z.object({
  id: z.string().uuid("Invalid room ID"),
});

/**
 * Invite code validation
 * For joining via short invite codes like "ABC123"
 */
export const inviteCodeSchema = z.object({
  inviteCode: z
    .string()
    .length(8, "Invite code must be 8 characters")
    .regex(/^[A-Z0-9]+$/, "Invalid invite code format"),
});

// ==================== AI DEBATE SCHEMAS ====================

/**
 * AI debate setup schema
 * Based on your DebateSetupModal.tsx DebateConfig
 */
export const aiDebateSetupSchema = z.object({
  topic: z
    .string()
    .min(10, "Topic must be at least 10 characters")
    .max(500, "Topic must be at most 500 characters"),
  
  aiSide: z.enum(["for", "against"]),
  
  sessionTime: z
    .number()
    .min(5, "Minimum 5 minutes")
    .max(120, "Maximum 2 hours")
    .default(30),
});

/**
 * Send statement to AI schema
 * For the debate back-and-forth with AI
 */
export const aiDebateStatementSchema = z.object({
  round: z.number().min(1),
  humanStatement: z
    .string()
    .min(1, "Statement cannot be empty")
    .max(10000, "Statement too long"),
});

/**
 * Score round schema
 */
export const scoreRoundSchema = z.object({
  round: z.number().min(1),
});

// ==================== TRANSCRIPTION SCHEMAS ====================

/**
 * Save transcription schema
 * For persisting transcription data
 */
export const saveTranscriptionSchema = z.object({
  roomId: z.string().uuid(),
  content: z.string().min(1),
  confidence: z.number().min(0).max(1),
  isFinal: z.boolean().default(true),
  speaker: z.number().optional(),
});

// ==================== INFERRED TYPES ====================

export type CreateRoomInput = z.infer<typeof createRoomSchema>;
export type JoinRoomInput = z.infer<typeof joinRoomSchema>;
export type AIDebateSetupInput = z.infer<typeof aiDebateSetupSchema>;
export type AIDebateStatementInput = z.infer<typeof aiDebateStatementSchema>;
export type SaveTranscriptionInput = z.infer<typeof saveTranscriptionSchema>;