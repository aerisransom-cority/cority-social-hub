import fs from 'fs'
import path from 'path'
import { getServerSession } from 'next-auth/next'
import { authOptions } from './auth/[...nextauth]'

const TMP_MOCKUPS  = '/tmp/mockups.json'
const SEED_MOCKUPS = path.join(process.cwd(), 'data', 'mockups.json')

function readMockups() {
  try { return JSON.parse(fs.readFileSync(TMP_MOCKUPS, 'utf-8')) } catch {}
  try { return JSON.parse(fs.readFileSync(SEED_MOCKUPS, 'utf-8')) } catch {}
  return []
}

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions)
  if (!session) return res.status(401).json({ error: 'Unauthorized' })

  if (req.method === 'POST') {
    const { briefId, platform } = req.body
    const entry = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      briefId: briefId || null,
      platform: platform || null,
    }
    const existing = readMockups()
    existing.unshift(entry)
    try {
      fs.writeFileSync(TMP_MOCKUPS, JSON.stringify(existing, null, 2))
    } catch {}
    return res.status(200).json(entry)
  }

  res.setHeader('Allow', ['POST'])
  return res.status(405).end('Method Not Allowed')
}
