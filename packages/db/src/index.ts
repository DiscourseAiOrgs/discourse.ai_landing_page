// ============================================
// packages/db/src/index.ts
// Database connection and exports
// ============================================

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * Database connection string
 * 
 * Format: postgres://user:password@host:port/database
 */
const connectionString =
  process.env.DATABASE_URL ||
  "postgres://cortify:cortify_dev@localhost:5432/cortify_ai";

/**
 * Create PostgreSQL client
 * 
 * postgres() creates a connection pool that
 * manages multiple database connections.
 */
const client = postgres(connectionString);

/**
 * Create Drizzle instance
 * 
 * drizzle() wraps the client with ORM functionality.
 * { schema } enables relational queries.
 */
export const db = drizzle(client, { schema });

// Export all schema elements for use in routes
export * from "./schema";

// Export types
export type Database = typeof db;