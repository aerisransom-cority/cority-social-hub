import { getServerSession } from 'next-auth/next'
import { authOptions } from './auth/[...nextauth]'
import { kvGet, kvSet } from '../../lib/kv'
import path from 'path'

const SEED = path.join(process.cwd(), 'data', 'utms.json')

function toCSV(utms) {
  const headers = ['Date Created', 'Base URL', 'Source', 'Medium', 'Campaign', 'Content', 'Term', 'Brief ID', 'Full UTM URL']
  const escape = (v) => {
    const s = String(v ?? '')
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const rows = utms.map((u) => [
    u.date, u.baseUrl, u.source, u.medium, u.campaign,
    u.content, u.term ?? '', u.briefId ?? '', u.fullUrl,
  ].map(escape).join(','))
  return [headers.map(escape).join(','), ...rows].join('\n')
}

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions)
  if (!session) return res.status(401).json({ error: 'Unauthorized' })

  if (req.method === 'GET') {
    const utms = await kvGet('utms', SEED)
    if (req.query.export === 'csv') {
      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', 'attachment; filename="utms.csv"')
      return res.status(200).send(toCSV(utms))
    }
    return res.status(200).json(utms)
  }

  if (req.method === 'POST') {
    const { baseUrl, source, medium, campaign, content, term, briefId, fullUrl } = req.body
    if (!baseUrl || !source || !medium || !campaign || !content) {
      return res.status(400).json({ error: 'baseUrl, source, medium, campaign, and content are required.' })
    }
    const entry = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      baseUrl, source, medium, campaign, content,
      term: term || null,
      briefId: briefId || null,
      fullUrl: fullUrl || baseUrl,
    }
    const utms = await kvGet('utms', SEED)
    utms.unshift(entry)
    await kvSet('utms', utms)
    return res.status(201).json(entry)
  }

  res.setHeader('Allow', ['GET', 'POST'])
  return res.status(405).end('Method Not Allowed')
}
