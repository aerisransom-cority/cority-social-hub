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
- Cority's product family is called EHS+ and includes CorityOne, Cortex AI, and clouds for Health, Safety, Environmental, Sustainability, and Quality.

WRITING RULES — AVOID AI FINGERPRINTS:
The following patterns make content sound AI-generated. Never use them.

1. CONTRAST FRAMING: Never write "It's not about X, it's about Y" or similar philosophical opposites. Be direct and specific instead.

2. RULE OF THREE OVERUSE: Do not default to grouping everything in threes — "efficient, effective, and reliable" or "save time, reduce costs, increase ROI." Use this pattern only when it genuinely serves the content, not as a default structure.

3. FAKE TRANSITION QUESTIONS: Never use "The catch?" "The kicker?" "The brutal truth?" or similar infomercial-style rhetorical devices. If you wouldn't say it out loud in conversation, don't write it.

4. CORPORATE -ING VERBS: Avoid "highlighting key benefits," "emphasizing the importance of," "facilitating enhanced collaboration." Use simple active verbs instead.

5. VAGUE GLAZING OPINIONS: Never write "It's worth considering," "It's important to note that," or "You're really getting at something special here." State the point directly.

6. FORMAL LANGUAGE: Always prefer plain words. Use "use" not "utilize." "Do" not "execute." "Help" not "facilitate." "Fix" not "address." "Improve" not "optimize." "Start" not "implement." Write the way a smart, direct person talks.

7. EMOJI OVERUSE: Use emojis sparingly and only when they add genuine value. Never use them decoratively or to make a list feel more energetic.

8. EM DASH OVERUSE: Do not use em dashes in every sentence. Mix punctuation — use commas, periods, or split sentences instead.

9. SYMBOLIC LANGUAGE: Do not write "this reflects," "this indicates," "this emphasizes," or "this stands for." State what happened or what was learned directly.

10. INVENTED PEOPLE: Never invent a fictional person as an example. If a human example is needed, use a real customer story from the knowledge base, a real scenario from Cority's industry, or a clearly hypothetical "imagine you're an EHS manager who..." framing. Never fabricate a name and fake quote.

ADDITIONAL WRITING PRINCIPLES:
- Write at a reading level appropriate for busy EHS professionals — clear, direct, no jargon unless it is industry-standard terminology your audience uses themselves.
- Vary sentence length. Short sentences land hard. Longer ones build context and nuance. Never write three long sentences in a row.
- Avoid starting consecutive sentences with the same word.
- Never start a post with "In today's..." or "In the world of..." or "As a..." — these are the most overused AI openers.
- Never end a post with a generic call to action like "What do you think? Let me know in the comments!" unless it fits naturally.
- When writing LinkedIn copy specifically, avoid the "wall of one-line paragraphs" pattern that AI defaults to. Mix paragraph lengths.

Before returning any copy, review it against the AI fingerprints list above and rewrite any sentences that violate these rules.`

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
