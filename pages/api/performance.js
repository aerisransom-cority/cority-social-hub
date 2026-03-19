import fs from 'fs'
import path from 'path'
import formidable from 'formidable'
import * as XLSX from 'xlsx'
import { getServerSession } from 'next-auth/next'
import { authOptions } from './auth/[...nextauth]'

export const config = { api: { bodyParser: false } }

const TMP_PERF    = '/tmp/performance.json'
const SEED_PERF   = path.join(process.cwd(), 'data', 'performance.json')
const TMP_UTMS    = '/tmp/utms.json'
const SEED_UTMS   = path.join(process.cwd(), 'data', 'utms.json')
const TMP_BRIEFS  = '/tmp/briefs.json'
const SEED_BRIEFS = path.join(process.cwd(), 'data', 'briefs.json')

function readJson(tmp, seed) {
  try { return JSON.parse(fs.readFileSync(tmp, 'utf-8')) } catch {}
  try { return JSON.parse(fs.readFileSync(seed, 'utf-8')) } catch {}
  return []
}

function writePerf(data) {
  fs.writeFileSync(TMP_PERF, JSON.stringify(data, null, 2))
}

// Normalize a header key: lowercase, strip non-alphanumeric (except spaces)
function normalizeKey(k) {
  return String(k).toLowerCase().replace(/[^a-z0-9 ]/g, '').trim()
}

// Build a lookup map from normalized header -> original header
function buildHeaderMap(row) {
  const map = {}
  for (const key of Object.keys(row)) {
    map[normalizeKey(key)] = key
  }
  return map
}

// Find a column value from a row by trying multiple candidate names
function findCol(headerMap, row, ...candidates) {
  for (const c of candidates) {
    const norm = normalizeKey(c)
    if (headerMap[norm] !== undefined) {
      return row[headerMap[norm]]
    }
  }
  return undefined
}

// Parse a number from a value that might have %, $, commas, or '--'
function parseNum(v) {
  if (v === null || v === undefined || v === '' || v === '--' || v === '-') return 0
  if (typeof v === 'number') return v
  const s = String(v).replace(/[$,%]/g, '').replace(/,/g, '').trim()
  if (s === '' || s === '--' || s === '-') return 0
  const n = parseFloat(s)
  return isNaN(n) ? 0 : n
}

// Parse a date value into ISO date string YYYY-MM-DD
function parseDate(v) {
  if (!v) return null
  // Excel serial number
  if (typeof v === 'number') {
    try {
      const d = XLSX.SSF.parse_date_code(v)
      if (d) {
        const month = String(d.m).padStart(2, '0')
        const day = String(d.d).padStart(2, '0')
        return `${d.y}-${month}-${day}`
      }
    } catch {}
  }
  // String date
  const s = String(v).trim()
  if (!s) return null
  const d = new Date(s)
  if (!isNaN(d.getTime())) {
    return d.toISOString().split('T')[0]
  }
  return null
}

function normalizePostType(raw) {
  if (!raw) return 'text'
  const s = String(raw).toLowerCase().trim()
  if (/video|reel|short/.test(s)) return 'video'
  if (/carousel|album|multi/.test(s)) return 'carousel'
  if (/image|photo|picture/.test(s)) return 'image'
  if (/article|document/.test(s)) return 'article'
  return 'text'
}

function normalizeLinkedIn(rows) {
  return rows.map((row) => {
    const hm = buildHeaderMap(row)
    const fc = (...c) => findCol(hm, row, ...c)
    return {
      platform: 'linkedin',
      postDate: parseDate(fc('posted', 'date', 'post date', 'created')),
      postTitle: String(fc('post title', 'title', 'content', 'text') || '').slice(0, 200),
      postUrl: String(fc('post url', 'url', 'link', 'permalink') || ''),
      postType: normalizePostType(fc('post type', 'type', 'content type')),
      impressions: parseNum(fc('impressions', 'total impressions')),
      reach: 0,
      likes: parseNum(fc('reactions', 'likes', 'total reactions')),
      comments: parseNum(fc('comments', 'total comments')),
      shares: parseNum(fc('reposts', 'shares', 'total reposts')),
      saves: 0,
      clicks: parseNum(fc('clicks', 'link clicks', 'total clicks')),
      engagements: 0,
      engagementRate: parseNum(fc('engagement rate', 'engagement rate (%)')),
      retweets: 0,
      followerGrowth: parseNum(fc('follows', 'follower growth', 'new followers')),
      ctr: 0,
      avgViewDuration: 0,
    }
  })
}

