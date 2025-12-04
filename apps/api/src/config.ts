// ============================================
// apps/api/src/config.ts
// Environment configuration with type safety
// ============================================

interface Config {
  // Server
  port: number;
  nodeEnv: "development" | "production" | "test";

  // Database
  databaseUrl: string;

  // Auth
  jwtSecret: string;
  jwtExpiresIn: string;

  // AI Services
  groqApiKey: string;
  deepgramApiKey: string;

  // CORS
  corsOrigins: string[];
}

function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key] || defaultValue;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const config: Config = {
  // Server
  port: parseInt(getEnvVar("PORT", "8787"), 10),
  nodeEnv: getEnvVar("NODE_ENV", "development") as Config["nodeEnv"],

  // Database
  databaseUrl: getEnvVar(
    "DATABASE_URL",
    "postgres://discourse:discourse_dev@localhost:5432/discourse_ai"
  ),

  // Auth
  jwtSecret: getEnvVar("JWT_SECRET", "dev-secret-change-in-production"),
  jwtExpiresIn: getEnvVar("JWT_EXPIRES_IN", "7d"),

  // AI Services (optional in development)
  groqApiKey: getEnvVar("GROQ_API_KEY", ""),
  deepgramApiKey: getEnvVar("DEEPGRAM_API_KEY", ""),

  // CORS
  corsOrigins: getEnvVar(
    "CORS_ORIGINS",
    "http://localhost:3000,http://localhost:5173"
  ).split(","),
};

// Validate required variables in production
if (config.nodeEnv === "production") {
  const required = ["GROQ_API_KEY", "DEEPGRAM_API_KEY"];
  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`${key} is required in production`);
    }
  }
  if (config.jwtSecret === "dev-secret-change-in-production") {
    throw new Error("JWT_SECRET must be changed in production");
  }
}

export default config;