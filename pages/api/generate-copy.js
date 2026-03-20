import path from 'path'
import Anthropic from '@anthropic-ai/sdk'
import { kvGet, kvSet } from '../../lib/kv'
import { searchKnowledge, getSourceDocs } from '../../lib/knowledge'
import { readBrandSettings } from '../../lib/brand'
import { buildPrompt } from '../../lib/promptBuilder'

const SEED_BRIEFS   = path.join(process.cwd(), 'data', 'briefs.json')
const SEED_CALENDAR = path.join(process.cwd(), 'data', 'calendar.json')

// ── Content type → calendar display label ─────────────────────────────────────
const CONTENT_TYPE_LABEL = {
  'text-post':    'Post',
  'video-post':   'Video',
  carousel:       'Carousel',
  graphic:        'Graphic',
  infographic:    'Infographic',
  youtube:        'YouTube',
  'video-script': 'Video Script',
}

// ── JSON schema per platform per content type ─────────────────────────────────

function getPlatformSchema(contentType, platformId) {
  // YouTube platform with YouTube content type → full YouTube package
  if (contentType === 'youtube' && platformId === 'youtube') {
    return `"youtube": { "title": "...", "description": "...", "scriptOutline": "...", "notes": "..." }`
  }
  // YouTube content type on other platforms → promo caption only
  if (contentType === 'youtube' && platformId !== 'youtube') {
    return `"${platformId}": { "caption": "...", "notes": "..." }`
  }
  // Visual types: carousel, graphic, infographic → caption + assetCopy
  if (['carousel', 'graphic', 'infographic'].includes(contentType)) {
    return `"${platformId}": { "caption": "...", "assetCopy": "...", "notes": "..." }`
  }
  // Video script → caption + full script
  if (contentType === 'video-script') {
    return `"${platformId}": { "caption": "...", "script": "...", "estimatedDuration": "...", "notes": "..." }`
  }
  // text-post, video-post — standard copy
  if (platformId === 'youtube') {
    return `"youtube": { "title": "...", "description": "...", "notes": "..." }`
  }
  return `"${platformId}": { "copy": "...", "notes": "..." }`
}

// ── Platform caption guidelines (apply to captions for all content types) ─────

const PLATFORM_CAPTION_GUIDELINES = {
  linkedin:  '- LinkedIn: Professional, data-forward, 150–250 words, 3–5 relevant hashtags at the end, use line breaks for scannability, strong opening hook (no "I\'m excited to share")',
  instagram: '- Instagram: Visual-first caption, 80–120 words, 5–8 hashtags at the end, 1–2 relevant emojis, punchy CTA',
  x:         '- X: Maximum 280 characters total including hashtags, 1–2 hashtags, direct sharp hook — every word earns its place',
  facebook:  '- Facebook: Conversational tone, 80–130 words, 1–2 hashtags, end with a question or CTA that invites engagement',
  youtube:   '- YouTube title: Max 60 characters, SEO-forward, no clickbait, clear value prop\n- YouTube description: 150–250 words, open with the key takeaway, include a CTA, 3–5 relevant keywords woven in naturally',
}

// ── Content type instructions block ──────────────────────────────────────────

function getContentTypeInstructions(contentType, assetFormat) {
  const assetBrief = assetFormat?.trim()

  const defaults = {
    'text-post': '',
    'video-post': 'Write a caption suitable for a video post. The caption should tease the video content and drive views.',
    carousel: [
      'Generate a caption that teases the carousel without revealing everything.',
      'Generate assetCopy for the slides using this exact format (label each slide clearly):',
      '',
      'SLIDE 1 — Hook',
      'Headline: [max 8 words — provocative, specific, data-led]',
      'Body: [max 30 words — the setup or stat that earns the swipe]',
      '',
      'SLIDE 2 — [topic]',
      'Headline: [max 8 words]',
      'Body: [max 30 words]',
      '',
      '... (continue for slides 3 and 4)',
      '',
      'SLIDE 5 — CTA',
      'Headline: [max 8 words — the takeaway or next step]',
      'Body: [optional, max 20 words — direct CTA]',
    ].join('\n'),
    graphic: [
      'Generate a caption that provides context for the graphic.',
      'Generate assetCopy using this format:',
      '',
      'HEADLINE: [max 10 words — clear, specific, no filler]',
      'SUBHEADLINE: [max 8 words — optional supporting line]',
    ].join('\n'),
    infographic: [
      'Generate a caption that summarizes the infographic\'s key takeaway in 1–2 sentences.',
      'Generate assetCopy using this format:',
      '',
      'HEADLINE: [max 10 words]',
      'KEY POINT 1 — [label, max 4 words]: [supporting sentence, max 20 words]',
      'KEY POINT 2 — [label, max 4 words]: [supporting sentence, max 20 words]',
      'KEY POINT 3 — [label, max 4 words]: [supporting sentence, max 20 words]',
      '(3–5 key points total)',
    ].join('\n'),
    youtube: [
      'For the YouTube platform, generate:',
      '- title: SEO-optimized, under 60 characters, no clickbait, clear value prop',
      '- description: 2-sentence hook, timestamps placeholder ([0:00 Intro] [1:30 Topic] format), keywords woven in naturally, under 500 words',
      '- scriptOutline formatted as:',
      '',
      'HOOK (0:00–0:30):',
      '[What you open with — the strongest hook possible]',
      '',
      'MAIN POINT 1 — [title]:',
      '• [bullet]',
      '• [bullet]',
      '',
      '(3–5 main point sections)',
      '',
      'CTA (last 30 seconds):',
      '[How you close — specific ask]',
      '',
      'For all other platforms: generate a short promotional caption only (no title/description/scriptOutline).',
    ].join('\n'),
    'video-script': [
      'Generate a platform-appropriate caption for sharing the video.',
      'Generate a full word-for-word script using this format:',
      '',
      '[HOOK]',
      '[opening lines — grab attention in the first 5 seconds]',
      '',
      '[BODY]',
      '[main content — use stage directions in brackets: [pause] [show graphic] [cut to b-roll]]',
      '',
      '[CTA]',
      '[closing — specific and direct]',
      '',
      'For estimatedDuration: calculate based on 130 words per minute, round to nearest 15 seconds.',
    ].join('\n'),
  }

  const lines = []

  lines.push(`CONTENT TYPE: ${contentType.replace(/-/g, ' ').toUpperCase()}`)
  lines.push('')

  if (assetBrief) {
    lines.push(`ASSET FORMAT BRIEF (user-specified — use this as the primary guide for structuring asset copy, adapting format, number of elements, and copy length to match):`)
    lines.push(`"${assetBrief}"`)
    lines.push('')
    lines.push('Default structure for reference (adapt based on the Asset Format Brief above):')
  }

  const defaultInstr = defaults[contentType]
  if (defaultInstr) lines.push(defaultInstr)

  lines.push('')
  lines.push('IMPORTANT: Always generate the caption and asset copy as completely separate, clearly labeled sections. Never blend them. The caption goes in the "caption" key; the asset copy goes in the "assetCopy", "script", "scriptOutline", or "title"/"description" key as appropriate.')

  return lines.join('\n')
}

