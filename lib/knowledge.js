/**
 * Knowledge base utilities — chunking, keyword search, KV helpers.
 * Used by /api/knowledge/* routes and AI generation routes.
 */
import { kvGet } from './kv'

const CHUNK_CHARS = 2000    // ~500 tokens
const OVERLAP_CHARS = 200   // ~50 tokens

const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of',
  'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
  'may', 'might', 'can', 'it', 'its', 'this', 'that', 'these', 'those', 'not',
  'no', 'so', 'if', 'then', 'than', 'when', 'where', 'which', 'who', 'how',
  'all', 'each', 'more', 'also', 'into', 'over', 'after', 'our', 'your', 'their',
  'we', 'you', 'they', 'he', 'she', 'us', 'her', 'him', 'his', 'my', 'me',
])

/**
 * Split text into overlapping chunks of ~CHUNK_CHARS each.
 * Tries to break at paragraph > sentence > word boundaries.
 */
export function chunkText(text) {
  const clean = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/[ \t]+/g, ' ').trim()
  if (!clean) return []

  const chunks = []
  let pos = 0

  while (pos < clean.length) {
    const end = Math.min(pos + CHUNK_CHARS, clean.length)
    let breakAt = end

    if (end < clean.length) {
      const para = clean.lastIndexOf('\n\n', end)
      const sent = clean.lastIndexOf('. ', end)
      const word = clean.lastIndexOf(' ', end)

      if (para > pos + CHUNK_CHARS * 0.5) breakAt = para + 2
      else if (sent > pos + CHUNK_CHARS * 0.5) breakAt = sent + 2
      else if (word > pos + CHUNK_CHARS * 0.5) breakAt = word + 1
    }

    const chunk = clean.slice(pos, breakAt).trim()
    if (chunk.length > 50) chunks.push(chunk)

    // Advance with overlap; always move forward at least 1 char
    pos = Math.max(pos + 1, breakAt - OVERLAP_CHARS)
  }

  return chunks
}

/**
 * Score an array of chunk objects by keyword relevance to a query.
 * Returns top N chunks sorted by score descending.
 */
export function scoreChunks(chunks, query, topN = 5, minScore = 1) {
  const terms = (query || '')
    .toLowerCase()
    .match(/[a-z0-9]+/g)
    ?.filter((t) => t.length > 2 && !STOPWORDS.has(t)) || []

  if (!terms.length) return []

  return chunks
    .map((chunk) => {
      const text = (chunk.text || '').toLowerCase()
      let score = 0
      for (const term of terms) {
        let p = 0
        while ((p = text.indexOf(term, p)) !== -1) { score++; p += term.length }
      }
      return { ...chunk, score }
    })
    .filter((c) => c.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN)
}

/**
 * Async: load all KB chunks from KV and return top matches for a query.
 * Loads all doc chunk arrays in parallel. Non-fatal — returns [] on any error.
 */
export async function searchKnowledge(query, topN = 5) {
  try {
    const index = await kvGet('kb-index', null)
    if (!Array.isArray(index) || index.length === 0) return []

    const chunkArrays = await Promise.all(
      index.map((doc) => kvGet(`kb-chunks-${doc.id}`, null).catch(() => []))
    )
    const allChunks = chunkArrays.flat().filter((c) => c && c.text)

    return scoreChunks(allChunks, query, topN)
  } catch {
    return []
  }
}

/**
 * Format top chunks into a context block for AI system prompts.
 * Each chunk is prefixed with its source document metadata.
 */
export function formatKnowledgeContext(chunks) {
  if (!chunks.length) return ''
  return chunks
    .map((c, i) => `[Source ${i + 1}: ${c.docName} (${c.docType})]\n${c.text.slice(0, 1500)}`)
    .join('\n\n---\n\n')
}

/**
 * Deduplicate chunks to a list of unique source documents.
 */
export function getSourceDocs(chunks) {
  const seen = new Set()
  return chunks
    .filter((c) => {
      if (seen.has(c.docId)) return false
      seen.add(c.docId)
      return true
    })
    .map((c) => ({ docId: c.docId, docName: c.docName, docType: c.docType }))
}
