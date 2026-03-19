/**
 * Storage adapter — provider-agnostic.
 * Switch providers by setting STORAGE_PROVIDER in .env.local:
 *   STORAGE_PROVIDER=local      → saves to /public/uploads (default)
 *   STORAGE_PROVIDER=cloudinary → uses Cloudinary API
 *                                  Add CLOUDINARY_URL to .env.local
 *                                  Run: npm install cloudinary
 */

import fs from 'fs'
import path from 'path'

const provider = process.env.STORAGE_PROVIDER || 'local'

/**
 * Upload a file buffer.
 * @param {Buffer} buffer
 * @param {string} filename
 * @param {string} mimeType
 * @returns {{ url: string, publicId: string }}
 */
export async function uploadFile(buffer, filename, mimeType) {
  if (provider === 'cloudinary') {
    return uploadCloudinary(buffer, filename)
  }
  return uploadLocal(buffer, filename)
}

async function uploadLocal(buffer, filename) {
  // Vercel's filesystem is read-only except for /tmp. Files here are ephemeral
  // (cleared between serverless invocations) — this is fine for local dev and
  // short-lived previews. Switch to Cloudinary for persistent storage:
  //   STORAGE_PROVIDER=cloudinary + CLOUDINARY_URL in .env.local / Vercel env vars.
  const uploadsDir = '/tmp/uploads'
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })

  const ext = path.extname(filename)
  const base = path.basename(filename, ext).replace(/[^a-zA-Z0-9-_]/g, '-')
  const uniqueName = `${Date.now()}-${base}${ext}`
  const filePath = path.join(uploadsDir, uniqueName)

  fs.writeFileSync(filePath, buffer)
  return { url: `/api/media/file/${uniqueName}`, publicId: uniqueName }
}

async function uploadCloudinary(buffer, filename) {
  // cloudinary is an optional dependency — only install when switching to this provider
  let cloudinary
  try {
    cloudinary = require('cloudinary').v2 // eslint-disable-line
  } catch {
    throw new Error(
      'cloudinary package is not installed. Run: npm install cloudinary, then add CLOUDINARY_URL to .env.local'
    )
  }

  cloudinary.config({ secure: true }) // reads CLOUDINARY_URL from env automatically

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { resource_type: 'auto', public_id: `social-hub/${Date.now()}-${path.basename(filename)}` },
      (err, result) => {
        if (err) return reject(err)
        resolve({ url: result.secure_url, publicId: result.public_id })
      }
    )
    stream.end(buffer)
  })
}
