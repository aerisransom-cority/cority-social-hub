/**
 * Central prompt assembly — three-layer architecture.
 *
 * Layer 1: Fixed behavioral text — Cority copywriter identity, rules, tone.
 *          (~400 words, never changes, not user-editable)
 * Layer 2: Structured brand context — assembled fresh from brandSettings on
 *          every call. Active campaigns only. Includes optional custom instructions.
 * Layer 3: KB reference documents — only when knowledgeChunks are provided.
 *
 * Returns { systemPrompt, contextBlock }
 *   systemPrompt — the full string passed as `system` to Claude
 *   contextBlock — Layers 2+3 only (used for the admin debug panel)
 */

// ── Layer 1 ─────────────────────────────────────────────────────────────────

const LAYER1_BEHAVIORAL = `You are a social media copywriter and strategist for Cority, a leading EHS+ (Environmental, Health, Safety, and Sustainability) software company.

Your role is to help create platform-specific social content that is brand-accurate, strategically anchored, and genuinely useful to EHS professionals. You think like a senior strategist but write like a skilled human creator — never robotic, never generic.

RULES — follow without exception:
- Write with confidence, specificity, and a clear point of view.
- No hype without substance. Every claim must be grounded in real data, real customer outcomes, or real product capabilities.
- Do not invent statistics. If you lack a specific number, describe the outcome instead.
- Do not open posts with "I'm excited to share", "We're thrilled", "In today's world", or any cliché opener.
- Do not include URLs or links in post copy — URLs are added separately as UTM-tagged links.
- Platform character limits and format rules are non-negotiable.
- When asked for copy, write real draft text — not descriptions of what the copy should say.
- When asked for hooks, write actual hooks. When asked for ideas, give numbered lists of specific, usable concepts.
- Be direct and opinionated. Specific beats hedged. Usable beats cautious.
- Cority's product family is called EHS+ and includes CorityOne, Cortex AI, and clouds for Health, Safety, Environmental, Sustainability, and Quality.`

// ── Layer 2 ─────────────────────────────────────────────────────────────────

function buildLayer2(brandSettings) {
  const b = brandSettings || {}

  const voicePillars = (b.voicePillars || [])
    .map((v) => `  - ${v.name}: ${v.description}`)
    .join('\n')

  const themes = (b.storytellingThemes || [])
    .map((t, i) => `  ${i + 1}. ${t.theme} — ${t.description}`)
    .join('\n')

  const activeCampaigns = (b.activeCampaigns || [])
    .filter((c) => c.active !== false)
    .map((c) => `  - [${c.id}] ${c.name}: ${c.themes.join(', ')}`)
    .join('\n')

  const highPerf = (b.contentPerformance?.highPerforming || []).join(', ')
  const underPerf = (b.contentPerformance?.underPerforming || []).join(', ')
  const alwaysOn = (b.alwaysOnContent || []).join(', ')

  const cadence = (b.platformCadence || [])
    .map((p) => `  - ${p.platform} (${p.role}): ${p.targets.join('; ')}`)
    .join('\n')

  // Support both new field name and legacy field name
  const custom = (b.customInstructions || b.aiSystemPrompt || '').trim()

  const lines = [
    '---',
    'BRAND CONTEXT',
    '',
    `BRAND VISION: ${b.vision || '(not set)'}`,
    '',
    'VOICE PILLARS:',
    voicePillars || '  (none set)',
    '',
    'STORYTELLING THEMES (frame every post within one of these):',
    themes || '  (none set)',
    '',
    'ACTIVE CAMPAIGNS (align content to these where relevant):',
    activeCampaigns || '  (none active)',
    '',
    'ALWAYS-ON CONTENT TYPES:',
    `  ${alwaysOn || '(none set)'}`,
    '',
    'HIGH-PERFORMING FORMATS (lean toward these):',
    `  ${highPerf || '(none set)'}`,
    '',
    'AVOID (underperforming formats):',
    `  ${underPerf || '(none set)'}`,
    '',
    'PLATFORM CADENCE TARGETS:',
    cadence || '  (none set)',
  ]

  if (custom) {
    lines.push('', 'ADDITIONAL INSTRUCTIONS:', `  ${custom}`)
  }

  return lines.join('\n')
}

// ── Layer 3 ─────────────────────────────────────────────────────────────────

function buildLayer3(knowledgeChunks) {
  if (!Array.isArray(knowledgeChunks) || knowledgeChunks.length === 0) return ''

  const formatted = knowledgeChunks
    .map((c, i) => `[Source ${i + 1}: ${c.docName} (${c.docType})]\n${c.text.slice(0, 1500)}`)
    .join('\n\n---\n\n')

  return [
    '---',
    'REFERENCE DOCUMENTS',
    'The following excerpts are from Cority\'s internal documents. When relevant, reference specific customer stories, product names, and real data points — do not invent generic claims.',
    '',
    formatted,
  ].join('\n')
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Assemble the full Claude system prompt for any AI call.
 *
 * @param {object} opts
 * @param {'copy'|'chat'|'suggestions'} opts.type
 * @param {string} [opts.query]          — KB retrieval query (informational)
 * @param {object} opts.brandSettings    — full brand settings object
 * @param {Array}  [opts.knowledgeChunks] — scored + threshold-filtered KB chunks
 * @returns {{ systemPrompt: string, contextBlock: string }}
 */
export function buildPrompt({ type, query, brandSettings, knowledgeChunks = [] }) {
  const layer2 = buildLayer2(brandSettings)
  const layer3 = buildLayer3(knowledgeChunks)

  const contextBlock = [layer2, layer3].filter(Boolean).join('\n\n')
  const systemPrompt = [LAYER1_BEHAVIORAL, contextBlock].filter(Boolean).join('\n\n')

  return { systemPrompt, contextBlock }
}
