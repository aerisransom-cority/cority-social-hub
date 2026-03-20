import fs from 'fs'
import path from 'path'
import Anthropic from '@anthropic-ai/sdk'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import { kvGet, kvSet } from '../../../lib/kv'
import { searchKnowledge, formatKnowledgeContext } from '../../../lib/knowledge'

const BRAND_PATH = path.join(process.cwd(), 'data', 'brand-settings.json')
const BRIEFS_SEED = path.join(process.cwd(), 'data', 'briefs.json')
const PERF_SEED = path.join(process.cwd(), 'data', 'performance.json')
const CACHE_TTL_MS = 24 * 60 * 60 * 1000

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function readBrand() {
  try { return JSON.parse(fs.readFileSync('/tmp/brand-settings.json', 'utf-8')) } catch {}
  try { return JSON.parse(fs.readFileSync(BRAND_PATH, 'utf-8')) } catch {}
  return {}
}

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
    const brand = readBrand()
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

    // Pillar coverage analysis — count how often each theme appears in recent briefs
    const themes = (brand.storytellingThemes || []).map((t) => t.theme)
    const pillarCounts = Object.fromEntries(themes.map((t) => [t, 0]))
    recentBriefs.forEach((b) => { if (b.pillar && pillarCounts[b.pillar] !== undefined) pillarCounts[b.pillar]++ })
    const underrepresented = Object.entries(pillarCounts)
      .sort((a, b) => a[1] - b[1])
      .slice(0, 3)
      .map(([theme]) => theme)

    // Performance insights — top content types by engagement rate
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

    // Recently dismissed (last 30) — don't resurface
    const recentDismissed = Array.isArray(dismissed)
      ? dismissed.slice(0, 30).map((d) => d.angle || d.id).filter(Boolean)
      : []

    // Knowledge base — fetch chunks relevant to underrepresented pillars
    const kbQuery = underrepresented.join(' ')
    const kbChunks = await searchKnowledge(kbQuery, 3)
    const kbContext = formatKnowledgeContext(kbChunks)

    const voicePillars = (brand.voicePillars || []).map((v) => `${v.name}: ${v.description}`).join('; ')
    const storyThemes = (brand.storytellingThemes || []).map((t) => `${t.theme} — ${t.description}`).join('; ')
    const campaigns = (brand.activeCampaigns || []).map((c) => `${c.id} (${c.name}): ${c.themes.join(', ')}`).join('; ')
    const alwaysOn = (brand.alwaysOnContent || []).join(', ')
    const highPerf = (brand.contentPerformance?.highPerforming || []).join(', ')
    const underPerf = (brand.contentPerformance?.underPerforming || []).join(', ')
    const cadence = (brand.platformCadence || []).map((p) => `${p.platform} (${p.role}): ${p.targets.join(', ')}`).join('\n')

    const prompt = `You are a senior social media strategist for Cority (EHS+ software). Generate exactly 5 proactive post suggestion objects.

BRAND CONTEXT:
Vision: ${brand.vision || ''}
Voice pillars: ${voicePillars}
Storytelling themes: ${storyThemes}
Active campaigns: ${campaigns}
Always-on content types: ${alwaysOn}
High-performing formats: ${highPerf}
Underperforming formats (avoid): ${underPerf}

PLATFORM CADENCE:
${cadence}

CONTENT PILLAR COVERAGE (last 30 days — prioritise underrepresented):
Underrepresented pillars: ${underrepresented.join(', ') || 'none identified yet'}${perfInsights}

RECENT BRIEF HISTORY (avoid repetition):
${last10Titles.length > 0 ? last10Titles.map((t, i) => `${i + 1}. ${t}`).join('\n') : 'No recent briefs.'}

RECENTLY DISMISSED (do not resurface):
${recentDismissed.length > 0 ? recentDismissed.join('\n') : 'None.'}
${kbContext ? `\nPRODUCT KNOWLEDGE CONTEXT (reference real campaigns, customer outcomes, and product capabilities in your suggestions):\n${kbContext}` : ''}

Return a JSON array of exactly 5 suggestion objects. No markdown fences, no explanation — raw JSON only.
Each object must have exactly these keys:
- "contentType": string (e.g. "carousel", "video", "meme", "text post", "infographic", "short-form video")
- "platforms": string[] using only: "linkedin", "instagram", "x", "facebook", "youtube"
- "pillar": string (exact match to one of the storytelling themes listed above)
- "rationale": string (one sentence: why this is timely or strategic right now)
- "suggestedAngle": string (a specific, actionable content angle — 1-2 sentences)
- "targetAudience": string (specific persona, e.g. "EHS managers in manufacturing")
- "suggestedCampaign": string (one of the campaign IDs above: "global-brand", "environment", or "safety")

Rules: prioritise underrepresented pillars, lean toward high-performing formats, do not suggest anything similar to recent brief history or dismissed suggestions, never generic.`

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1800,
      messages: [{ role: 'user', content: prompt }],
    })

    let text = response.content[0].text.trim()
    // Strip markdown fences if present
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
