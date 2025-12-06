// ============================================
// apps/api/src/middleware/validate.ts
// Zod validation middleware for Hono
// ============================================

import { createMiddleware } from "hono/factory";
import { z, ZodSchema, ZodError } from "zod";
import { errorResponse } from "../utils";

/**
 * Middleware to validate JSON request body against a Zod schema
 * 
 * How middleware works:
 * 1. Request comes in
 * 2. Middleware runs BEFORE route handler
 * 3. If validation fails → return error, route never runs
 * 4. If validation passes → call next() to continue to route
 * 
 * @param schema - The Zod schema to validate against
 * @returns Hono middleware function
 */
export function validateBody<T extends ZodSchema>(schema: T) {
  // createMiddleware is a Hono helper that creates properly typed middleware
  return createMiddleware(async (c, next) => {
    try {
      // Step 1: Parse the JSON body from the request
      const body = await c.req.json();
      
      // Step 2: Validate against the schema
      // schema.parse() throws ZodError if validation fails
      const validated = schema.parse(body);
      
      // Step 3: Store validated data in context
      // The route handler can access this via c.get("validatedBody")
      c.set("validatedBody", validated);
      
      // Step 4: Continue to the route handler
      await next();
      
    } catch (error) {
      // Handle Zod validation errors
      if (error instanceof ZodError) {
        // Transform Zod errors into a user-friendly format
        const errors = error.errors.map((e) => ({
          field: e.path.join("."),  // e.g., "preferences.theme"
          message: e.message,        // e.g., "Invalid email address"
        }));
        
        // Return 400 Bad Request with details
        return c.json(
          {
            success: false,
            error: "Validation failed",
            details: errors,
          },
          400
        );
      }
      
      // Handle JSON parsing errors (malformed JSON)
      return c.json(errorResponse("Invalid JSON body"), 400);
    }
  });
}

/**
 * Middleware to validate query parameters
 * 
 * Query params are in the URL: /search?q=hello&page=2
 * This validates them against a schema
 */
export function validateQuery<T extends ZodSchema>(schema: T) {
  return createMiddleware(async (c, next) => {
    try {
      // Get all query parameters as an object
      const query = c.req.query();
      
      // Validate
      const validated = schema.parse(query);
      
      // Store in context
      c.set("validatedQuery", validated);
      
      await next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        }));
        
        return c.json(
          {
            success: false,
            error: "Invalid query parameters",
            details: errors,
          },
          400
        );
      }
      
      return c.json(errorResponse("Invalid query parameters"), 400);
    }
  });
}

// ==================== EXTEND HONO'S CONTEXT ====================

/**
 * TypeScript declaration merging
 * 
 * This tells TypeScript that Hono's Context now has
 * validatedBody and validatedQuery properties.
 * 
 * Without this, c.get("validatedBody") would return 'unknown'
 */
declare module "hono" {
  interface ContextVariableMap {
    validatedBody: unknown;
    validatedQuery: unknown;
  }
}


// **How the Middleware Flow Works:**
// 
// Request: POST /api/auth/signup
//          Body: { "email": "bad", "password": "123" }
         
//          ↓
         
// Middleware: validateBody(signupSchema)
//          ↓
//          Tries to validate...
//          ↓
//          FAILS! "bad" is not valid email, "123" is too short
//          ↓
//          Returns 400 error, route handler NEVER runs
         
// ─────────────────────────────────────────────────────────

// Request: POST /api/auth/signup  
//          Body: { "email": "alice@example.com", "username": "alice", "password": "password123" }
         
//          ↓
         
// Middleware: validateBody(signupSchema)
//          ↓
//          Validates successfully!
//          ↓
//          Stores data in c.set("validatedBody", {...})
//          ↓
//          Calls next()
//          ↓
         
// Route Handler runs, accesses c.get("validatedBody")