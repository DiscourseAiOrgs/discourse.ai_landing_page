// ============================================
// apps/api/src/index.ts
// Main API entry point
// ============================================

import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";

import { config } from "./config";
import { requestIdMiddleware } from "./middleware/requestId";

// Import route modules
import { authRoutes } from "./routes/auth";
import { userRoutes } from "./routes/users";
import { debateRoutes } from "./routes/debates";
import { waitlistRoutes } from "./routes/waitlist";

// Create main Hono application
const app = new Hono();

// ==================== MIDDLEWARE ====================
/**
 * Middleware runs in order for EVERY request
 * 
 * Order matters:
 * 1. requestId - assigns ID to track request through logs
 * 2. logger - logs request method, path, and response time
 * 3. prettyJSON - formats JSON nicely in development
 * 4. cors - allows frontend on different port to call API
 */

app.use("*", requestIdMiddleware);
app.use("*", logger());
app.use("*", prettyJSON());
app.use(
  "*",
  cors({
    origin: config.corsOrigins,  // ["http://localhost:3000", ...]
    credentials: true,            // Allow cookies
  })
);

// ==================== ROOT ROUTES ====================

/**
 * GET /
 * 
 * API information endpoint
 * Useful for checking if API is up and seeing available endpoints
 */
app.get("/", (c) => {
  return c.json({
    name: "discourse.ai API",
    version: "0.1.0",
    status: "running",
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: "/api/auth",
      users: "/api/users",
      debates: "/api/debates",
      waitlist: "/api/waitlist",
    },
  });
});

/**
 * GET /health
 * 
 * Health check for load balancers and monitoring
 * Returns minimal response for speed
 */
app.get("/health", (c) => {
  return c.json({ status: "ok" });
});

// ==================== API ROUTES ====================
/**
 * Mount route modules at their base paths
 * 
 * app.route(basePath, router) mounts all routes from router
 * under basePath. So authRoutes.post("/signup") becomes
 * POST /api/auth/signup
 */

app.route("/api/auth", authRoutes);
app.route("/api/users", userRoutes);
app.route("/api/debates", debateRoutes);
app.route("/api/waitlist", waitlistRoutes);

// ==================== ERROR HANDLING ====================

/**
 * 404 Not Found handler
 * 
 * Runs when no route matches the request
 * Must be defined AFTER all routes
 */
app.notFound((c) => {
  return c.json(
    {
      success: false,
      error: "Not found",
      path: c.req.path,
    },
    404
  );
});

/**
 * Global error handler
 * 
 * Catches any unhandled errors in route handlers
 * Logs the error and returns a generic 500 response
 * 
 * In production, don't expose err.message to clients
 * as it might contain sensitive information
 */
app.onError((err, c) => {
  console.error("API Error:", err);
  return c.json(
    {
      success: false,
      error: err.message || "Internal server error",
    },
    500
  );
});

// ==================== START SERVER ====================

console.log(`
🔥 discourse.ai API
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 Server:      http://localhost:${config.port}
🌍 Environment: ${config.nodeEnv}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Endpoints:
   • Auth:     /api/auth
   • Users:    /api/users
   • Debates:  /api/debates
   • Waitlist: /api/waitlist
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);

/**
 * Export for Bun
 * 
 * Bun's HTTP server expects an object with:
 * - port: number
 * - fetch: function that handles requests
 * 
 * app.fetch is Hono's request handler function
 */
export default {
  port: config.port,
  fetch: app.fetch,
};