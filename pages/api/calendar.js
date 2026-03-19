import fs from 'fs'
import path from 'path'
import { getServerSession } from 'next-auth/next'
import { authOptions } from './auth/[...nextauth]'

const CALENDAR_PATH = path.join(process.cwd(), 'data', 'calendar.json')

function readCalendar() {
  try { return JSON.parse(fs.readFileSync(CALENDAR_PATH, 'utf-8')) } catch { return [] }
}
function writeCalendar(data) {
  const dir = path.dirname(CALENDAR_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(CALENDAR_PATH, JSON.stringify(data, null, 2))
}

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions)
  if (!session) return res.status(401).json({ error: 'Unauthorized' })

  if (req.method === 'GET') {
    return res.status(200).json(readCalendar())
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
    if (idx === -1) return res.status(404).json({ error: 'Entry not found.' })
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
