import formidable from 'formidable'
import fs from 'fs'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import { kvGet, kvSet } from '../../../lib/kv'
import { chunkText } from '../../../lib/knowledge'

export const config = { api: { bodyParser: false } }

const VALID_TYPES = ['customer-story', 'product-portfolio', 'roadmap', 'playbook', 'strategy', 'other']
const CHUNK_WARNING_THRESHOLD = 500

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed')

  const session = await getServerSession(req, res, authOptions)
  if (!session || session.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin only' })
  }

  const form = formidable({ maxFileSize: 50 * 1024 * 1024 })

  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(400).json({ error: 'File parse error: ' + err.message })

    const file = Array.isArray(files.file) ? files.file[0] : files.file
    if (!file) return res.status(400).json({ error: 'No file provided.' })

    const get = (f) => (Array.isArray(f) ? f[0] : f)
    const docType = get(fields.docType) || 'other'
    const docName = (get(fields.docName) || file.originalFilename || 'Untitled').trim()

    if (!VALID_TYPES.includes(docType)) {
      return res.status(400).json({ error: 'Invalid document type.' })
    }

    try {
      const buffer = fs.readFileSync(file.filepath)
      let text = ''

      const mimeType = file.mimetype || ''
      const isPdf = mimeType === 'application/pdf' || file.originalFilename?.toLowerCase().endsWith('.pdf')

      if (isPdf) {
        // pdf-parse is marked as a webpack external in next.config.js so it is
        // required at runtime rather than bundled — safe on Vercel serverless.
        const pdfParse = require('pdf-parse')
        const parsed = await pdfParse(buffer)
        text = parsed.text
      } else {
        text = buffer.toString('utf-8')
      }

      if (!text || text.trim().length < 50) {
        return res.status(400).json({
          error: 'Could not extract text from this file. If it is a scanned PDF (image-based), text extraction is not supported — try a text-based PDF or paste content as a .txt file.',
        })
      }

      const chunks = chunkText(text)
      if (!chunks.length) {
        return res.status(400).json({ error: 'No usable content could be extracted from this file.' })
      }

      const docId = Date.now().toString()
      const uploadDate = new Date().toISOString()

      const chunkObjects = chunks.map((chunkText, i) => ({
        chunkIndex: i,
        text: chunkText,
        docId,
        docName,
        docType,
        uploadDate,
      }))

      // Store chunks + update index
      await kvSet(`kb-chunks-${docId}`, chunkObjects)

      const index = await kvGet('kb-index', null) || []
      index.unshift({ id: docId, name: docName, type: docType, uploadDate, chunkCount: chunks.length })
      await kvSet('kb-index', index)

      // Storage health check
      const totalChunks = index.reduce((sum, d) => sum + (d.chunkCount || 0), 0)
      const warning = totalChunks > CHUNK_WARNING_THRESHOLD
        ? `Storage note: ${totalChunks} total chunks indexed. Consider removing older documents to keep storage healthy.`
        : null

      return res.status(201).json({ docId, docName, docType, uploadDate, chunkCount: chunks.length, totalChunks, warning })
    } catch (uploadErr) {
      console.error('[kb/upload]', uploadErr)
      return res.status(500).json({ error: uploadErr.message || 'Upload failed.' })
    }
  })
}
