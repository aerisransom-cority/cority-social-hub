import fs from 'fs'
import path from 'path'

const DATA_PATH = path.join(process.cwd(), 'data', 'brand-settings.json')

export default function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const raw = fs.readFileSync(DATA_PATH, 'utf-8')
      return res.status(200).json(JSON.parse(raw))
    } catch (err) {
      return res.status(500).json({ error: 'Failed to read brand settings.' })
    }
  }

  if (req.method === 'POST') {
    try {
      const data = req.body
      fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8')
      return res.status(200).json({ success: true })
    } catch (err) {
      return res.status(500).json({ error: 'Failed to save brand settings.' })
    }
  }

  res.setHeader('Allow', ['GET', 'POST'])
  return res.status(405).end(`Method ${req.method} Not Allowed`)
}
