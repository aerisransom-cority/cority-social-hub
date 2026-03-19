import fs from 'fs'
import path from 'path'
import Anthropic from '@anthropic-ai/sdk'

// Vercel's data/ directory is read-only. All writes use /tmp (writable, ephemeral).
// Reads try /tmp first, then fall back to committed seed files in data/.
const TMP_BRAND    = '/tmp/brand-settings.json'
const TMP_BRIEFS   = '/tmp/briefs.json'
const TMP_CALENDAR = '/tmp/calendar.json'
const SEED_BRAND    = path.join(process.cwd(), 'data', 'brand-settings.json')
const SEED_BRIEFS   = path.join(process.cwd(), 'data', 'briefs.json')
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

  // Load brand settings — prefer /tmp (user-saved) over committed seed
  let brandSettings
  try {
    brandSettings = JSON.parse(fs.readFileSync(TMP_BRAND, 'utf-8'))
  } catch {
    try {
      brandSettings = JSON.parse(fs.readFileSync(SEED_BRAND, 'utf-8'))
    } catch {
      return res.status(500).json({ error: 'Could not load brand settings.' })
    }
  }

  // Use provided platforms or default to all five
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

  // Build JSON template for only the selected platforms
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

Return ONLY a valid JSON object — no preamble, no markdown fences, no explanation. Include ONLY these platforms: ${selectedPlatforms.join(', ')}. Use this exact structure:

${jsonTemplate}

Platform guidelines — follow these precisely:
${guidelines}`

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: brandSettings.aiSystemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const rawText = message.content[0].text.trim()
    // Strip markdown code fences if Claude adds them despite instructions
    const jsonText = rawText.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim()
    const variants = JSON.parse(jsonText)

    // Save brief (non-fatal if it fails)
    const brief = {
      id: Date.now(),
      createdAt: new Date().toISOString(),
      description,
      deadline,
      audience,
      goal,
      url: url || null,
      suggestedCopy: suggestedCopy || null,
      clouds: clouds || [],
      platforms: selectedPlatforms,
      variants,
    }

    // Save brief to /tmp (Vercel's data/ is read-only; /tmp is writable)
    try {
      let existing = []
      try { existing = JSON.parse(fs.readFileSync(TMP_BRIEFS, 'utf-8')) } catch {}
      // If /tmp is empty, seed from committed data so existing briefs are preserved
      if (existing.length === 0) {
        try { existing = JSON.parse(fs.readFileSync(SEED_BRIEFS, 'utf-8')) } catch {}
      }
      existing.unshift(brief)
      fs.writeFileSync(TMP_BRIEFS, JSON.stringify(existing, null, 2))
    } catch {
      // Non-fatal
    }

    // Sync to calendar — calendar.js mergedCalendar() will pick this up from
    // /tmp/briefs.json, so no explicit calendar write is needed. Writing here
    // anyway to handle the edge case where the brief write above succeeded but
    // the calendar read happens before /tmp/briefs.json is available.
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
      let calendar = []
      try { calendar = JSON.parse(fs.readFileSync(TMP_CALENDAR, 'utf-8')) } catch {}
      if (calendar.length === 0) {
        try { calendar = JSON.parse(fs.readFileSync(SEED_CALENDAR, 'utf-8')) } catch {}
      }
      const alreadyExists = calendar.some((e) => String(e.briefId) === String(brief.id))
      if (!alreadyExists) {
        calendar.push(calendarEntry)
        fs.writeFileSync(TMP_CALENDAR, JSON.stringify(calendar, null, 2))
      }
    } catch {
      // Non-fatal — calendar sync failure doesn't block copy generation
    }

    return res.status(200).json({ variants, briefId: brief.id })
  } catch (err) {
    console.error('Copy generation error:', err)
    if (err instanceof SyntaxError) {
      return res.status(500).json({ error: 'AI returned unexpected format. Try again.' })
    }
    return res.status(500).json({ error: err.message || 'Failed to generate copy.' })
  }
}
