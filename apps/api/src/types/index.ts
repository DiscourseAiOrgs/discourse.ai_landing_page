// ============================================
// apps/api/src/types/index.ts
// Type definitions for discourse.ai API
// ============================================

// ==================== ID TYPE ALIASES ====================
/**
 * Type aliases for different ID types
 * 
 * Using specific names instead of just 'string' makes code clearer.
 * When you see UserId, you know it's a user identifier, not just any string.
 */
export type UserId = string;
export type DebateId = string;
export type MessageId = string;
export type RoomId = string;
export type ParticipantId = string;

// ==================== ENUM-LIKE UNION TYPES ====================
/**
 * Debate format options
 * 
 * Union types act like enums but are simpler in TypeScript.
 * These match the formats in your desktop app's DebateSetupModal.
 */
export type DebateFormat =
  | "one_v_one_ai"      // User vs AI opponent
  | "one_v_one_human"   // User vs another user (P2P)
  | "multi_ai_mod"      // Multiple users, AI moderates
  | "free_form";        // Unstructured practice

/**
 * Debate lifecycle states
 */
export type DebateStatus =
  | "waiting"       // Created, waiting to start
  | "in_progress"   // Active debate
  | "paused"        // Temporarily paused
  | "completed"     // Finished normally
  | "cancelled";    // Ended early

/**
 * Participant roles in a debate
 */
export type ParticipantRole =
  | "proposer"    // Argues FOR the motion
  | "opposer"     // Argues AGAINST
  | "moderator"   // AI or human moderator
  | "spectator";  // Observer only

/**
 * Room status for P2P rooms
 */
export type RoomStatus = "active" | "closed";

// ==================== USER TYPES ====================
/**
 * Core User interface
 * 
 * Represents a user account in the system.
 * The passwordHash is optional because we never send it to clients.
 */
