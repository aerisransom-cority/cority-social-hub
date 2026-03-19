import fs from 'fs'
import path from 'path'
import { getServerSession } from 'next-auth/next'
import { authOptions } from './auth/[...nextauth]'

// Vercel's data/ directory is read-only (build artifact). All writes go to /tmp
// (writable, ephemeral between cold starts). Reads try /tmp first, then fall
// back to the committed seed files in data/.
const TMP_CALENDAR = '/tmp/calendar.json'
const TMP_BRIEFS   = '/tmp/briefs.json'
const SEED_CALENDAR = path.join(process.cwd(), 'data', 'calendar.json')
const SEED_BRIEFS   = path.join(process.cwd(), 'data', 'briefs.json')

const PLATFORM_LABEL = {
  linkedin: 'LinkedIn', instagram: 'Instagram',
  x: 'X', facebook: 'Facebook', youtube: 'YouTube',
}

function readCalendar() {
  try { return JSON.parse(fs.readFileSync(TMP_CALENDAR, 'utf-8')) } catch {}
  try { return JSON.parse(fs.readFileSync(SEED_CALENDAR, 'utf-8')) } catch {}
  return []
}
function writeCalendar(data) {
  fs.writeFileSync(TMP_CALENDAR, JSON.stringify(data, null, 2))
}

// Synthesise calendar entries from briefs that don't already have an explicit entry.
function mergedCalendar() {
  const explicit = readCalendar()
  const explicitBriefIds = new Set(explicit.map((e) => String(e.briefId)).filter(Boolean))

  // Read briefs from /tmp first (new submissions), fall back to committed seed
  let briefs = []
  try { briefs = JSON.parse(fs.readFileSync(TMP_BRIEFS, 'utf-8')) } catch {}
  if (briefs.length === 0) {
    try { briefs = JSON.parse(fs.readFileSync(SEED_BRIEFS, 'utf-8')) } catch {}
  }

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
    return res.status(200).json(mergedCalendar())
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
    const calendar = readCalendar()
    calendar.push(entry)
    writeCalendar(calendar)
    return res.status(201).json(entry)
  }

  if (req.method === 'PATCH') {
    const { id, ...updates } = req.body
    if (!id) return res.status(400).json({ error: 'id is required.' })
    const calendar = readCalendar()
    const idx = calendar.findIndex((e) => e.id === id)
    if (idx === -1) {
      // Upsert: synthetic brief entries (id = "brief-{briefId}") aren't stored in
      // calendar.json until first edited. Promote them to explicit entries here.
      const briefId = String(id).startsWith('brief-')
        ? (isNaN(id.replace('brief-', '')) ? id.replace('brief-', '') : Number(id.replace('brief-', '')))
        : null
      const newEntry = {
        id,
        briefId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...updates,
      }
      calendar.push(newEntry)
      writeCalendar(calendar)
      return res.status(200).json(newEntry)
    }
    calendar[idx] = { ...calendar[idx], ...updates, updatedAt: new Date().toISOString() }
    writeCalendar(calendar)
    return res.status(200).json(calendar[idx])
  }

  if (req.method === 'DELETE') {
    const { id } = req.query
    if (!id) return res.status(400).json({ error: 'id is required.' })
    const calendar = readCalendar()
    writeCalendar(calendar.filter((e) => e.id !== id))
    return res.status(200).json({ success: true })
  }

  res.setHeader('Allow', ['GET', 'POST', 'PATCH', 'DELETE'])
  return res.status(405).end('Method Not Allowed')
}
