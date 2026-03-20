/**
 * Unified key-value storage helper.
 *
 * Production (Vercel): reads/writes via Upstash Redis when
 * UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are set.
 *
 * Local dev (no env vars): falls back to /tmp files so nothing
 * changes for local development.
 *
 * brand-settings is intentionally excluded — it stays as a
 * committed JSON file that resets to the Cority default on
 * each deployment.
 */

import fs from 'fs'
import path from 'path'

const KV_URL = process.env.KV_REST_API_URL
const KV_TOKEN = process.env.KV_REST_API_TOKEN
const USE_KV = !!(KV_URL && KV_TOKEN)

// Lazy singleton — only imported/created when actually needed
let _redis = null
async function getRedis() {
  if (!_redis) {
    const { Redis } = await import('@upstash/redis')
    _redis = new Redis({ url: KV_URL, token: KV_TOKEN })
  }
  return _redis
}

/**
 * Read a value from KV (or /tmp fallback), with optional seed file.
 * Always returns an array or object — never null/undefined.
 */
export async function kvGet(key, seedPath) {
  if (USE_KV) {
    try {
      const redis = await getRedis()
      const data = await redis.get(key)
      if (data !== null && data !== undefined) return data
    } catch (err) {
      console.error(`[KV] get(${key}) failed:`, err.message)
    }
  } else {
    // Local dev: /tmp first
    try {
      return JSON.parse(fs.readFileSync(`/tmp/${key}.json`, 'utf-8'))
    } catch {}
  }

  // Seed file fallback (committed data/ file)
  if (seedPath) {
    try { return JSON.parse(fs.readFileSync(seedPath, 'utf-8')) } catch {}
  }
  return []
}

/**
 * Write a value to KV (or /tmp fallback).
 */
export async function kvSet(key, data) {
  if (USE_KV) {
    try {
      const redis = await getRedis()
      await redis.set(key, data)
    } catch (err) {
      console.error(`[KV] set(${key}) failed:`, err.message)
      throw err
    }
  } else {
    // Local dev: /tmp
    try {
      fs.writeFileSync(`/tmp/${key}.json`, JSON.stringify(data, null, 2))
    } catch {}
  }
}
