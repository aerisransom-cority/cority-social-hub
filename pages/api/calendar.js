import path from 'path'
import { getServerSession } from 'next-auth/next'
import { authOptions } from './auth/[...nextauth]'
import { kvGet, kvSet } from '../../lib/kv'

const SEED_CALENDAR = path.join(process.cwd(), 'data', 'calendar.json')
const SEED_BRIEFS   = path.join(process.cwd(), 'data', 'briefs.json')

const PLATFORM_LABEL = {
  linkedin: 'LinkedIn', instagram: 'Instagram',
  x: 'X', facebook: 'Facebook', youtube: 'YouTube',
}

// Synthesise calendar entries from briefs that don't already have an explicit entry.
async function mergedCalendar() {
  const explicit = await kvGet('calendar', SEED_CALENDAR)
  const explicitBriefIds = new Set(explicit.map((e) => String(e.briefId)).filter(Boolean))

  const briefs = await kvGet('briefs', SEED_BRIEFS)

  const synthetic = briefs
    .filter((b) => b.deadline && !explicitBriefIds.has(String(b.id)))
    .map((b) => ({
      id: `brief-${b.id}`,
      createdAt: b.createdAt,
      title: b.description.length > 60 ? b.description.slice(0, 57) + '…' : b.description,
      platform: PLATFORM_LABEL[b.platforms?.[0]] || b.platforms?.[0] || 'LinkedIn',
      contentType: 'Post',
      scheduledDate: b.deadline,
      status: 'Draft',
      briefId: b.id,
      clouds: b.clouds || [],
      notes: `From brief · Audience: ${b.audience} · Goal: ${b.goal}`,
      isBriefEntry: true,
    }))

  return [...explicit, ...synthetic]
}

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions)
  if (!session) return res.status(401).json({ error: 'Unauthorized' })

  if (req.method === 'GET') {
    return res.status(200).json(await mergedCalendar())
  }

  if (req.method === 'POST') {
    const { title, platform, contentType, scheduledDate, status, briefId, copy, notes } = req.body
    if (!title || !scheduledDate) return res.status(400).json({ error: 'title and scheduledDate are required.' })
    const entry = {
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      title,
      platform: platform || null,
      contentType: contentType || null,
      scheduledDate,
      status: status || 'Draft',
      briefId: briefId || null,
      copy: copy || null,
      notes: notes || null,
    }
    const calendar = await kvGet('calendar', SEED_CALENDAR)
    calendar.push(entry)
    await kvSet('calendar', calendar)
    return res.status(201).json(entry)
  }

  if (req.method === 'PATCH') {
    const { id, ...updates } = req.body
    if (!id) return res.status(400).json({ error: 'id is required.' })
    const calendar = await kvGet('calendar', SEED_CALENDAR)
    const idx = calendar.findIndex((e) => e.id === id)
    if (idx === -1) {
      // Upsert: synthetic brief entries aren't stored until first edited
      const briefId = String(id).startsWith('brief-')
        ? (isNaN(id.replace('brief-', '')) ? id.replace('brief-', '') : Number(id.replace('brief-', '')))
        : null
      const newEntry = {
        id, briefId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...updates,
      }
      calendar.push(newEntry)
      await kvSet('calendar', calendar)
      return res.status(200).json(newEntry)
    }
    calendar[idx] = { ...calendar[idx], ...updates, updatedAt: new Date().toISOString() }
    await kvSet('calendar', calendar)
    return res.status(200).json(calendar[idx])
  }

  if (req.method === 'DELETE') {
    const { id } = req.query
    if (!id) return res.status(400).json({ error: 'id is required.' })
    const calendar = await kvGet('calendar', SEED_CALENDAR)
    await kvSet('calendar', calendar.filter((e) => e.id !== id))
    return res.status(200).json({ success: true })
  }

  res.setHeader('Allow', ['GET', 'POST', 'PATCH', 'DELETE'])
  return res.status(405).end('Method Not Allowed')
}
