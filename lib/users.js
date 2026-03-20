/**
 * Password utilities for KV-stored users.
 * Uses Node's built-in crypto — no extra dependencies needed.
 */
import crypto from 'crypto'

export function generateTempPassword() {
  // ~11 URL-safe characters, easy to share
  return crypto.randomBytes(8).toString('base64url')
}

export function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 32).toString('hex')
}

export function verifyPassword(password, salt, hash) {
  try {
    const candidate = crypto.scryptSync(password, salt, 32)
    const stored = Buffer.from(hash, 'hex')
    return crypto.timingSafeEqual(candidate, stored)
  } catch {
    return false
  }
}