function normalizeInstagram(rows) {
  return rows.map((row) => {
    const hm = buildHeaderMap(row)
    const fc = (...c) => findCol(hm, row, ...c)
    return {
      platform: 'instagram',
      postDate: parseDate(fc('date', 'post date', 'created', 'published')),
      postTitle: String(fc('description', 'caption', 'title', 'content') || '').slice(0, 200),
      postUrl: String(fc('post url', 'url', 'link', 'permalink') || ''),
      postType: normalizePostType(fc('post type', 'type', 'content type', 'media type')),
      impressions: parseNum(fc('impressions', 'total impressions')),
      reach: parseNum(fc('reach', 'accounts reached')),
      likes: parseNum(fc('likes', 'reactions')),
      comments: parseNum(fc('comments')),
      shares: parseNum(fc('shares')),
      saves: parseNum(fc('saves', 'saved')),
      clicks: parseNum(fc('profile visits', 'link clicks', 'website clicks')),
      engagements: 0,
      engagementRate: 0,
      retweets: 0,
      followerGrowth: 0,
      ctr: 0,
      avgViewDuration: 0,
    }
  })
}

function normalizeFacebook(rows) {
  return rows.map((row) => {
    const hm = buildHeaderMap(row)
    const fc = (...c) => findCol(hm, row, ...c)
    return {
      platform: 'facebook',
      postDate: parseDate(fc('date', 'post date', 'created', 'published at')),
      postTitle: String(fc('title', 'message', 'content', 'description') || '').slice(0, 200),
      postUrl: String(fc('url', 'permalink', 'post url') || ''),
      postType: normalizePostType(fc('post type', 'type', 'content type')),
      impressions: parseNum(fc('impressions', 'total impressions', 'post impressions')),
      reach: parseNum(fc('reach', 'total reach', 'post reach', 'accounts reached')),
      likes: parseNum(fc('reactions', 'likes', 'total reactions')),
      comments: parseNum(fc('comments', 'total comments')),
      shares: parseNum(fc('shares', 'total shares')),
      saves: 0,
      clicks: parseNum(fc('clicks', 'link clicks', 'total clicks', 'post clicks')),
      engagements: 0,
      engagementRate: 0,
      retweets: 0,
      followerGrowth: 0,
      ctr: 0,
      avgViewDuration: 0,
    }
  })
}

function normalizeX(rows) {
  return rows.map((row) => {
    const hm = buildHeaderMap(row)
    const fc = (...c) => findCol(hm, row, ...c)
    return {
      platform: 'x',
      postDate: parseDate(fc('date', 'tweet date', 'time', 'created at')),
      postTitle: String(fc('tweet text', 'text', 'content') || '').slice(0, 280),
      postUrl: String(fc('permalink', 'tweet permalink', 'url') || ''),
      postType: 'text',
      impressions: parseNum(fc('impressions', 'tweet impressions')),
      reach: 0,
      likes: parseNum(fc('likes', 'favorites')),
      comments: parseNum(fc('replies')),
      shares: 0,
      saves: 0,
      clicks: parseNum(fc('url clicks', 'link clicks', 'user profile clicks')),
      engagements: parseNum(fc('engagements', 'total engagements')),
      engagementRate: 0,
      retweets: parseNum(fc('retweets', 'reposts')),
      followerGrowth: 0,
      ctr: 0,
      avgViewDuration: 0,
    }
  })
}

function normalizeYouTube(rows) {
  return rows.map((row) => {
    const hm = buildHeaderMap(row)
    const fc = (...c) => findCol(hm, row, ...c)
    const views = parseNum(fc('views', 'video views'))
    return {
      platform: 'youtube',
      postDate: parseDate(fc('date', 'video published at', 'publish time', 'day')),
      postTitle: String(fc('video title', 'title', 'content', 'video') || '').slice(0, 200),
      postUrl: String(fc('video url', 'url', 'link') || ''),
      postType: 'video',
      impressions: parseNum(fc('impressions', 'views')) || views,
      reach: 0,
      likes: parseNum(fc('likes')),
      comments: parseNum(fc('comments')),
      shares: 0,
      saves: 0,
      clicks: 0,
      engagements: 0,
      engagementRate: 0,
      retweets: 0,
      followerGrowth: parseNum(fc('subscribers gained', 'net subscribers', 'subscribers')),
      ctr: parseNum(fc('impressions click-through rate', 'ctr', 'click-through rate', 'impressions ctr')),
      avgViewDuration: parseNum(fc('average view duration', 'avg view duration', 'average view duration (seconds)')),
    }
  })
}