// ── Main handler ──────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end('Method Not Allowed')
  }

  const {
    description, deadline, audience, goal, url, suggestedCopy,
    clouds, platforms, contentType = 'text-post', assetFormat,
  } = req.body

  if (!description || !deadline || !audience || !goal) {
    return res.status(400).json({ error: 'Missing required fields.' })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({
      error: 'ANTHROPIC_API_KEY is not set. Add it to .env.local for local dev or to Vercel environment variables for production.',
    })
  }

  const brandSettings = await readBrandSettings()
  if (!brandSettings || !brandSettings.vision) {
    return res.status(500).json({ error: 'Could not load brand settings.' })
  }

  // Auto-include YouTube for YouTube content type
  let selectedPlatforms = platforms?.length
    ? platforms
    : ['linkedin', 'instagram', 'x', 'facebook', 'youtube']
  if (contentType === 'youtube' && !selectedPlatforms.includes('youtube')) {
    selectedPlatforms = [...selectedPlatforms, 'youtube']
  }

  const briefLines = [
    `Social request: ${description}`,
    `Deadline: ${deadline}`,
    `Target audience: ${audience}`,
    `Goal: ${goal}`,
    url ? `URL to include: ${url}` : null,
    suggestedCopy ? `Suggested copy/angle: ${suggestedCopy}` : null,
    clouds?.length ? `Related Cority clouds/products: ${clouds.join(', ')}` : null,
  ].filter(Boolean)

  const jsonTemplate = '{\n  ' + selectedPlatforms.map((p) => getPlatformSchema(contentType, p)).join(',\n  ') + '\n}'

  // Platform guidelines — apply to captions for all types; YouTube description for standard YouTube
  const guidelines = selectedPlatforms.map((p) => PLATFORM_CAPTION_GUIDELINES[p]).filter(Boolean).join('\n')

  const contentTypeInstructions = getContentTypeInstructions(contentType, assetFormat)

  const userPrompt = `Generate platform-specific social media copy for this brief.

${briefLines.join('\n')}

${contentTypeInstructions}

Important: Do NOT include any URLs or links in any copy field — URLs are added separately as UTM-tagged links.

Return ONLY a valid JSON object — no preamble, no markdown fences, no explanation. Include ONLY these platforms: ${selectedPlatforms.join(', ')}. Use this exact structure:

${jsonTemplate}

Platform guidelines for captions:
${guidelines}`

  // Knowledge base retrieval
  const kbQuery = [description, audience, clouds?.join(' ')].filter(Boolean).join(' ')
  const kbChunks = await searchKnowledge(kbQuery, 3)
  const sourceDocs = getSourceDocs(kbChunks)

  const { systemPrompt, contextBlock } = buildPrompt({
    type: 'copy',
    query: kbQuery,
    brandSettings,
    knowledgeChunks: kbChunks,
  })

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 3000,
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
      contentType,
      assetFormat: assetFormat || null,
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
      const calendarContentType = CONTENT_TYPE_LABEL[contentType] || 'Post'
      const PLATFORM_LABEL = { linkedin: 'LinkedIn', instagram: 'Instagram', x: 'X', facebook: 'Facebook', youtube: 'YouTube' }
      const firstPlatform = PLATFORM_LABEL[selectedPlatforms[0]] || selectedPlatforms[0]
      const calendarEntry = {
        id: `brief-${brief.id}`,
        createdAt: new Date().toISOString(),
        title: description.length > 60 ? description.slice(0, 57) + '…' : description,
        platform: firstPlatform,
        contentType: calendarContentType,
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

    return res.status(200).json({
      variants,
      briefId: brief.id,
      contentType,
      sourceDocs,
      debugPrompt: { systemPrompt, contextBlock },
    })
  } catch (err) {
    console.error('Copy generation error:', err)
    if (err instanceof SyntaxError) {
      return res.status(500).json({ error: 'AI returned unexpected format. Try again.' })
    }
    return res.status(500).json({ error: err.message || 'Failed to generate copy.' })
  }
}
