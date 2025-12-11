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

const app = new Hono();

// ==================== MIDDLEWARE ====================
/**
 * Middleware order matters!
 * 
 * 1. requestId - assigns ID first (for logging)
 * 2. logger - logs with request ID available
 * 3. prettyJSON - formats responses
 * 4. cors - handles cross-origin requests
 */

app.use("*", requestIdMiddleware);
app.use("*", logger());
app.use("*", prettyJSON());
app.use(
  "*",
  cors({
    origin: config.corsOrigins,
    credentials: true,
  })
);

// ==================== ROOT ROUTES ====================

app.get("/", (c) => {
  return c.json({
    name: "discourse.ai API",
    version: "0.1.0",
    status: "running",
    timestamp: new Date().toISOString(),
    requestId: c.get("requestId"),  // Access from middleware
  });
});

app.get("/health", (c) => {
  return c.json({
    status: "ok",
    requestId: c.get("requestId"),
  });
});

// ==================== EXAMPLE ROUTES ====================

app.get("/users/:id", (c) => {
  const userId = c.req.param("id");
  
  return c.json({
    message: `Fetching user with ID: ${userId}`,
    userId,
    requestId: c.get("requestId"),
  });
});

app.get("/search", (c) => {
  const query = c.req.query("q") || "";
  const page = c.req.query("page") || "1";
  
  return c.json({
    message: "Search results",
    query,
    page: parseInt(page),
  });
});

app.post("/echo", async (c) => {
  const body = await c.req.json();
  
  return c.json({
    message: "You sent:",
    data: body,
    requestId: c.get("requestId"),
  });
});

// ==================== ERROR HANDLING ====================

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

// ==================== SERVER STARTUP ====================

console.log(`
🔥 discourse.ai API
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 Server:      http://localhost:${config.port}
🌍 Environment: ${config.nodeEnv}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);

export default {
  port: config.port,
  fetch: app.fetch,
};