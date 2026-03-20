import path from 'path'
import { getServerSession } from 'next-auth/next'
import { authOptions } from './auth/[...nextauth]'
import { kvGet, kvSet } from '../../lib/kv'

const SEED = path.join(process.cwd(), 'data', 'mockups.json')

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
    const existing = await kvGet('mockups', SEED)
    existing.unshift(entry)
    await kvSet('mockups', existing)
    return res.status(200).json(entry)
  }

  res.setHeader('Allow', ['POST'])
  return res.status(405).end('Method Not Allowed')
}
