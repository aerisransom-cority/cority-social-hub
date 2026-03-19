import fs from 'fs'
import path from 'path'
import { getServerSession } from 'next-auth/next'
import { authOptions } from './auth/[...nextauth]'

const TMP_PATH  = '/tmp/briefs.json'
const SEED_PATH = path.join(process.cwd(), 'data', 'briefs.json')

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end('Method Not Allowed')

  const session = await getServerSession(req, res, authOptions)
  if (!session) return res.status(401).json({ error: 'Unauthorized' })

  let briefs = []
  try { briefs = JSON.parse(fs.readFileSync(TMP_PATH, 'utf-8')) } catch {}
  if (briefs.length === 0) {
    try { briefs = JSON.parse(fs.readFileSync(SEED_PATH, 'utf-8')) } catch {}
  }

  const { id } = req.query
  if (id) {
    const brief = briefs.find((b) => String(b.id) === String(id))
    if (!brief) return res.status(404).json({ error: 'Brief not found.' })
    return res.status(200).json(brief)
  }

  return res.status(200).json(briefs)
}
