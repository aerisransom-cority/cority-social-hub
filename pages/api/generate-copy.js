import Anthropic from '@anthropic-ai/sdk'
import { kvGet, kvSet } from '../../lib/kv'
import { searchKnowledge, formatKnowledgeContext, getSourceDocs } from '../../lib/knowledge'
import { readBrandSettings } from '../../lib/brand'
const SEED_BRIEFS  = path.join(process.cwd(), 'data', 'briefs.json')
const SEED_CALENDAR = path.join(process.cwd(), 'data', 'calendar.json')

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end('Method Not Allowed')
  }

  const { description, deadline, audience, goal, url, suggestedCopy, clouds, platforms } = req.body

  if (!description || !deadline || !audience || !goal) {
    return res.status(400).json({ error: 'Missing required fields.' })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({
      error: 'ANTHROPIC_API_KEY is not set. Add it to .env.local for local dev or to Vercel environment variables for production.',
    })
  }

  const brandSettings = await readBrandSettings()
  if (!brandSettings || !brandSettings.aiSystemPrompt) {
    return res.status(500).json({ error: 'Could not load brand settings.' })
  }

  const selectedPlatforms = platforms?.length
    ? platforms
    : ['linkedin', 'instagram', 'x', 'facebook', 'youtube']

  const briefLines = [
    `Social request: ${description}`,
    `Deadline: ${deadline}`,
    `Target audience: ${audience}`,
    `Goal: ${goal}`,
    url ? `URL to include: ${url}` : null,
    suggestedCopy ? `Suggested copy/angle: ${suggestedCopy}` : null,
    clouds?.length ? `Related Cority clouds/products: ${clouds.join(', ')}` : null,
  ].filter(Boolean)

  const PLATFORM_SCHEMA = {
    linkedin:  `"linkedin":  { "copy": "...", "notes": "..." }`,
    instagram: `"instagram": { "copy": "...", "notes": "..." }`,
    x:         `"x":         { "copy": "...", "notes": "..." }`,
    facebook:  `"facebook":  { "copy": "...", "notes": "..." }`,
    youtube:   `"youtube":   { "title": "...", "description": "...", "notes": "..." }`,
  }

  const PLATFORM_GUIDELINES = {
    linkedin:  '- LinkedIn: Professional, data-forward, 150–250 words, 3–5 relevant hashtags at the end, use line breaks for scannability, strong opening hook (no "I\'m excited to share")',
    instagram: '- Instagram: Visual-first caption, 80–120 words, 5–8 hashtags at the end, 1–2 relevant emojis, punchy CTA',
    x:         '- X: Maximum 280 characters total including hashtags, 1–2 hashtags, direct sharp hook — every word earns its place',
    facebook:  '- Facebook: Conversational tone, 80–130 words, 1–2 hashtags, end with a question or CTA that invites engagement',
    youtube:   '- YouTube title: Max 60 characters, SEO-forward, no clickbait, clear value prop\n- YouTube description: 150–250 words, open with the key takeaway, include a CTA, 3–5 relevant keywords woven in naturally',
  }

  const jsonTemplate = '{\n  ' + selectedPlatforms.map((p) => PLATFORM_SCHEMA[p]).join(',\n  ') + '\n}'
  const guidelines = selectedPlatforms.map((p) => PLATFORM_GUIDELINES[p]).join('\n')

  const userPrompt = `Generate platform-specific social media copy for this brief.

${briefLines.join('\n')}

Important: Do NOT include any URLs or links in the post copy itself. URLs will be added separately as UTM-tagged links — keep copy clean of any http/https links.

Return ONLY a valid JSON object — no preamble, no markdown fences, no explanation. Include ONLY these platforms: ${selectedPlatforms.join(', ')}. Use this exact structure:

${jsonTemplate}

Platform guidelines — follow these precisely:
${guidelines}`

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  // Knowledge base retrieval — query with brief description + audience + clouds
  const kbQuery = [description, audience, clouds?.join(' ')].filter(Boolean).join(' ')
  const kbChunks = await searchKnowledge(kbQuery, 3)
  const kbContext = formatKnowledgeContext(kbChunks)
  const sourceDocs = getSourceDocs(kbChunks)

  const systemPrompt = kbContext
    ? `${brandSettings.aiSystemPrompt}\n\n---\nPRODUCT KNOWLEDGE CONTEXT\nThe following excerpts are from Cority's internal documents. Reference specific customer stories, product names, and real data points from this context when drafting copy — do not invent generic claims.\n\n${kbContext}`
    : brandSettings.aiSystemPrompt

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const rawText = message.content[0].text.trim()
    const jsonText = rawText.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim()
    const variants = JSON.parse(jsonText)

    const brief = {
      id: Date.now(),
      createdAt: new Date().toISOString(),
      description, deadline, audience, goal,
      url: url || null,
      suggestedCopy: suggestedCopy || null,
      clouds: clouds || [],
      platforms: selectedPlatforms,
      variants,
    }

    // Save brief to KV (non-fatal)
    try {
      const existing = await kvGet('briefs', SEED_BRIEFS)
      existing.unshift(brief)
      await kvSet('briefs', existing)
    } catch {}

    // Sync to calendar (non-fatal)
    try {
      const PLATFORM_LABEL = { linkedin: 'LinkedIn', instagram: 'Instagram', x: 'X', facebook: 'Facebook', youtube: 'YouTube' }
      const firstPlatform = PLATFORM_LABEL[selectedPlatforms[0]] || selectedPlatforms[0]
      const calendarEntry = {
        id: `brief-${brief.id}`,
        createdAt: new Date().toISOString(),
        title: description.length > 60 ? description.slice(0, 57) + '…' : description,
        platform: firstPlatform,
        contentType: 'Post',
        scheduledDate: deadline,
        status: 'Draft',
        briefId: brief.id,
        notes: `Auto-added from brief. Audience: ${audience}. Goal: ${goal}.`,
      }
      const calendar = await kvGet('calendar', SEED_CALENDAR)
      const alreadyExists = calendar.some((e) => String(e.briefId) === String(brief.id))
      if (!alreadyExists) {
        calendar.push(calendarEntry)
        await kvSet('calendar', calendar)
      }
    } catch {}

    return res.status(200).json({ variants, briefId: brief.id, sourceDocs })
  } catch (err) {
    console.error('Copy generation error:', err)
    if (err instanceof SyntaxError) {
      return res.status(500).json({ error: 'AI returned unexpected format. Try again.' })
    }
    return res.status(500).json({ error: err.message || 'Failed to generate copy.' })
  }
}
