import crypto from 'crypto'
import { getServerSession } from 'next-auth/next'
import { authOptions } from './auth/[...nextauth]'
import { kvGet, kvSet } from '../../lib/kv'
import { generateTempPassword, hashPassword } from '../../lib/users'

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions)
  if (!session || session.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin only' })
  }

  // GET — list all KV users (strip password fields)
  if (req.method === 'GET') {
    const users = await kvGet('users', null)
    const safe = (Array.isArray(users) ? users : []).map(
      ({ passwordHash, passwordSalt, ...u }) => u
    )
    return res.status(200).json(safe)
  }

  // POST — create new user with generated temp password
  if (req.method === 'POST') {
    const { name, email, role } = req.body
    if (!name || !email || !role) {
      return res.status(400).json({ error: 'name, email, and role are required' })
    }
    if (!['contributor', 'reviewer'].includes(role)) {
      return res.status(400).json({ error: 'role must be contributor or reviewer' })
    }

    const users = await kvGet('users', null)
    const list = Array.isArray(users) ? users : []

    const normalised = email.trim().toLowerCase()
    if (list.some((u) => u.email === normalised)) {
      return res.status(409).json({ error: 'A user with that email already exists' })
    }

    const tempPassword = generateTempPassword()
    const salt = crypto.randomBytes(16).toString('hex')
    const hash = hashPassword(tempPassword, salt)

    const newUser = {
      id: Date.now().toString(),
      name: name.trim(),
      email: normalised,
      role,
      passwordSalt: salt,
      passwordHash: hash,
      createdAt: new Date().toISOString(),
    }

    list.push(newUser)
    await kvSet('users', list)

    return res.status(201).json({
      user: { id: newUser.id, name: newUser.name, email: newUser.email, role, createdAt: newUser.createdAt },
      tempPassword,
    })
  }

  // DELETE — remove user by id
  if (req.method === 'DELETE') {
    const { id } = req.body
    if (!id) return res.status(400).json({ error: 'id is required' })

    const users = await kvGet('users', null)
    const list = Array.isArray(users) ? users : []
    const filtered = list.filter((u) => u.id !== id)

    if (filtered.length === list.length) {
      return res.status(404).json({ error: 'User not found' })
    }

    await kvSet('users', filtered)
    return res.status(200).json({ ok: true })
  }

  res.setHeader('Allow', ['GET', 'POST', 'DELETE'])
  return res.status(405).end('Method Not Allowed')
}
