import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import { kvGet } from '../../../lib/kv'
import { scoreChunks } from '../../../lib/knowledge'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end('Method Not Allowed')

  const session = await getServerSession(req, res, authOptions)
  if (!session || session.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin only' })
  }

  const { q, type } = req.query
  if (!q?.trim()) return res.status(400).json({ error: 'q is required' })

  try {
    const index = await kvGet('kb-index', null)
    if (!Array.isArray(index) || index.length === 0) {
      return res.status(200).json({ results: [], totalChunks: 0 })
    }

    // Filter index by document type if requested
    const filteredIndex = type ? index.filter((d) => d.type === type) : index

    const chunkArrays = await Promise.all(
      filteredIndex.map((doc) => kvGet(`kb-chunks-${doc.id}`, null).catch(() => []))
    )
    const allChunks = chunkArrays.flat().filter((c) => c && c.text)

    const results = scoreChunks(allChunks, q, 5)

    return res.status(200).json({ results, totalChunks: allChunks.length })
  } catch (err) {
    console.error('[kb/search]', err)
    return res.status(500).json({ error: err.message })
  }
}
