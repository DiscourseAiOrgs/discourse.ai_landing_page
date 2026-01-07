// ============================================
// apps/api/src/utils/password.ts
// Secure password hashing with Argon2
// ============================================

import { hash, verify } from "@node-rs/argon2";

/**
 * Argon2 Configuration
 * 
 * These parameters control the security/performance tradeoff:
 * - memoryCost: Memory usage in KB (higher = more secure, slower)
 * - timeCost: Number of iterations (higher = more secure, slower)
 * - parallelism: Number of threads to use
 * 
 * OWASP recommends: memoryCost=19456 (19MB), timeCost=2, parallelism=1
 * We use slightly higher for better security.
 */
const ARGON2_OPTIONS = {
  memoryCost: 19456,    // 19 MB memory
  timeCost: 2,          // 2 iterations
  parallelism: 1,       // 1 thread
};

/**
 * Hash a password using Argon2id
 * 
 * Argon2id is the recommended variant that combines:
 * - Argon2i: Resistant to side-channel attacks
 * - Argon2d: Resistant to GPU cracking
 * 
 * The result includes the salt, so you only need to store the hash.
 * 
 * @param password - Plain text password
 * @returns Hashed password string (includes salt and parameters)
 * 
 * @example
 * const hash = await hashPassword("myPassword123");
 * // Returns: "$argon2id$v=19$m=19456,t=2,p=1$..."
 */
export async function hashPassword(password: string): Promise<string> {
  return await hash(password, ARGON2_OPTIONS);
}

/**
 * Verify a password against a hash
 * 
 * This is a constant-time comparison to prevent timing attacks.
 * 
 * @param password - Plain text password to verify
 * @param hashedPassword - Previously hashed password
 * @returns True if password matches, false otherwise
 * 
 * @example
 * const isValid = await verifyPassword("myPassword123", storedHash);
 * if (isValid) {
 *   // Password correct
 * }
 */
export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  try {
    return await verify(hashedPassword, password);
  } catch (error) {
    // If verification fails (e.g., invalid hash format), return false
    console.error("Password verification error:", error);
    return false;
  }
}