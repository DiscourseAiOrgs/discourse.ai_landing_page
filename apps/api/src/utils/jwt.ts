// ============================================
// apps/api/src/utils/jwt.ts
// JWT token creation and verification
// ============================================

import { SignJWT, jwtVerify, errors } from "jose";
import { config } from "../config";
import type { JWTPayload, UserId } from "../types";

/**
 * Convert secret string to Uint8Array for jose library
 * 
 * jose uses Web Crypto API which requires binary keys.
 */
const SECRET = new TextEncoder().encode(config.jwtSecret);

/**
 * JWT Algorithm
 * 
 * HS256 = HMAC with SHA-256
 * - Symmetric algorithm (same key for sign and verify)
 * - Fast and secure for server-side use
 */
const ALGORITHM = "HS256";

/**
 * Parse duration string to seconds
 * 
 * Converts strings like "7d", "24h", "30m" to seconds.
 * 
 * @param duration - Duration string (e.g., "7d", "24h", "30m", "60s")
 * @returns Duration in seconds
 */
function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)([dhms])$/);
  if (!match) {
    throw new Error(`Invalid duration format: ${duration}`);
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case "d": return value * 24 * 60 * 60;  // days
    case "h": return value * 60 * 60;        // hours
    case "m": return value * 60;             // minutes
    case "s": return value;                  // seconds
    default: throw new Error(`Unknown duration unit: ${unit}`);
  }
}

/**
 * Token expiration time in seconds
 */
const EXPIRATION_SECONDS = parseDuration(config.jwtExpiresIn);

/**
 * Create a JWT token for a user
 * 
 * The token contains:
 * - userId: The user's unique identifier
 * - email: The user's email (for quick access without DB lookup)
 * - iat: Issued at timestamp
 * - exp: Expiration timestamp
 * 
 * @param userId - User's unique identifier
 * @param email - User's email address
 * @returns Signed JWT token string
 * 
 * @example
 * const token = await createToken("usr_123", "user@example.com");
 * // Returns: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 */
export async function createToken(
  userId: UserId,
  email: string
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  return await new SignJWT({
    userId,
    email,
  })
    .setProtectedHeader({ alg: ALGORITHM })
    .setIssuedAt(now)
    .setExpirationTime(now + EXPIRATION_SECONDS)
    .setSubject(userId)  // Standard claim for user identifier
    .sign(SECRET);
}

/**
 * Verify and decode a JWT token
 * 
 * This validates:
 * - Signature is correct (token wasn't tampered with)
 * - Token hasn't expired
 * - Token was issued in the past (not future-dated)
 * 
 * @param token - JWT token to verify
 * @returns Decoded payload or null if invalid
 * 
 * @example
 * const payload = await verifyToken(token);
 * if (payload) {
 *   console.log(payload.userId); // Access user info
 * }
 */
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET, {
      algorithms: [ALGORITHM],
    });

    // Extract our custom claims
    return {
      userId: payload.userId as string,
      email: payload.email as string,
      iat: payload.iat as number,
      exp: payload.exp as number,
    };
  } catch (error) {
    // Handle specific JWT errors
    if (error instanceof errors.JWTExpired) {
      console.log("JWT expired");
    } else if (error instanceof errors.JWTInvalid) {
      console.log("JWT invalid");
    } else if (error instanceof errors.JWSSignatureVerificationFailed) {
      console.log("JWT signature verification failed");
    } else {
      console.error("JWT verification error:", error);
    }
    return null;
  }
}

/**
 * Decode a JWT without verification
 * 
 * ⚠️ WARNING: This does NOT verify the token!
 * Only use for debugging or extracting claims from expired tokens.
 * 
 * @param token - JWT token to decode
 * @returns Decoded payload or null if malformed
 */
export function decodeToken(token: string): JWTPayload | null {
  try {
    // JWT is: header.payload.signature (base64 encoded)
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    // Decode payload (middle part)
    const payload = JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf-8")
    );

    return {
      userId: payload.userId,
      email: payload.email,
      iat: payload.iat,
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}

/**
 * Check if a token is expired
 * 
 * @param token - JWT token to check
 * @returns True if expired, false if still valid
 */
export function isTokenExpired(token: string): boolean {
  const payload = decodeToken(token);
  if (!payload || !payload.exp) return true;
  
  const now = Math.floor(Date.now() / 1000);
  return payload.exp < now;
}