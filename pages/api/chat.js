import Anthropic from '@anthropic-ai/sdk'
import { getServerSession } from 'next-auth/next'
import { authOptions } from './auth/[...nextauth]'
import { kvGet, kvSet } from '../../lib/kv'
import { searchKnowledge, formatKnowledgeContext, getSourceDocs } from '../../lib/knowledge'
import { readBrandSettings } from '../../lib/brand'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed')

  const session = await getServerSession(req, res, authOptions)
  if (!session) return res.status(401).json({ error: 'Unauthorized' })

  const { messages, sessionId } = req.body
  if (!messages?.length) return res.status(400).json({ error: 'No messages provided.' })

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set.' })
  }

  const brandSettings = await readBrandSettings()
  if (!brandSettings || !brandSettings.aiSystemPrompt) {
    return res.status(500).json({ error: 'Could not load brand settings.' })
  }

  // Knowledge base retrieval — query with the latest user message
  const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user')?.content || ''
  const kbChunks = await searchKnowledge(lastUserMsg, 2)
  const kbContext = formatKnowledgeContext(kbChunks)
  const sourceDocs = getSourceDocs(kbChunks)

  const baseSystem = `${brandSettings.aiSystemPrompt}

You are also a strategic creative partner for Cority's social media manager. Help brainstorm ideas, refine copy, explore angles, write scripts, and think through content strategy. Be direct, opinionated, and specific — not generic. When suggesting copy, write real draft text, not descriptions of what the copy should say. When asked for hooks, write actual hooks. When asked for ideas, give numbered lists with specific, usable concepts.`

  const systemPrompt = kbContext
    ? `${baseSystem}\n\n---\nPRODUCT KNOWLEDGE CONTEXT\nUse the following excerpts from Cority's internal documents to inform your response with specific product details, customer outcomes, and real examples.\n\n${kbContext}`
    : baseSystem

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: systemPrompt,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    })

    const assistantMessage = { role: 'assistant', content: response.content[0].text }

    // Save session to KV history (non-fatal)
    try {
      const sid = sessionId || Date.now().toString()
      const history = await kvGet('chat-history', null) || []
      const existingIdx = history.findIndex((s) => s.id === sid)
      const updatedSession = {
        id: sid,
        updatedAt: new Date().toISOString(),
        messages: [...messages, assistantMessage],
      }
      if (existingIdx >= 0) {
        history[existingIdx] = updatedSession
      } else {
        history.unshift(updatedSession)
      }
      await kvSet('chat-history', history.slice(0, 50))
    } catch {}

    return res.status(200).json({ message: assistantMessage, sourceDocs })
  } catch (err) {
    console.error('Chat error:', err)
    return res.status(500).json({ error: err.message || 'Failed to get response.' })
  }
}