function normalizeRows(platform, rows) {
  const p = platform.toLowerCase()
  let normalized
  if (p === 'linkedin')   normalized = normalizeLinkedIn(rows)
  else if (p === 'instagram') normalized = normalizeInstagram(rows)
  else if (p === 'facebook')  normalized = normalizeFacebook(rows)
  else if (p === 'x')         normalized = normalizeX(rows)
  else if (p === 'youtube')   normalized = normalizeYouTube(rows)
  else return []

  // Skip rows where all key numeric fields are 0 or empty (likely header/empty rows)
  return normalized.filter((r) => {
    const nums = [r.impressions, r.reach, r.likes, r.comments, r.shares, r.clicks, r.engagements]
    return nums.some((n) => n > 0) || (r.postDate && r.postTitle)
  })
}

// Extract utm_campaign from a URL string
function extractUtmCampaign(url) {
  if (!url) return null
  try {
    const u = new URL(url)
    return u.searchParams.get('utm_campaign') || null
  } catch {
    // Try manual parse
    const m = url.match(/[?&]utm_campaign=([^&]+)/i)
    return m ? decodeURIComponent(m[1]) : null
  }
}

// Match a performance record to UTMs
function matchUtm(record, utms, briefs) {
  let matchedUtmId = null
  let matchedCampaign = null
  let matchedBriefId = null
  let attributed = false

  // 1. URL-based match — extract utm_campaign from postUrl
  const campaignFromUrl = extractUtmCampaign(record.postUrl)
  if (campaignFromUrl) {
    const utm = utms.find(
      (u) =>
        u.campaign &&
        u.campaign.toLowerCase() === campaignFromUrl.toLowerCase() &&
        (!u.source || u.source.toLowerCase() === record.platform.toLowerCase() || record.platform === 'x' && u.source.toLowerCase() === 'twitter')
    )
    if (utm) {
      matchedUtmId = utm.id
      matchedCampaign = utm.campaign
      matchedBriefId = utm.briefId || null
      attributed = true
    } else {
      matchedCampaign = campaignFromUrl
      attributed = false
    }
  }

  // 2. Fallback: same-platform date proximity match (within 7 days)
  if (!matchedUtmId && record.postDate) {
    const postTime = new Date(record.postDate).getTime()
    const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000
    const candidate = utms.find((u) => {
      if (!u.date) return false
      const utmPlatform = u.source?.toLowerCase()
      const recPlatform = record.platform.toLowerCase()
      const platformMatch =
        utmPlatform === recPlatform ||
        (recPlatform === 'x' && utmPlatform === 'twitter') ||
        (recPlatform === 'twitter' && utmPlatform === 'x')
      if (!platformMatch) return false
      const utmTime = new Date(u.date).getTime()
      return Math.abs(postTime - utmTime) <= SEVEN_DAYS
    })
    if (candidate) {
      matchedUtmId = candidate.id
      matchedCampaign = candidate.campaign
      matchedBriefId = candidate.briefId || null
      attributed = true
    }
  }

  // 3. Try to find brief from matchedBriefId
  if (matchedBriefId && briefs) {
    const brief = briefs.find((b) => String(b.id) === String(matchedBriefId))
    if (!brief) matchedBriefId = null
  }

  return { matchedUtmId, matchedCampaign, matchedBriefId, attributed }
}

// Check if an incoming record is a duplicate of an existing one
function isDuplicate(incoming, existing) {
  if (incoming.platform !== existing.platform) return false
  if (incoming.postDate && existing.postDate && incoming.postDate !== existing.postDate) return false
  // URL match is definitive (if both have one)
  if (incoming.postUrl && existing.postUrl && incoming.postUrl.trim() && existing.postUrl.trim()) {
    return incoming.postUrl.trim() === existing.postUrl.trim()
  }
  // Title match as fallback — first 60 chars, case-insensitive
  if (incoming.postTitle && existing.postTitle) {
    const a = incoming.postTitle.slice(0, 60).toLowerCase().trim()
    const b = existing.postTitle.slice(0, 60).toLowerCase().trim()
    if (a.length > 5 && a === b) return true
  }
  return false
}

