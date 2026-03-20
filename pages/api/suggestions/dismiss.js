import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import { kvGet, kvSet } from '../../../lib/kv'

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions)
  if (!session) return res.status(401).json({ error: 'Unauthorized' })

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).end('Method Not Allowed')
  }

  const { id, angle } = req.body
  if (!id) return res.status(400).json({ error: 'id is required' })

  const existing = await kvGet('dismissed-suggestions', null)
  const list = Array.isArray(existing) ? existing : []
  list.unshift({ id, angle: angle || '', dismissedAt: new Date().toISOString() })
  await kvSet('dismissed-suggestions', list.slice(0, 100))
  return res.status(200).json({ ok: true })
}
