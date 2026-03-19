import fs from 'fs'
import path from 'path'
import Anthropic from '@anthropic-ai/sdk'
import { getServerSession } from 'next-auth/next'
import { authOptions } from './auth/[...nextauth]'

const TMP_BRAND  = '/tmp/brand-settings.json'
const SEED_BRAND = path.join(process.cwd(), 'data', 'brand-settings.json')

function readBrandSettings() {
  try { return JSON.parse(fs.readFileSync(TMP_BRAND, 'utf-8')) } catch {}
  try { return JSON.parse(fs.readFileSync(SEED_BRAND, 'utf-8')) } catch {}
  return { aiSystemPrompt: '' }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end('Method Not Allowed')
  }

  const session = await getServerSession(req, res, authOptions)
  if (!session) return res.status(401).json({ error: 'Unauthorized' })

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY is not set.' })
  }

  const { records } = req.body
  if (!records || !Array.isArray(records) || records.length === 0) {
    return res.status(400).json({ error: 'records array is required and must not be empty.' })
  }

  const brandSettings = readBrandSettings()

  // Build a summary of the data
  const totalImpressions = records.reduce((s, r) => s + (r.impressions || 0), 0)
  const totalReach       = records.reduce((s, r) => s + (r.reach || 0), 0)
  const totalLikes       = records.reduce((s, r) => s + (r.likes || 0), 0)
  const totalComments    = records.reduce((s, r) => s + (r.comments || 0), 0)
  const totalShares      = records.reduce((s, r) => s + (r.shares || 0), 0)

  // Avg engagement rate by platform
  const byPlatform = {}
  for (const r of records) {
    if (!byPlatform[r.platform]) byPlatform[r.platform] = []
    byPlatform[r.platform].push(r.engagementRate || 0)
  }
  const avgEngByPlatform = {}
  for (const [plat, rates] of Object.entries(byPlatform)) {
    const avg = rates.reduce((s, v) => s + v, 0) / rates.length
    avgEngByPlatform[plat] = Math.round(avg * 100) / 100
  }

  // Top 3 posts by engagement rate
  const sorted = [...records].sort((a, b) => (b.engagementRate || 0) - (a.engagementRate || 0))
  const top3 = sorted.slice(0, 3).map((r) => ({
    platform: r.platform,
    title: r.postTitle?.slice(0, 80) || '(no title)',
    date: r.postDate,
    type: r.postType,
    engagementRate: r.engagementRate,
    impressions: r.impressions,
  }))

  // Content type breakdown
  const byType = {}
  for (const r of records) {
    const t = r.postType || 'text'
    if (!byType[t]) byType[t] = { count: 0, totalEngRate: 0 }
    byType[t].count++
    byType[t].totalEngRate += r.engagementRate || 0
  }
  const typeBreakdown = Object.entries(byType).map(([type, data]) => ({
    type,
    count: data.count,
    avgEngRate: Math.round((data.totalEngRate / data.count) * 100) / 100,
  }))

  const summary = {
    totalRecords: records.length,
    totalImpressions,
    totalReach,
    totalLikes,
    totalComments,
    totalShares,
    avgEngagementRateByPlatform: avgEngByPlatform,
    top3Posts: top3,
    contentTypeBreakdown: typeBreakdown,
    dateRange: {
      from: records.map((r) => r.postDate).filter(Boolean).sort()[0] || null,
      to:   records.map((r) => r.postDate).filter(Boolean).sort().slice(-1)[0] || null,
    },
  }

  const userPrompt = `Analyze this social media performance data and return ONLY valid JSON.

Performance summary:
${JSON.stringify(summary, null, 2)}

Provide 3–5 specific, actionable insights about what this data tells us, and 1 concrete recommended action the social media manager should take next.

Return ONLY this JSON structure, no markdown, no explanation:
{"insights": ["insight 1", "insight 2", "insight 3"], "recommendation": "one specific recommended action"}`

  const systemPrompt = [
    brandSettings.aiSystemPrompt || '',
    'You are analyzing social media performance data. Return ONLY valid JSON: {"insights": ["...", "...", "..."], "recommendation": "..."}',
  ]
    .filter(Boolean)
    .join('\n\n')

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const rawText = message.content[0].text.trim()
    const jsonText = rawText.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim()
    const parsed = JSON.parse(jsonText)

    return res.status(200).json({
      insights: Array.isArray(parsed.insights) ? parsed.insights : [],
      recommendation: parsed.recommendation || '',
    })
  } catch (err) {
    console.error('Performance insights error:', err)
    if (err instanceof SyntaxError) {
      return res.status(500).json({ error: 'AI returned unexpected format. Try again.' })
    }
    return res.status(500).json({ error: err.message || 'Failed to generate insights.' })
  }
}
