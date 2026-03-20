import path from 'path'
import Anthropic from '@anthropic-ai/sdk'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import { kvGet, kvSet } from '../../../lib/kv'
import { searchKnowledge } from '../../../lib/knowledge'
import { readBrandSettings } from '../../../lib/brand'
import { buildPrompt } from '../../../lib/promptBuilder'

const BRIEFS_SEED = path.join(process.cwd(), 'data', 'briefs.json')
const PERF_SEED   = path.join(process.cwd(), 'data', 'performance.json')
const CACHE_TTL_MS = 24 * 60 * 60 * 1000

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions)
  if (!session) return res.status(401).json({ error: 'Unauthorized' })

  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', ['GET', 'POST'])
    return res.status(405).end('Method Not Allowed')
  }

  // GET: return cached batch if < 24h old
  if (req.method === 'GET') {
    const cached = await kvGet('suggestions', null)
    if (cached && cached.batch && cached.generatedAt) {
      const age = Date.now() - new Date(cached.generatedAt).getTime()
      if (age < CACHE_TTL_MS) return res.status(200).json(cached)
    }
    // Fall through to generate fresh
  }

  try {
    const brand = await readBrandSettings()
    const [briefs, performance, dismissed] = await Promise.all([
      kvGet('briefs', BRIEFS_SEED),
      kvGet('performance', PERF_SEED),
      kvGet('dismissed-suggestions', null),
    ])

    const hasPerformanceData = Array.isArray(performance) && performance.length > 0

    // Recent briefs (last 30 days) for pillar coverage + recency context
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
    const recentBriefs = Array.isArray(briefs)
      ? briefs.filter((b) => new Date(b.createdAt || 0).getTime() > thirtyDaysAgo)
      : []
    const last10Titles = recentBriefs.slice(0, 10).map((b) => b.description?.slice(0, 80)).filter(Boolean)

    // Pillar coverage analysis
    const themes = (brand.storytellingThemes || []).map((t) => t.theme)
    const pillarCounts = Object.fromEntries(themes.map((t) => [t, 0]))
    recentBriefs.forEach((b) => { if (b.pillar && pillarCounts[b.pillar] !== undefined) pillarCounts[b.pillar]++ })
    const underrepresented = Object.entries(pillarCounts)
      .sort((a, b) => a[1] - b[1])
      .slice(0, 3)
      .map(([theme]) => theme)

    // Performance insights
    let perfInsights = ''
    if (hasPerformanceData) {
      const byType = {}
      performance.forEach((p) => {
        if (!p.contentType) return
        if (!byType[p.contentType]) byType[p.contentType] = { count: 0, total: 0 }
        byType[p.contentType].count++
        byType[p.contentType].total += parseFloat(p.engagementRate) || 0
      })
      const topTypes = Object.entries(byType)
        .map(([type, d]) => ({ type, avg: d.total / d.count }))
        .sort((a, b) => b.avg - a.avg)
        .slice(0, 3)
        .map((t) => `${t.type} (avg ${t.avg.toFixed(1)}% engagement)`)
      if (topTypes.length) perfInsights = `\nTop performing content types from uploaded data: ${topTypes.join(', ')}.`
    }

    // Recently dismissed
    const recentDismissed = Array.isArray(dismissed)
      ? dismissed.slice(0, 30).map((d) => d.angle || d.id).filter(Boolean)
      : []

    // Knowledge base — fetch chunks relevant to underrepresented pillars
    const kbQuery = underrepresented.join(' ')
    const kbChunks = await searchKnowledge(kbQuery, 3)

    // Build prompt via central builder
    const { systemPrompt } = buildPrompt({
      type: 'suggestions',
      query: kbQuery,
      brandSettings: brand,
      knowledgeChunks: kbChunks,
    })

    // Active campaign IDs — derived dynamically from brand settings
    const activeCampaignIds = (brand.activeCampaigns || [])
      .filter((c) => c.active !== false)
      .map((c) => `"${c.id}"`)
      .join(', ')

    const userPrompt = `Generate exactly 5 proactive post suggestion objects for Cority's social media calendar.

CONTENT PILLAR COVERAGE — last 30 days (prioritise underrepresented pillars):
Underrepresented pillars: ${underrepresented.join(', ') || 'none identified yet'}${perfInsights}

RECENT BRIEF HISTORY (avoid repetition):
${last10Titles.length > 0 ? last10Titles.map((t, i) => `${i + 1}. ${t}`).join('\n') : 'No recent briefs.'}

RECENTLY DISMISSED (do not resurface):
${recentDismissed.length > 0 ? recentDismissed.join('\n') : 'None.'}

Return a JSON array of exactly 5 suggestion objects. No markdown fences, no explanation — raw JSON only.
Each object must have exactly these keys:
- "contentType": string (e.g. "carousel", "video", "meme", "text post", "infographic", "short-form video")
- "platforms": string[] using only: "linkedin", "instagram", "x", "facebook", "youtube"
- "pillar": string (exact match to one of the storytelling themes in brand context)
- "rationale": string (one sentence: why this is timely or strategic right now)
- "suggestedAngle": string (a specific, actionable content angle — 1-2 sentences)
- "targetAudience": string (specific persona, e.g. "EHS managers in manufacturing")
- "suggestedCampaign": string (one of the active campaign IDs: ${activeCampaignIds})

Rules: prioritise underrepresented pillars, lean toward high-performing formats, do not suggest anything similar to recent brief history or dismissed suggestions, never generic.`

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1800,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    let text = response.content[0].text.trim()
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()

    const rawBatch = JSON.parse(text)
    const batch = rawBatch.map((s, i) => ({ ...s, id: `${Date.now()}-${i}` }))

    const result = { batch, generatedAt: new Date().toISOString(), hasPerformanceData }
    await kvSet('suggestions', result)
    return res.status(200).json(result)
  } catch (err) {
    console.error('[suggestions/generate]', err)
    return res.status(500).json({ error: err.message })
  }
}
