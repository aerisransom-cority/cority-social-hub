import { getServerSession } from 'next-auth/next'
import { authOptions } from './auth/[...nextauth]'
import { kvGet } from '../../lib/kv'

function userKey(email) {
  return `chat-history-${email.toLowerCase().replace(/[^a-z0-9]/g, '-')}`
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end('Method Not Allowed')

  const session = await getServerSession(req, res, authOptions)
  if (!session) return res.status(401).json({ error: 'Unauthorized' })

  const key = userKey(session.user.email)
  const sessions = await kvGet(key, null)

  return res.status(200).json(Array.isArray(sessions) ? sessions : [])
}
