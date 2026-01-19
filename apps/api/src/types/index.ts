// ============================================
// apps/api/src/types/index.ts
// Type definitions for cortify.ai API
// 
// Note: PostgreSQL returns `null` for empty columns,
// not `undefined`. Our types reflect this reality.
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
 * Core User interface
 * 
 * Represents a user account in the system.
 * 
 * IMPORTANT: PostgreSQL returns `null` for empty/unset columns.
 * TypeScript's optional (`?:`) means `T | undefined`.
 * These are NOT the same! `null !== undefined`
 * 
 * So we explicitly use `| null` for fields that can be empty in the database.
 */
export interface User {
  id: UserId;
  email: string;
  username: string;
  passwordHash?: string;  // Optional because we exclude it for clients
  
  // These can be null in database
  avatarUrl: string | null;
  bio: string | null;
  emailVerified: boolean | null;
  debateStats: UserStats | null;
  preferences: UserPreferences | null;
  
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Safe user type - excludes password hash
 * 
 * This is what we send to the client.
 * Omit<Type, Keys> creates a new type without specified keys.
 */
export type SafeUser = Omit<User, "passwordHash">;

/**
 * User for creation (what we receive from signup)
 */
export interface CreateUserData {
  email: string;
  username: string;
  password: string;
}

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
  description: string | null;
  format: DebateFormat;
  status: DebateStatus;
  settings: DebateSettings | null;
  currentRound: number | null;
  createdBy: UserId;
  winnerId: UserId | null;
  startedAt: Date | null;
  endedAt: Date | null;
  createdAt: Date;
}

/**
 * Debate participant
 */
export interface DebateParticipant {
  id: ParticipantId;
  debateId: DebateId;
  userId: UserId | null;
  role: ParticipantRole;
  isAi: boolean;
  aiConfig: {
    model: string;
    personality: string;
    stance: string;
  } | null;
  score: number | null;
  joinedAt: Date;
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
  debateId: DebateId | null;
  createdBy: UserId;
  status: RoomStatus;
  maxParticipants: number;
  createdAt: Date;
  closedAt: Date | null;
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
  userId: UserId | null;      // null for guests
  displayName: string;
  socketId: string | null;
  isHost: boolean;
  joinedAt: Date;
  leftAt: Date | null;
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
  audioUrl: string | null;
  transcription: string | null;
  metadata: MessageMetadata | null;
  createdAt: Date;
}

// ==================== TRANSCRIPTION TYPES ====================
/**
 * Transcription record
 * 
 * Speech-to-text result from Deepgram.
 */
export interface Transcription {
  id: string;
  roomId: RoomId;
  participantId: ParticipantId;
  content: string;
  confidence: number;
  speaker: number | null;
  isFinal: boolean;
  createdAt: Date;
}

// ==================== CHAT MESSAGE TYPES ====================
/**
 * Chat message
 * 
 * Text chat in rooms (separate from debate arguments).
 */
export interface ChatMessage {
  id: string;
  roomId: RoomId;
  participantId: ParticipantId;
  content: string;
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

// ==================== SOCKET EVENT TYPES ====================
/**
 * Socket.IO event payloads
 * Based on your server.js socket events
 */
export interface SocketJoinRoomPayload {
  roomId: string;
  participantName: string;
  isHost?: boolean;
}

export interface SocketRoomJoinedPayload {
  roomId: string;
  participantId: string;
  participants: {
    participantId: string;
    participantName: string;
    isHost: boolean;
  }[];
  totalParticipants: number;
}

export interface SocketParticipantJoinedPayload {
  participant: {
    participantId: string;
    participantName: string;
    isHost: boolean;
  };
  totalParticipants: number;
}

export interface SocketTranscriptionPayload {
  transcription: string;
  participantId: string;
  confidence: number;
  timestamp: string;
}

export interface SocketChatMessagePayload {
  message: string;
  timestamp: string;
}

// ==================== ANALYTICS TYPES ====================
/**
 * Debate analysis from AI
 */
export interface DebateAnalysis {
  summary: string;
  keyArguments: {
    participant: string;
    points: string[];
  }[];
  rhetoricalAnalysis: {
    participant: string;
    logosScore: number;
    pathosScore: number;
    ethosScore: number;
  }[];
  factCheck: {
    claim: string;
    verdict: string;
    source?: string;
  }[];
  winner: string;
  reasoning: string;
}

/**
 * Participant score breakdown
 */
export interface ParticipantScore {
  participantId: string;
  overall: number;
  argumentation: number;
  evidence: number;
  rebuttal: number;
  delivery: number;
}

/**
 * Round score result
 */
export interface RoundScoreResult {
  round: number;
  roundWinner: "human" | "ai" | "tie";
  humanTotal: number;
  aiTotal: number;
  margin: number;
  confidence: number;
  keyInsights: string[];
}