// ============================================
// packages/db/drizzle.config.ts
// Drizzle Kit configuration for migrations
// ============================================

import { defineConfig } from "drizzle-kit";

export default defineConfig({
  // Schema file location
  schema: "./src/schema.ts",

  // Output directory for migrations
  out: "./migrations",

  // Database type
  dialect: "postgresql",

  // Database connection
  dbCredentials: {
    url:
      process.env.DATABASE_URL ||
      "postgres://cortify:cortify_dev@localhost:5432/cortify_ai",
  },

  // Enable verbose logging
  verbose: true,

  // Require confirmation for destructive changes
  strict: true,
});