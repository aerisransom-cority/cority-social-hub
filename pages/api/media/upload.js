import formidable from 'formidable'
import fs from 'fs'
import path from 'path'
import { uploadFile } from '../../../lib/storage'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'

export const config = { api: { bodyParser: false } }

const MEDIA_INDEX_PATH = path.join(process.cwd(), 'data', 'media-index.json')

function readIndex() {
  try { return JSON.parse(fs.readFileSync(MEDIA_INDEX_PATH, 'utf-8')) } catch { return [] }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed')

  const session = await getServerSession(req, res, authOptions)
  if (!session) return res.status(401).json({ error: 'Unauthorized' })

  const form = formidable({ maxFileSize: 20 * 1024 * 1024 }) // 20MB limit

  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(400).json({ error: 'File parse error: ' + err.message })

    const file = Array.isArray(files.file) ? files.file[0] : files.file
    if (!file) return res.status(400).json({ error: 'No file provided.' })

    const buffer = fs.readFileSync(file.filepath)
    const filename = file.originalFilename || 'upload'
    const mimeType = file.mimetype || 'application/octet-stream'

    try {
      const { url, publicId } = await uploadFile(buffer, filename, mimeType)

      // Parse tags from fields (formidable sends arrays or strings)
      const get = (f) => (Array.isArray(f) ? f[0] : f) || null

      const asset = {
        id: Date.now().toString(),
        uploadedAt: new Date().toISOString(),
        filename,
        mimeType,
        url,
        publicId,
        type: mimeType.startsWith('video/') ? 'video' : 'photo',
        tags: {
          cloud: get(fields.cloud),
          campaign: get(fields.campaign),
          contentType: get(fields.contentType),
          platformSuitability: get(fields.platformSuitability),
          eventName: get(fields.eventName),
          peopleFeatured: get(fields.peopleFeatured),
        },
        source: get(fields.source),
        usedInBriefs: [],
      }

      const index = readIndex()
      index.unshift(asset)
      fs.writeFileSync(MEDIA_INDEX_PATH, JSON.stringify(index, null, 2))

      return res.status(201).json(asset)
    } catch (uploadErr) {
      console.error('Upload error:', uploadErr)
      return res.status(500).json({ error: uploadErr.message || 'Upload failed.' })
    }
  })
}