function computeEngagementRate(record) {
  // For platforms that have explicit engagement rate, use it
  if (record.engagementRate > 0) return record.engagementRate
  // For X, use engagements/impressions
  if (record.platform === 'x' && record.engagements > 0 && record.impressions > 0) {
    return (record.engagements / record.impressions) * 100
  }
  // Generic: (likes + comments + shares + saves + clicks) / impressions * 100
  const base = record.reach > 0 ? record.reach : record.impressions
  if (base <= 0) return 0
  const interactions = (record.likes || 0) + (record.comments || 0) + (record.shares || 0) + (record.saves || 0)
  return (interactions / base) * 100
}

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions)
  if (!session) return res.status(401).json({ error: 'Unauthorized' })

  // GET — return filtered records
  if (req.method === 'GET') {
    const records = readJson(TMP_PERF, SEED_PERF)
    const { platform, dateFrom, dateTo, type } = req.query
    let filtered = records
    if (platform) filtered = filtered.filter((r) => r.platform === platform.toLowerCase())
    if (type)     filtered = filtered.filter((r) => r.postType === type.toLowerCase())
    if (dateFrom) filtered = filtered.filter((r) => r.postDate && r.postDate >= dateFrom)
    if (dateTo)   filtered = filtered.filter((r) => r.postDate && r.postDate <= dateTo)
    return res.status(200).json(filtered)
  }

  // DELETE — clear all records
  if (req.method === 'DELETE') {
    writePerf([])
    return res.status(200).json({ cleared: true })
  }

  // POST — parse multipart upload, normalize, match UTMs, save (with duplicate handling)
  // Phase 1 (no mode field): parse, detect duplicates, return conflict info without saving.
  // Phase 2 (mode=override or mode=skip): re-upload same file with user's choice, then save.
  if (req.method === 'POST') {
    const form = formidable({ keepExtensions: true, maxFileSize: 20 * 1024 * 1024 })
    let fields, files
    try {
      ;[fields, files] = await form.parse(req)
    } catch (err) {
      return res.status(400).json({ error: 'Failed to parse upload: ' + err.message })
    }

    const platform = Array.isArray(fields.platform) ? fields.platform[0] : fields.platform
    const file     = Array.isArray(files.file)      ? files.file[0]      : files.file
    const mode     = Array.isArray(fields.mode)     ? fields.mode[0]     : (fields.mode || '')

    if (!platform) return res.status(400).json({ error: 'platform field is required' })
    if (!file)     return res.status(400).json({ error: 'file field is required' })

    let workbook
    try {
      workbook = XLSX.readFile(file.filepath)
    } catch (err) {
      return res.status(400).json({ error: 'Could not read XLSX file: ' + err.message })
    }

    const sheetName = workbook.SheetNames[0]
    const rows      = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' })

    if (!rows.length) return res.status(400).json({ error: 'XLSX file is empty or has no data rows.' })

    const utms   = readJson(TMP_UTMS, SEED_UTMS)
    const briefs = readJson(TMP_BRIEFS, SEED_BRIEFS)

    const normalized = normalizeRows(platform, rows)
    const importedAt = new Date().toISOString()

    let matched = 0
    const enriched = normalized.map((record) => {
      const { matchedUtmId, matchedCampaign, matchedBriefId, attributed } = matchUtm(record, utms, briefs)
      if (attributed) matched++
      const engagementRate = computeEngagementRate({ ...record, matchedUtmId, matchedCampaign })
      return {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        importedAt,
        ...record,
        engagementRate,
        matchedUtmId,
        matchedCampaign,
        matchedBriefId,
        attributed,
      }
    })

    const existing = readJson(TMP_PERF, SEED_PERF)

    // Phase 1: no mode — detect duplicates, do not save
    if (!mode) {
      const duplicateCount = enriched.filter((inc) => existing.some((ex) => isDuplicate(inc, ex))).length
      if (duplicateCount > 0) {
        return res.status(200).json({
          hasDuplicates: true,
          duplicateCount,
          newCount: enriched.length - duplicateCount,
          totalIncoming: enriched.length,
        })
      }
      // No duplicates — save immediately
      const combined = [...existing, ...enriched]
      writePerf(combined)
      return res.status(200).json({
        imported: enriched.length,
        matched,
        total: combined.length,
        duplicatesSkipped: 0,
        duplicatesOverridden: 0,
      })
    }

    // Phase 2a: override — replace existing duplicates, import all incoming
    if (mode === 'override') {
      let overridden = 0
      const notReplaced = existing.filter((ex) => {
        const isdup = enriched.some((inc) => isDuplicate(inc, ex))
        if (isdup) overridden++
        return !isdup
      })
      const combined = [...notReplaced, ...enriched]
      writePerf(combined)
      return res.status(200).json({
        imported: enriched.length,
        matched,
        total: combined.length,
        duplicatesSkipped: 0,
        duplicatesOverridden: overridden,
      })
    }

    // Phase 2b: skip — import only records that are not duplicates
    if (mode === 'skip') {
      let skipped = 0
      const newOnly = enriched.filter((inc) => {
        const isdup = existing.some((ex) => isDuplicate(inc, ex))
        if (isdup) skipped++
        return !isdup
      })
      const combined = [...existing, ...newOnly]
      writePerf(combined)
      return res.status(200).json({
        imported: newOnly.length,
        matched: newOnly.filter((r) => r.attributed).length,
        total: combined.length,
        duplicatesSkipped: skipped,
        duplicatesOverridden: 0,
      })
    }

    return res.status(400).json({ error: `Unknown mode: ${mode}` })
  }

  res.setHeader('Allow', ['GET', 'POST', 'DELETE'])
  return res.status(405).end('Method Not Allowed')
}
