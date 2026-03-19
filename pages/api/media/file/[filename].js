import fs from 'fs'
import path from 'path'

// Serves files from /tmp/uploads (local storage provider).
// Cloudinary serves files directly via CDN — this route is only used when
// STORAGE_PROVIDER=local (the default).
export default function handler(req, res) {
  const { filename } = req.query
  // Prevent path traversal
  const safe = path.basename(filename)
  const filePath = path.join('/tmp/uploads', safe)

  if (!fs.existsSync(filePath)) {
    return res.status(404).end('Not found')
  }

  const ext = path.extname(safe).toLowerCase()
  const mimeTypes = {
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
    '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  }
  const contentType = mimeTypes[ext] || 'application/octet-stream'

  res.setHeader('Content-Type', contentType)
  res.setHeader('Cache-Control', 'public, max-age=3600')
  fs.createReadStream(filePath).pipe(res)
}
