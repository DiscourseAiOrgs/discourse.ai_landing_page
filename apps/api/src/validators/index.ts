// ============================================
// apps/api/src/validators/index.ts
// Zod validation schemas for API requests
// ============================================

import { z } from "zod";

// ==================== AUTH SCHEMAS ====================

/**
 * Signup validation schema
 * 
 * z.object({...}) - Creates a schema for an object
 * z.string() - Value must be a string
 * .email() - String must be valid email format
 * .min(3) - String must be at least 3 characters
 * .max(30) - String must be at most 30 characters
 * .regex() - String must match the pattern
 */
export const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters")
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Username can only contain letters, numbers, and underscores"
    ),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password must be at most 100 characters"),
});

/**
 * Login validation schema
 * Simpler than signup - we just need email and password
 */
export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

// ==================== USER SCHEMAS ====================

/**
 * Profile update schema
 * 
 * .optional() - Field doesn't have to be present
 * This allows partial updates (PATCH behavior)
 */
export const updateProfileSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_]+$/)
    .optional(),  // Not required - can update just bio without username
  bio: z.string().max(500, "Bio must be at most 500 characters").optional(),
  avatarUrl: z.string().url("Invalid URL").optional(),
  preferences: z
    .object({
      voiceEnabled: z.boolean().optional(),
      preferredLanguage: z.string().optional(),
      theme: z.enum(["light", "dark", "system"]).optional(),
    })
    .optional(),
});

// ==================== DEBATE SCHEMAS ====================

/**
 * Debate format enum
 * 
 * z.enum([...]) - Value must be one of the specified strings
 * This replaces TypeScript's union type for validation
 */
export const debateFormatSchema = z.enum([
  "one_v_one_ai",
  "one_v_one_human",
  "multi_ai_mod",
  "free_form",
]);

/**
 * Debate settings schema
 * 
 * .default() - If not provided, use this value
 * This means the field is optional but will always have a value after validation
 */
export const debateSettingsSchema = z.object({
  maxRounds: z.number().min(1).max(10).default(3),
  timePerTurn: z.number().min(30).max(600).default(180),  // 30s to 10min
  rebuttalTime: z.number().min(15).max(120).default(60),
  allowVoice: z.boolean().default(true),
  aiModel: z.string().default("llama-3.3-70b-versatile"),
  aiPersonality: z
    .enum(["balanced", "aggressive", "socratic", "devil_advocate"])
    .optional(),
});

/**
 * Create debate schema
 * 
 * Combines multiple validations:
 * - Topic must be 10-500 characters
 * - Description is optional, max 2000 chars
 * - Format must be one of our defined types
 * - Settings uses another schema (composition!)
 */
export const createDebateSchema = z.object({
  topic: z
    .string()
    .min(10, "Topic must be at least 10 characters")
    .max(500, "Topic must be at most 500 characters"),
  description: z.string().max(2000).optional(),
  format: debateFormatSchema,
  settings: debateSettingsSchema.optional(),
});

/**
 * Send message schema
 */
export const sendMessageSchema = z.object({
  content: z
    .string()
    .min(1, "Message cannot be empty")
    .max(10000, "Message too long"),
  audioUrl: z.string().url().optional(),
  transcription: z.string().optional(),
});

// ==================== WAITLIST SCHEMAS ====================

export const joinWaitlistSchema = z.object({
  email: z.string().email("Invalid email address"),
  source: z.string().max(100).optional(),
});

// ==================== HELPER TYPES ====================

/**
 * z.infer<typeof schema> extracts the TypeScript type from a Zod schema
 * 
 * This is powerful because:
 * 1. You define validation rules once
 * 2. TypeScript types are automatically generated
 * 3. Types and validation are always in sync
 */
export type SignupInput = z.infer<typeof signupSchema>;
// SignupInput is now: { email: string; username: string; password: string }

export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type CreateDebateInput = z.infer<typeof createDebateSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type JoinWaitlistInput = z.infer<typeof joinWaitlistSchema>;