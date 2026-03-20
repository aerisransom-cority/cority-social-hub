import fs from 'fs'
import path from 'path'
import { kvSet } from '../../lib/kv'

// Vercel's /data directory is read-only (build artifact).
// Writes go to /tmp/brand-settings.json (writable, ephemeral between cold starts)
// AND to Vercel KV so cold-start functions always read the latest settings.
const TMP_PATH = '/tmp/brand-settings.json'
const SEED_PATH = path.join(process.cwd(), 'data', 'brand-settings.json')

function readSettings() {
  try { return JSON.parse(fs.readFileSync(TMP_PATH, 'utf-8')) } catch {}
  try { return JSON.parse(fs.readFileSync(SEED_PATH, 'utf-8')) } catch {}
  return {}
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const settings = readSettings()
    if (!settings || Object.keys(settings).length === 0) {
      return res.status(500).json({ error: 'Failed to read brand settings.' })
    }
    return res.status(200).json(settings)
  }

  if (req.method === 'POST') {
    try {
      const data = req.body
      // Write to /tmp for warm-function speed
      fs.writeFileSync(TMP_PATH, JSON.stringify(data, null, 2), 'utf-8')
      // Write to KV for cold-start durability (non-fatal)
      try { await kvSet('brand-settings', data) } catch (kvErr) {
        console.warn('[brand-settings] KV write failed:', kvErr.message)
      }
      return res.status(200).json({ success: true })
    } catch (err) {
      return res.status(500).json({ error: 'Failed to save brand settings.' })
    }
  }

  res.setHeader('Allow', ['GET', 'POST'])
  return res.status(405).end(`Method ${req.method} Not Allowed`)
}
