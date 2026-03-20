/**
 * Self-service profile endpoint — users updating or deleting their own account.
 * PATCH: update display name and/or email in KV
 * DELETE: remove own account from KV (not available to hardcoded admin)
 */
import { getServerSession } from 'next-auth/next'
import { authOptions } from './auth/[...nextauth]'
import { kvGet, kvSet } from '../../lib/kv'

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions)
  if (!session) return res.status(401).json({ error: 'Unauthorized' })

  const userId = session.user?.id
  const isAdmin = session.user?.role === 'admin'

  // PATCH — update name/email
  if (req.method === 'PATCH') {
    const { name, email } = req.body

    // Hardcoded admin: credentials live in env vars — return success so client
    // can still call session.update() to refresh the display name in the JWT.
    if (isAdmin) {
      return res.status(200).json({ ok: true, adminOnly: true })
    }

    // KV user
    const users = await kvGet('users', null)
    const list = Array.isArray(users) ? users : []
    const idx = list.findIndex((u) => u.id === userId)
    if (idx === -1) return res.status(404).json({ error: 'User not found' })

    if (name?.trim()) list[idx].name = name.trim()
    if (email?.trim()) {
      const normalised = email.trim().toLowerCase()
      // Make sure the new email isn't already taken by someone else
      const conflict = list.some((u, i) => i !== idx && u.email === normalised)
      if (conflict) return res.status(409).json({ error: 'That email is already in use' })
      list[idx].email = normalised
    }

    await kvSet('users', list)
    const { passwordHash, passwordSalt, ...safe } = list[idx]
    return res.status(200).json(safe)
  }

  // DELETE — remove own account
  if (req.method === 'DELETE') {
    if (isAdmin) {
      return res.status(400).json({ error: 'The primary admin account cannot be deleted. Update credentials in your environment variables.' })
    }

    const users = await kvGet('users', null)
    const list = Array.isArray(users) ? users : []
    const filtered = list.filter((u) => u.id !== userId)
    await kvSet('users', filtered)
    return res.status(200).json({ ok: true })
  }

  res.setHeader('Allow', ['PATCH', 'DELETE'])
  return res.status(405).end('Method Not Allowed')
}