export interface User {
  id: UserId;
  email: string;
  username: string;
  passwordHash?: string;  // Only used internally
  avatarUrl?: string;
  bio?: string;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User statistics
 * 
 * Tracks a user's debate performance over time.
 */
export interface UserStats {
  totalDebates: number;
  wins: number;
  losses: number;
  draws: number;
  avgScore: number;
}

/**
 * User preferences
 * 
 * Settings that persist across sessions.
 * Based on your SettingsContext.tsx from the desktop app.
 */
export interface UserPreferences {
  voiceEnabled: boolean;
  preferredLanguage: string;
  theme: "light" | "dark" | "system";
  // Glassmorphism settings from your desktop app
  transparency?: number;
  textContrast?: number;
  fontSize?: number;
  blurAmount?: number;
  borderOpacity?: number;
}

/**
 * Safe user type - excludes password hash
 * 
 * Omit<Type, Keys> creates a new type without specified keys.
 * This is what we send to the client.
 */
export type SafeUser = Omit<User, "passwordHash">;

// ==================== DEBATE TYPES ====================
/**
 * Debate settings
 * 
 * Configuration for how a debate runs.
 * Based on your DebateSetupModal.tsx configuration.
 */
export interface DebateSettings {
  maxRounds: number;
  timePerTurn: number;      // seconds per turn
  rebuttalTime: number;     // seconds for rebuttals
  allowVoice: boolean;
  aiModel: string;
  aiPersonality?: string;
  aiSide?: "for" | "against";
  sessionTime?: number;     // total session in minutes
}

/**
 * Debate entity
 * 
 * Represents a complete debate with all metadata.
 */
export interface Debate {
  id: DebateId;
  topic: string;
  description?: string;
  format: DebateFormat;
  status: DebateStatus;
  settings: DebateSettings;
  currentRound: number;
  createdBy: UserId;
  winnerId?: UserId;
  startedAt?: Date;
  endedAt?: Date;
  createdAt: Date;
}

// ==================== AI DEBATE TYPES ====================
/**
 * Feedback item from AI moderator
 * 
 * Based on your debateService.ts FeedbackItem interface.
 */
export interface FeedbackItem {
  type: "argument" | "fact" | "fallacy";
  points: number;
  note: string;
}

/**
 * Moderator feedback for a statement
 * 
 * AI analysis of each debate statement.
 * From your debateService.ts ModeratorFeedback.
 */
export interface ModeratorFeedback {
  toxicCount: number;
  isDisqualified: boolean;
  argumentScore: number;
  factScore: number;
  fallacyScore: number;
  finalScore: number;
  feedback: FeedbackItem[];
}

/**
 * Debate history entry
 * 
 * One turn in the debate with speaker and AI scoring.
 * From your debateService.ts DebateHistoryEntry.
 */
export interface DebateHistoryEntry {
  round: number;
  speaker: "human" | "ai";
  statement: string;
  moderator: ModeratorFeedback;
}

// ==================== ROOM TYPES ====================
/**
 * P2P Room
 * 
 * Based on your server.js room structure.
 * Rooms can exist independently or linked to debates.
 */
export interface Room {
  id: RoomId;
  inviteCode: string;
  debateId?: DebateId;
  createdBy: UserId;
  status: RoomStatus;
  maxParticipants: number;
  createdAt: Date;
  closedAt?: Date;
}

/**
 * Room participant
 * 
 * Who's currently in a room.
 * Maps to your server.js participants Map structure.
 */
export interface RoomParticipant {
  id: ParticipantId;
  roomId: RoomId;
  userId?: UserId;      // null for guests
  displayName: string;
  socketId: string;
  isHost: boolean;
  joinedAt: Date;
  leftAt?: Date;
}

// ==================== MESSAGE TYPES ====================
/**
 * Debate message metadata
 * 
 * Additional info about a message for analytics.
 */
export interface MessageMetadata {
  wordCount: number;
  duration: number;       // seconds (for voice)
  sentiment: number;      // -1 to 1
  keyPoints: string[];
  speaker?: "human" | "ai";
  moderator?: ModeratorFeedback;
}

/**
 * Debate message
 * 
 * A single argument/statement in a debate.
 */
export interface DebateMessage {
  id: MessageId;
  debateId: DebateId;
  participantId: ParticipantId;
  round: number;
  content: string;
  audioUrl?: string;
  transcription?: string;
  metadata?: MessageMetadata;
  createdAt: Date;
}

// ==================== API RESPONSE TYPES ====================
/**
 * Standard API response wrapper
 * 
 * All our API responses follow this structure.
 * Generic <T> allows any data type.
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Paginated response for lists
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ==================== AUTH TYPES ====================
/**
 * Login credentials
 */
export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Signup data
 */
export interface SignupData {
  email: string;
  username: string;
  password: string;
}

/**
 * Auth response after login/signup
 */
export interface AuthResponse {
  user: SafeUser;
  token: string;
}

/**
 * JWT payload structure
 */
export interface JWTPayload {
  userId: UserId;
  email: string;
  iat: number;  // issued at
  exp: number;  // expires at
}

// ==================== REQUEST BODY TYPES ====================
/**
 * Create debate request
 */
export interface CreateDebateRequest {
  topic: string;
  description?: string;
  format: DebateFormat;
  settings?: Partial<DebateSettings>;
  createRoom?: boolean;
}

/**
 * Send message request
 */
export interface SendMessageRequest {
  content: string;
  audioUrl?: string;
  transcription?: string;
}

/**
 * AI debate statement request
 */
export interface AIDebateStatementRequest {
  round: number;
  humanStatement: string;
}

/**
 * Create room request
 */
export interface CreateRoomRequest {
  debateId?: string;
  maxParticipants?: number;
}

/**
 * Join room request
 */
export interface JoinRoomRequest {
  displayName: string;
}

/**
 * Waitlist join request
 */
export interface JoinWaitlistRequest {
  email: string;
  source?: string;
}