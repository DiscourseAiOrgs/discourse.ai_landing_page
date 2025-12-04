// ============================================
// apps/api/src/types/index.ts
// Type definitions for discourse.ai API
// ============================================

// ==================== ID TYPES ====================
export type UserId = string;
export type DebateId = string;
export type MessageId = string;
export type ParticipantId = string;

// ==================== ENUMS AS UNION TYPES ====================
export type DebateFormat =
  | "one_v_one_ai"      // User vs AI
  | "one_v_one_human"   // User vs User
  | "multi_ai_mod"      // Multiple users, AI moderates
  | "free_form";        // Unstructured practice

export type DebateStatus =
  | "waiting"
  | "in_progress"
  | "paused"
  | "completed"
  | "cancelled";

export type ParticipantRole =
  | "proposer"    // Argues FOR the motion
  | "opposer"     // Argues AGAINST
  | "moderator"   // AI or human moderator
  | "spectator";

// ==================== USER TYPES ====================
export interface User {
  id: UserId;
  email: string;
  username: string;
  passwordHash?: string;  // Only used internally, never sent to client
  avatarUrl?: string;
  bio?: string;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserStats {
  totalDebates: number;
  wins: number;
  losses: number;
  draws: number;
  avgScore: number;
}

export interface UserPreferences {
  voiceEnabled: boolean;
  preferredLanguage: string;
  theme: "light" | "dark" | "system";
}

// User with all related data
export interface UserWithDetails extends User {
  stats: UserStats;
  preferences: UserPreferences;
}

// User safe to send to client (no password)
export type SafeUser = Omit<User, "passwordHash">;

// ==================== DEBATE TYPES ====================
export interface DebateSettings {
  maxRounds: number;
  timePerTurn: number;      // seconds
  rebuttalTime: number;     // seconds
  allowVoice: boolean;
  aiModel: string;
  aiPersonality?: string;
}

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

// ==================== PARTICIPANT TYPES ====================
export interface AIConfig {
  model: string;
  personality: string;
  stance: string;
}

export interface DebateParticipant {
  id: ParticipantId;
  debateId: DebateId;
  userId?: UserId;        // null if AI participant
  role: ParticipantRole;
  isAi: boolean;
  aiConfig?: AIConfig;
  score: number;
  joinedAt: Date;
}

// ==================== MESSAGE TYPES ====================
export interface MessageMetadata {
  wordCount: number;
  duration: number;       // seconds (for voice messages)
  sentiment: number;      // -1 to 1
  keyPoints: string[];
}

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

// ==================== ANALYTICS TYPES ====================
export interface RhetoricalScores {
  logosScore: number;     // Logic/evidence (0-100)
  pathosScore: number;    // Emotional appeal (0-100)
  ethosScore: number;     // Credibility (0-100)
}

export interface FactCheckResult {
  claim: string;
  verdict: "accurate" | "inaccurate" | "uncertain";
  source?: string;
}

export interface DebateAnalysis {
  summary: string;
  keyArguments: {
    participant: string;
    points: string[];
  }[];
  rhetoricalAnalysis: (RhetoricalScores & { participant: string })[];
  factCheck: FactCheckResult[];
  winner: string;
  reasoning: string;
}

export interface ParticipantScore {
  participantId: ParticipantId;
  overall: number;
  argumentation: number;
  evidence: number;
  rebuttal: number;
  delivery: number;
}

export interface DebateAnalytics {
  id: string;
  debateId: DebateId;
  analysis: DebateAnalysis;
  participantScores: ParticipantScore[];
  generatedAt: Date;
}

// ==================== WAITLIST ====================
export interface WaitlistEntry {
  id: string;
  email: string;
  source?: string;
  createdAt: Date;
}

// ==================== API RESPONSE TYPES ====================
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ==================== AUTH TYPES ====================
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupData {
  email: string;
  username: string;
  password: string;
}

export interface AuthResponse {
  user: SafeUser;
  token: string;
}

export interface JWTPayload {
  userId: UserId;
  email: string;
  iat: number;
  exp: number;
}

// ==================== REQUEST BODY TYPES ====================
export interface CreateDebateRequest {
  topic: string;
  description?: string;
  format: DebateFormat;
  settings?: Partial<DebateSettings>;
}

export interface SendMessageRequest {
  content: string;
  audioUrl?: string;
  transcription?: string;
}

export interface UpdateProfileRequest {
  username?: string;
  bio?: string;
  avatarUrl?: string;
  preferences?: Partial<UserPreferences>;
}

export interface JoinWaitlistRequest {
  email: string;
  source?: string;
}