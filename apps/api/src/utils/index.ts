// ============================================
// apps/api/src/utils/index.ts
// Utility functions for the API
// ============================================

import type { ApiResponse, User, SafeUser } from "../types";

/**
 * Create a successful API response
 * 
 * Standardizes success responses across all endpoints.
 * 
 * @param data - The data to return
 * @param message - Optional success message
 * @returns Formatted API response
 * 
 * @example
 * return c.json(successResponse({ user }, "Login successful"));
 * // { success: true, data: { user: {...} }, message: "Login successful" }
 */
export function successResponse<T>(data: T, message?: string): ApiResponse<T> {
  return {
    success: true,
    data,
    message,
  };
}

/**
 * Create an error API response
 * 
 * Standardizes error responses across all endpoints.
 * 
 * @param error - Error message
 * @returns Formatted error response
 * 
 * @example
 * return c.json(errorResponse("User not found"), 404);
 * // { success: false, error: "User not found" }
 */
export function errorResponse(error: string): ApiResponse<never> {
  return {
    success: false,
    error,
  };
}

/**
 * Generate a unique ID with optional prefix
 * 
 * Creates IDs like "usr_m5x8k2abc123" that are:
 * - Human-readable (prefix indicates type)
 * - Unique enough for most purposes
 * - Sortable by time (timestamp is first)
 * 
 * @param prefix - Prefix for the ID (default: "id")
 * @returns Unique identifier string
 * 
 * @example
 * generateId("usr");  // "usr_m5x8k2abc123"
 * generateId("dbt");  // "dbt_m5x8kabc456"
 */
export function generateId(prefix: string = "id"): string {
  // Date.now() in base36 = compact timestamp
  const timestamp = Date.now().toString(36);
  
  // Random string for uniqueness
  const randomPart = Math.random().toString(36).substring(2, 8);
  
  return `${prefix}_${timestamp}${randomPart}`;
}

/**
 * Remove sensitive fields from user object
 * 
 * NEVER send passwordHash to clients!
 * 
 * @param user - User object potentially with passwordHash
 * @returns User object without passwordHash
 */
export function sanitizeUser(user: User): SafeUser {
  // Destructure to exclude passwordHash
  const { passwordHash, ...safeUser } = user;
  return safeUser;
}

/**
 * Sleep for specified milliseconds
 * 
 * Useful for rate limiting, testing, or delays.
 * 
 * @param ms - Milliseconds to sleep
 * @returns Promise that resolves after delay
 * 
 * @example
 * await sleep(1000); // Wait 1 second
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Count words in text
 * 
 * Used for message metadata and analytics.
 * 
 * @param text - Text to count words in
 * @returns Number of words
 */
export function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)           // Split on whitespace
    .filter(Boolean)         // Remove empty strings
    .length;
}

/**
 * Truncate text to maximum length
 * 
 * @param text - Text to truncate
 * @param maxLength - Maximum length including ellipsis
 * @returns Truncated text
 * 
 * @example
 * truncate("Hello World", 8);  // "Hello..."
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + "...";
}

/**
 * Validate email format
 * 
 * Basic email validation. For production, consider
 * more robust validation or email verification.
 * 
 * @param email - Email to validate
 * @returns True if valid format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Format date to ISO string safely
 * 
 * Handles both Date objects and strings.
 * 
 * @param date - Date to format
 * @returns ISO string or undefined
 */
export function formatDate(date: Date | string | undefined): string | undefined {
  if (!date) return undefined;
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString();
}

/**
 * Generate a random invite code
 * 
 * Creates 8-character codes like "ABC12345".
 * Excludes confusing characters (0/O, 1/I/L).
 * 
 * @returns Invite code string
 */
export function generateInviteCode(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}