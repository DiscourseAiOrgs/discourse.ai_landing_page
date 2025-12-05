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
import { waitlistRoutes } from "./routes/waitlist";

const app = new Hono();

// ==================== MIDDLEWARE ====================

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
    requestId: c.get("requestId"),
  });
});

app.get("/health", (c) => {
  return c.json({
    status: "ok",
    requestId: c.get("requestId"),
  });
});

// ==================== API ROUTES ====================

app.route("/api/waitlist", waitlistRoutes);

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

// ==================== START SERVER ====================

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