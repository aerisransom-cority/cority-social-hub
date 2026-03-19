import fs from 'fs'
import path from 'path'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'

// Matches the path used in upload.js — both must stay in sync.
const MEDIA_INDEX_PATH = '/tmp/media-index.json'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end('Method Not Allowed')

  const session = await getServerSession(req, res, authOptions)
  if (!session) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const index = JSON.parse(fs.readFileSync(MEDIA_INDEX_PATH, 'utf-8'))
    return res.status(200).json(index)
  } catch {
    return res.status(200).json([])
  }
}
