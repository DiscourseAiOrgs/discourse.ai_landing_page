// ============================================
// apps/api/src/config.ts
// Environment configuration with type safety
// ============================================

/**
 * Configuration interface
 * 
 * Defines all environment variables our app needs.
 * TypeScript ensures we don't forget any.
 */
interface Config {
  // Server settings
  port: number;
  nodeEnv: "development" | "production" | "test";

  // Database
  databaseUrl: string;

  // Authentication
  jwtSecret: string;
  jwtExpiresIn: string;

  // AI Services
  groqApiKey: string;
  deepgramApiKey: string;
  aiBackendUrl: string;

  // CORS
  corsOrigins: string[];
}

/**
 * Get environment variable with optional default
 * 
 * @param key - The environment variable name
 * @param defaultValue - Value to use if env var is missing
 * @returns The environment variable value
 * @throws Error if required variable is missing (no default)
 */
function getEnvVar(key: string, defaultValue?: string): string {
  // process.env contains all environment variables
  const value = process.env[key] || defaultValue;
  
  // If no value and no default, throw error
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  
  return value;
}

/**
 * Application configuration
 * 
 * Reads from environment variables with sensible defaults.
 * Throws errors for missing required values in production.
 */
export const config: Config = {
  // Server
  port: parseInt(getEnvVar("PORT", "8787"), 10),
  nodeEnv: getEnvVar("NODE_ENV", "development") as Config["nodeEnv"],

  // Database
  databaseUrl: getEnvVar(
    "DATABASE_URL",
    "postgres://cortify:cortify_dev@localhost:5432/cortify_ai"
  ),

  // Auth - has default for development, MUST be changed in production
  jwtSecret: getEnvVar("JWT_SECRET", "dev-secret-change-in-production"),
  jwtExpiresIn: getEnvVar("JWT_EXPIRES_IN", "7d"),

  // AI Services - empty defaults for development
  groqApiKey: getEnvVar("GROQ_API_KEY", ""),
  deepgramApiKey: getEnvVar("DEEPGRAM_API_KEY", ""),
  aiBackendUrl: getEnvVar(
    "AI_BACKEND_URL",
    "http://cortify-agents.5.161.237.174.sslip.io"
  ),

  // CORS - split comma-separated string into array
  corsOrigins: getEnvVar(
    "CORS_ORIGINS",
    "http://localhost:3000,http://localhost:5173"
  ).split(","),
};

/**
 * Production validation
 * 
 * Ensures critical settings are properly configured in production.
 * Throws errors on startup if misconfigured.
 */
if (config.nodeEnv === "production") {
  // Check for default JWT secret
  if (config.jwtSecret === "dev-secret-change-in-production") {
    throw new Error("JWT_SECRET must be changed in production");
  }
  
  // Warn about missing AI keys (don't crash, just warn)
  if (!config.groqApiKey) {
    console.warn("⚠️ GROQ_API_KEY not set - AI features will be limited");
  }
}

export default config;