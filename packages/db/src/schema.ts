// ============================================
// packages/db/src/schema.ts
// Database schema definition using Drizzle ORM
// ============================================

import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  real,
  jsonb,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

/**
 * PostgreSQL Enums
 * 
 * Enums restrict columns to specific values.
 * They're enforced at the database level.
 */

/**
 * Debate format enum
 */
export const debateFormatEnum = pgEnum("debate_format", [
  "one_v_one_ai",
  "one_v_one_human",
  "multi_ai_mod",
  "free_form",
]);

/**
 * Debate status enum
 */
export const debateStatusEnum = pgEnum("debate_status", [
  "waiting",
  "in_progress",
  "paused",
  "completed",
  "cancelled",
]);

/**
 * Participant role enum
 */
export const participantRoleEnum = pgEnum("participant_role", [
  "proposer",
  "opposer",
  "moderator",
  "spectator",
]);

/**
 * Room status enum
 */
export const roomStatusEnum = pgEnum("room_status", [
  "active",
  "closed",
]);

// ==================== TABLES ====================

/**
 * Users table
 * 
 * Core user accounts with profile and settings.
 * 
 * Column types:
 * - uuid(): Auto-generated unique ID
 * - text(): Variable-length string
 * - boolean(): true/false
 * - timestamp(): Date/time
 * - jsonb(): JSON stored efficiently
 */
export const users = pgTable("users", {
  /**
   * Primary key - auto-generated UUID
   * 
   * .primaryKey() makes this the table's primary key
   * .defaultRandom() generates a UUID automatically
   */
  id: uuid("id").primaryKey().defaultRandom(),

  /**
   * Email - unique identifier for login
   * 
   * .unique() prevents duplicate emails
   * .notNull() means this field is required
   */
  email: text("email").unique().notNull(),

  /**
   * Username - public display name
   */
  username: text("username").unique().notNull(),

  /**
   * Password hash - NEVER store plain passwords!
   */
  passwordHash: text("password_hash").notNull(),

  /**
   * Optional profile fields
   */
  avatarUrl: text("avatar_url"),
  bio: text("bio"),

  /**
   * Debate statistics as JSON
   * 
   * .$type<T>() tells TypeScript what the JSON contains.
   * .default({}) sets initial value.
   */
  debateStats: jsonb("debate_stats").$type<{
    totalDebates: number;
    wins: number;
    losses: number;
    draws: number;
    avgScore: number;
  }>().default({
    totalDebates: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    avgScore: 0,
  }),

  /**
   * User preferences as JSON
   */
  preferences: jsonb("preferences").$type<{
    voiceEnabled: boolean;
    preferredLanguage: string;
    theme: "light" | "dark" | "system";
    transparency?: number;
    textContrast?: number;
    fontSize?: number;
    blurAmount?: number;
    borderOpacity?: number;
  }>().default({
    voiceEnabled: true,
    preferredLanguage: "en",
    theme: "system",
  }),

  emailVerified: boolean("email_verified").default(false),

  /**
   * Timestamps
   * 
   * .defaultNow() sets to current time on insert
   */
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/**
 * Sessions table
 * 
 * Tracks active login sessions.
 */
export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),

  /**
   * Foreign key to users table
   * 
   * .references(() => users.id) creates a foreign key relationship
   * { onDelete: "cascade" } deletes sessions when user is deleted
   */
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),

  token: text("token").unique().notNull(),
  expiresAt: timestamp("expires_at").notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * Rooms table
 * 
 * P2P debate rooms based on your server.js structure.
 */
export const rooms = pgTable("rooms", {
  id: uuid("id").primaryKey().defaultRandom(),

  inviteCode: text("invite_code").unique().notNull(),

  // Optional link to a debate
  debateId: uuid("debate_id").references(() => debates.id, { onDelete: "set null" }),

  createdBy: uuid("created_by")
    .references(() => users.id)
    .notNull(),

  status: roomStatusEnum("status").default("active").notNull(),

  maxParticipants: integer("max_participants").default(2).notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  closedAt: timestamp("closed_at"),
});

/**
 * Room participants table
 * 
 * Who's currently in each room.
 */
