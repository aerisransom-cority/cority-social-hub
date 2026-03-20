import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import { kvGet, kvSet } from '../../../lib/kv'

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions)
  if (!session || session.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin only' })
  }

  // GET — list all documents from the index
  if (req.method === 'GET') {
    const index = await kvGet('kb-index', null)
    return res.status(200).json(Array.isArray(index) ? index : [])
  }

  // DELETE — remove a document and all its chunks
  if (req.method === 'DELETE') {
    const { id } = req.body
    if (!id) return res.status(400).json({ error: 'id is required' })

    const index = await kvGet('kb-index', null) || []
    const exists = index.some((d) => d.id === id)
    if (!exists) return res.status(404).json({ error: 'Document not found' })

    // Remove chunks key and update index
    await kvSet(`kb-chunks-${id}`, null)
    const updated = index.filter((d) => d.id !== id)
    await kvSet('kb-index', updated)

    return res.status(200).json({ ok: true })
  }

  res.setHeader('Allow', ['GET', 'DELETE'])
  return res.status(405).end('Method Not Allowed')
}
