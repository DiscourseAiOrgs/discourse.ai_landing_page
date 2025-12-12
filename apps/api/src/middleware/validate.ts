// ============================================
// apps/api/src/middleware/validate.ts
// Middleware to validate request bodies with Zod
// ============================================

import { createMiddleware } from "hono/factory";
import { z, ZodError, ZodSchema } from "zod";
import { errorResponse } from "../utils";

/**
 * Extend Hono's context to include validated data
 * 
 * After validation, the parsed data is stored in context
 * so route handlers can access it type-safely.
 */
declare module "hono" {
  interface ContextVariableMap {
    validatedBody: unknown;
    validatedQuery: unknown;
  }
}

/**
 * Format Zod errors for API response
 * 
 * ZodError contains detailed info about what failed.
 * We transform it into a user-friendly format.
 * 
 * @param error - ZodError from failed validation
 * @returns Array of error messages with field paths
 */
function formatZodErrors(error: ZodError): string[] {
  return error.errors.map((err) => {
    // path is array like ["settings", "maxRounds"]
    const path = err.path.join(".");
    return path ? `${path}: ${err.message}` : err.message;
  });
}

/**
 * Validate request body middleware
 * 
 * Use this to validate JSON bodies in POST/PUT/PATCH routes.
 * 
 * @param schema - Zod schema to validate against
 * @returns Middleware function
 * 
 * @example
 * app.post("/users", validateBody(signupSchema), async (c) => {
 *   const data = c.get("validatedBody") as SignupInput;
 *   // data is guaranteed to be valid!
 * });
 */
export function validateBody<T extends ZodSchema>(schema: T) {
  return createMiddleware(async (c, next) => {
    try {
      // Parse JSON body
      const body = await c.req.json();
      
      // Validate with Zod
      // parse() throws if validation fails
      // parseAsync() is available for async validation
      const validated = schema.parse(body);
      
      // Store in context for route handler
      c.set("validatedBody", validated);
      
      // Continue to route handler
      await next();
    } catch (error) {
      // Handle JSON parse errors
      if (error instanceof SyntaxError) {
        return c.json(
          errorResponse("Invalid JSON in request body"),
          400
        );
      }
      
      // Handle Zod validation errors
      if (error instanceof ZodError) {
        const errors = formatZodErrors(error);
        return c.json(
          {
            success: false,
            error: "Validation failed",
            details: errors,
          },
          400
        );
      }
      
      // Re-throw unknown errors
      throw error;
    }
  });
}

/**
 * Validate query parameters middleware
 * 
 * Use this to validate URL query strings.
 * 
 * @param schema - Zod schema for query params
 * @returns Middleware function
 * 
 * @example
 * app.get("/search", validateQuery(searchQuerySchema), (c) => {
 *   const { q, page } = c.get("validatedQuery") as SearchQuery;
 * });
 */
export function validateQuery<T extends ZodSchema>(schema: T) {
  return createMiddleware(async (c, next) => {
    try {
      // Get all query parameters as object
      const query = c.req.query();
      
      // Validate with Zod
      const validated = schema.parse(query);
      
      // Store in context
      c.set("validatedQuery", validated);
      
      await next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = formatZodErrors(error);
        return c.json(
          {
            success: false,
            error: "Invalid query parameters",
            details: errors,
          },
          400
        );
      }
      throw error;
    }
  });
}