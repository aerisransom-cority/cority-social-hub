import formidable from 'formidable'
import * as XLSX from 'xlsx'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'

export const config = { api: { bodyParser: false } }

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions)
  if (!session) return res.status(401).json({ error: 'Unauthorized' })

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).end('Method Not Allowed')
  }

  const form = formidable({ keepExtensions: true, maxFileSize: 20 * 1024 * 1024 })
  let files
  try {
    ;[, files] = await form.parse(req)
  } catch (err) {
    return res.status(400).json({ error: 'Failed to parse upload: ' + err.message })
  }

  const file = Array.isArray(files.file) ? files.file[0] : files.file
  if (!file) return res.status(400).json({ error: 'No file uploaded. Use field name "file".' })

  let workbook
  try {
    workbook = XLSX.readFile(file.filepath)
  } catch (err) {
    return res.status(400).json({ error: 'Could not read file: ' + err.message })
  }

  const result = {
    sheetNames: workbook.SheetNames,
    sheets: {},
  }

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' })

    const headers = rows.length > 0 ? Object.keys(rows[0]) : []
    const sample = rows.slice(0, 2)

    result.sheets[sheetName] = {
      rowCount: rows.length,
      headers,
      sampleRows: sample,
    }
  }

  return res.status(200).json(result)
}