export const roomParticipants = pgTable("room_participants", {
  id: uuid("id").primaryKey().defaultRandom(),

  roomId: uuid("room_id")
    .references(() => rooms.id, { onDelete: "cascade" })
    .notNull(),

  userId: uuid("user_id").references(() => users.id),

  displayName: text("display_name").notNull(),

  socketId: text("socket_id"),

  isHost: boolean("is_host").default(false).notNull(),

  joinedAt: timestamp("joined_at").defaultNow().notNull(),
  leftAt: timestamp("left_at"),
});

/**
 * Debates table
 * 
 * Core debate records.
 */
export const debates = pgTable("debates", {
  id: uuid("id").primaryKey().defaultRandom(),

  topic: text("topic").notNull(),
  description: text("description"),

  /**
   * Enum columns
   * 
   * Must use one of the defined values.
   */
  format: debateFormatEnum("format").notNull(),
  status: debateStatusEnum("status").default("waiting").notNull(),

  /**
   * Settings as JSON
   */
  settings: jsonb("settings").$type<{
    maxRounds: number;
    timePerTurn: number;
    rebuttalTime: number;
    allowVoice: boolean;
    aiModel: string;
    aiPersonality?: string;
    aiSide?: "for" | "against";
    sessionTime?: number;
  }>().default({
    maxRounds: 3,
    timePerTurn: 180,
    rebuttalTime: 60,
    allowVoice: true,
    aiModel: "llama-3.3-70b-versatile",
  }),

  currentRound: integer("current_round").default(1),

  createdBy: uuid("created_by")
    .references(() => users.id)
    .notNull(),

  winnerId: uuid("winner_id").references(() => users.id),

  finalScores: jsonb("final_scores").$type<{
    humanTotal: number;
    aiTotal: number;
    rounds: {
      round: number;
      humanScore: number;
      aiScore: number;
      winner: "human" | "ai" | "tie";
    }[];
  }>(),

  startedAt: timestamp("started_at"),
  endedAt: timestamp("ended_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * Debate participants table
 */
export const debateParticipants = pgTable("debate_participants", {
  id: uuid("id").primaryKey().defaultRandom(),

  debateId: uuid("debate_id")
    .references(() => debates.id, { onDelete: "cascade" })
    .notNull(),

  userId: uuid("user_id").references(() => users.id),

  role: participantRoleEnum("role").notNull(),

  isAi: boolean("is_ai").default(false).notNull(),

  aiConfig: jsonb("ai_config").$type<{
    model: string;
    personality: string;
    stance: string;
  }>(),

  score: real("score").default(0),

  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

/**
 * Debate messages table
 */
export const debateMessages = pgTable("debate_messages", {
  id: uuid("id").primaryKey().defaultRandom(),

  debateId: uuid("debate_id")
    .references(() => debates.id, { onDelete: "cascade" })
    .notNull(),

  participantId: uuid("participant_id")
    .references(() => debateParticipants.id)
    .notNull(),

  round: integer("round").notNull(),
  content: text("content").notNull(),

  audioUrl: text("audio_url"),
  transcription: text("transcription"),

  metadata: jsonb("metadata").$type<{
    wordCount: number;
    duration: number;
    sentiment: number;
    keyPoints: string[];
    speaker?: "human" | "ai";
    moderator?: {
      toxicCount: number;
      isDisqualified: boolean;
      argumentScore: number;
      factScore: number;
      fallacyScore: number;
      finalScore: number;
      feedback: { type: string; points: number; note: string }[];
    };
  }>(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * Transcriptions table
 * 
 * Stores speech-to-text records from Deepgram.
 */
export const transcriptions = pgTable("transcriptions", {
  id: uuid("id").primaryKey().defaultRandom(),

  roomId: uuid("room_id")
    .references(() => rooms.id, { onDelete: "cascade" })
    .notNull(),

  participantId: uuid("participant_id")
    .references(() => roomParticipants.id)
    .notNull(),

  content: text("content").notNull(),
  confidence: real("confidence").notNull(),
  speaker: integer("speaker"),
  isFinal: boolean("is_final").default(true).notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * Chat messages table
 * 
 * Text chat in rooms (separate from debate statements).
 */
export const chatMessages = pgTable("chat_messages", {
  id: uuid("id").primaryKey().defaultRandom(),

  roomId: uuid("room_id")
    .references(() => rooms.id, { onDelete: "cascade" })
    .notNull(),

  participantId: uuid("participant_id")
    .references(() => roomParticipants.id)
    .notNull(),

  content: text("content").notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * Debate analytics table
 * 
 * AI-generated analysis after debate ends.
 */
export const debateAnalytics = pgTable("debate_analytics", {
  id: uuid("id").primaryKey().defaultRandom(),

  debateId: uuid("debate_id")
    .references(() => debates.id, { onDelete: "cascade" })
    .unique()
    .notNull(),

  analysis: jsonb("analysis").$type<{
    summary: string;
    keyArguments: { participant: string; points: string[] }[];
    rhetoricalAnalysis: {
      participant: string;
      logosScore: number;
      pathosScore: number;
      ethosScore: number;
    }[];
    factCheck: { claim: string; verdict: string; source?: string }[];
    winner: string;
    reasoning: string;
  }>().notNull(),

  participantScores: jsonb("participant_scores").$type<{
    participantId: string;
    overall: number;
    argumentation: number;
    evidence: number;
    rebuttal: number;
    delivery: number;
  }[]>().notNull(),

  generatedAt: timestamp("generated_at").defaultNow().notNull(),
});

/**
 * Waitlist table
 */
export const waitlist = pgTable("waitlist", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").unique().notNull(),
  source: text("source"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ==================== RELATIONS ====================

/**
 * Relations define how tables connect
 * 
 * These enable Drizzle's relational queries:
 * db.query.debates.findFirst({ with: { participants: true } })
 */

export const usersRelations = relations(users, ({ many }) => ({
  debates: many(debates),
  debateParticipations: many(debateParticipants),
  sessions: many(sessions),
  roomsCreated: many(rooms),
  roomParticipations: many(roomParticipants),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const roomsRelations = relations(rooms, ({ one, many }) => ({
  creator: one(users, {
    fields: [rooms.createdBy],
    references: [users.id],
  }),
  debate: one(debates, {
    fields: [rooms.debateId],
    references: [debates.id],
  }),
  participants: many(roomParticipants),
  transcriptions: many(transcriptions),
  chatMessages: many(chatMessages),
}));

export const roomParticipantsRelations = relations(roomParticipants, ({ one, many }) => ({
  room: one(rooms, {
    fields: [roomParticipants.roomId],
    references: [rooms.id],
  }),
  user: one(users, {
    fields: [roomParticipants.userId],
    references: [users.id],
  }),
  transcriptions: many(transcriptions),
  chatMessages: many(chatMessages),
}));

export const debatesRelations = relations(debates, ({ one, many }) => ({
  creator: one(users, {
    fields: [debates.createdBy],
    references: [users.id],
  }),
  winner: one(users, {
    fields: [debates.winnerId],
    references: [users.id],
  }),
  participants: many(debateParticipants),
  messages: many(debateMessages),
  room: one(rooms),
  analytics: one(debateAnalytics),
}));

export const debateParticipantsRelations = relations(debateParticipants, ({ one, many }) => ({
  debate: one(debates, {
    fields: [debateParticipants.debateId],
    references: [debates.id],
  }),
  user: one(users, {
    fields: [debateParticipants.userId],
    references: [users.id],
  }),
  messages: many(debateMessages),
}));

export const debateMessagesRelations = relations(debateMessages, ({ one }) => ({
  debate: one(debates, {
    fields: [debateMessages.debateId],
    references: [debates.id],
  }),
  participant: one(debateParticipants, {
    fields: [debateMessages.participantId],
    references: [debateParticipants.id],
  }),
}));

export const transcriptionsRelations = relations(transcriptions, ({ one }) => ({
  room: one(rooms, {
    fields: [transcriptions.roomId],
    references: [rooms.id],
  }),
  participant: one(roomParticipants, {
    fields: [transcriptions.participantId],
    references: [roomParticipants.id],
  }),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  room: one(rooms, {
    fields: [chatMessages.roomId],
    references: [rooms.id],
  }),
  participant: one(roomParticipants, {
    fields: [chatMessages.participantId],
    references: [roomParticipants.id],
  }),
}));

export const debateAnalyticsRelations = relations(debateAnalytics, ({ one }) => ({
  debate: one(debates, {
    fields: [debateAnalytics.debateId],
    references: [debates.id],
  }),
}));