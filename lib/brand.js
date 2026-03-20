/**
 * Async brand settings reader: /tmp → Vercel KV → committed seed.
 * Used by all AI routes so cold-start functions pick up the latest saved settings.
 */
import fs from 'fs'
import path from 'path'
import { kvGet } from './kv'

const TMP_PATH = '/tmp/brand-settings.json'
const SEED_PATH = path.join(process.cwd(), 'data', 'brand-settings.json')

export async function readBrandSettings() {
  // 1. /tmp — fastest, set when the function is warm
  try {
    const data = JSON.parse(fs.readFileSync(TMP_PATH, 'utf-8'))
    if (data && data.vision) return data
  } catch {}

  // 2. Vercel KV — durable, survives cold starts
  try {
    const data = await kvGet('brand-settings', null)
    if (data && typeof data === 'object' && data.vision) {
      // Warm the /tmp cache for subsequent reads in this function instance
      try { fs.writeFileSync(TMP_PATH, JSON.stringify(data, null, 2)) } catch {}
      return data
    }
  } catch {}

  // 3. Committed seed file — always present
  try { return JSON.parse(fs.readFileSync(SEED_PATH, 'utf-8')) } catch {}

  return {}
}
