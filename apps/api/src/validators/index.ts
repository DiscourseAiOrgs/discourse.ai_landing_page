// ============================================
// apps/api/src/validators/index.ts
// Request validation schemas using Zod
// ============================================

import { z } from "zod";

/**
 * What is Zod?
 * 
 * Zod is a TypeScript-first validation library.
 * You define a schema, and Zod:
 * 1. Validates data matches the schema
 * 2. Transforms data (coercion, defaults)
 * 3. Infers TypeScript types automatically
 * 
 * Key methods:
 * - z.string()        - Must be a string
 * - z.number()        - Must be a number
 * - z.boolean()       - Must be true/false
 * - z.object({...})   - Must be an object with specific shape
 * - z.array(z.thing)  - Must be an array of things
 * - z.enum([...])     - Must be one of specific values
 * - .optional()       - Value can be undefined
 * - .default(val)     - Use this value if undefined
 * - .min(n)           - Minimum length/value
 * - .max(n)           - Maximum length/value
 * - .email()          - Must be valid email format
 * - .regex(pattern)   - Must match pattern
 */

// ==================== AUTH SCHEMAS ====================

/**
 * Signup validation schema
 * 
 * Validates data when a user registers.
 * Each field has specific requirements.
 */
export const signupSchema = z.object({
  /**
   * Email validation
   * 
   * z.string() - must be a string
   * .email() - must be valid email format (has @ and domain)
   * .toLowerCase() - transform to lowercase (bob@Email.COM → bob@email.com)
   * .trim() - remove leading/trailing whitespace
   */
  email: z
    .string({
      required_error: "Email is required",
      invalid_type_error: "Email must be a string",
    })
    .email("Please enter a valid email address")
    .toLowerCase()
    .trim(),

  /**
   * Username validation
   * 
   * .min(3) - at least 3 characters
   * .max(30) - at most 30 characters
   * .regex() - only letters, numbers, underscores
   * .toLowerCase() - usernames are case-insensitive
   */
  username: z
    .string({ required_error: "Username is required" })
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username cannot exceed 30 characters")
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Username can only contain letters, numbers, and underscores"
    )
    .toLowerCase()
    .trim(),

  /**
   * Password validation
   * 
   * .min(8) - at least 8 characters for security
   * .max(100) - prevent extremely long passwords (DoS protection)
   */
  password: z
    .string({ required_error: "Password is required" })
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password cannot exceed 100 characters"),
});

/**
 * Login validation schema
 * 
 * Simpler than signup - just need email and password.
 */
export const loginSchema = z.object({
  email: z
    .string({ required_error: "Email is required" })
    .email("Invalid email address")
    .toLowerCase()
    .trim(),

  password: z
    .string({ required_error: "Password is required" })
    .min(1, "Password is required"),
});

// ==================== USER SCHEMAS ====================

/**
 * Update profile schema
 * 
 * All fields optional - user can update any subset.
 * z.object({...}).partial() would also work, but we want
 * different validation rules for updates.
 */
export const updateProfileSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username cannot exceed 30 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, underscores")
    .toLowerCase()
    .trim()
    .optional(),

  bio: z
    .string()
    .max(500, "Bio cannot exceed 500 characters")
    .optional(),

  avatarUrl: z
    .string()
    .url("Avatar must be a valid URL")
    .optional(),
});

// ==================== DEBATE SCHEMAS ====================

/**
 * Create debate schema
 * 
 * Validates debate creation requests.
 * Based on your DebateSetupModal.tsx configuration.
 */
export const createDebateSchema = z.object({
  /**
   * Topic - the debate subject
   */
  topic: z
    .string({ required_error: "Topic is required" })
    .min(10, "Topic must be at least 10 characters")
    .max(500, "Topic cannot exceed 500 characters")
    .trim(),

  /**
   * Description - optional details about the debate
   */
  description: z
    .string()
    .max(2000, "Description cannot exceed 2000 characters")
    .optional(),

  /**
   * Format - debate type
   * 
   * z.enum() restricts to specific values.
   * Any other value throws an error.
   */
  format: z.enum(
    ["one_v_one_ai", "one_v_one_human", "multi_ai_mod", "free_form"],
    {
      required_error: "Format is required",
      invalid_type_error: "Invalid debate format",
    }
  ),

  /**
   * Settings - optional debate configuration
   * 
   * Nested object with defaults for each field.
   */
  settings: z
    .object({
      maxRounds: z.number().min(1).max(10).default(3),
      timePerTurn: z.number().min(30).max(600).default(180),
      rebuttalTime: z.number().min(15).max(300).default(60),
      allowVoice: z.boolean().default(true),
      aiModel: z.string().default("llama-3.3-70b-versatile"),
      aiPersonality: z.string().optional(),
      aiSide: z.enum(["for", "against"]).optional(),
      sessionTime: z.number().min(5).max(120).optional(),
    })
    .optional(),

  /**
   * Create room - whether to create a P2P room
   */
  createRoom: z.boolean().default(false),
});

/**
 * Send message schema
 * 
 * For posting arguments/statements in a debate.
 */
export const sendMessageSchema = z.object({
  content: z
    .string({ required_error: "Content is required" })
    .min(1, "Message cannot be empty")
    .max(10000, "Message too long"),

  audioUrl: z.string().url("Invalid audio URL").optional(),

  transcription: z.string().optional(),
});

/**
 * AI debate statement schema
 * 
 * For human's turn in AI debates.
 */
export const aiDebateStatementSchema = z.object({
  round: z.number().min(1, "Round must be at least 1"),
  
  humanStatement: z
    .string({ required_error: "Statement is required" })
    .min(1, "Statement cannot be empty")
    .max(10000, "Statement too long"),
});

/**
 * Score round schema
 */
export const scoreRoundSchema = z.object({
  round: z.number().min(1),
});

// ==================== ROOM SCHEMAS ====================

/**
 * Create room schema
 */
export const createRoomSchema = z.object({
  debateId: z.string().uuid("Invalid debate ID").optional(),
  maxParticipants: z.number().min(2).max(10).default(2),
});

/**
 * Join room schema
 */
export const joinRoomSchema = z.object({
  displayName: z
    .string({ required_error: "Display name is required" })
    .min(1, "Display name is required")
    .max(50, "Display name too long")
    .trim(),
});

// ==================== WAITLIST SCHEMAS ====================

/**
 * Join waitlist schema
 */
export const joinWaitlistSchema = z.object({
  email: z
    .string({ required_error: "Email is required" })
    .email("Invalid email address")
    .toLowerCase()
    .trim(),

  source: z.string().max(100).optional(),
});

// ==================== INFERRED TYPES ====================
/**
 * z.infer extracts TypeScript types from schemas
 * 
 * This means you don't have to define types separately.
 * The schema IS the source of truth for both:
 * - Runtime validation
 * - TypeScript types
 */

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type CreateDebateInput = z.infer<typeof createDebateSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type AIDebateStatementInput = z.infer<typeof aiDebateStatementSchema>;
export type CreateRoomInput = z.infer<typeof createRoomSchema>;
export type JoinRoomInput = z.infer<typeof joinRoomSchema>;
export type JoinWaitlistInput = z.infer<typeof joinWaitlistSchema>;