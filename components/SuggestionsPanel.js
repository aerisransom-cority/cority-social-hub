import { useState, useEffect } from 'react'

const PLATFORM_LABELS = {
  linkedin: 'LinkedIn',
  instagram: 'Instagram',
  x: 'X',
  twitter: 'X',
  facebook: 'Facebook',
  youtube: 'YouTube',
}

const CAMPAIGN_LABELS = {
  'global-brand': 'Global Brand',
  'environment': 'Environment',
  'safety': 'Safety',
}

function SuggestionCard({ suggestion, onOpenAsBrief, onTryInChat, onDismiss }) {
  const platforms = (suggestion.platforms || []).map((p) => PLATFORM_LABELS[p] || p)
  const campaign = CAMPAIGN_LABELS[suggestion.suggestedCampaign] || suggestion.suggestedCampaign || ''

  return (
    <div style={{ border: '0.79px solid #D9D8D6', borderRadius: '6px', padding: '12px 14px', background: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 5, minWidth: 0 }}>
          <span style={{ fontSize: 10, fontWeight: 500, background: '#D35F0B', color: '#fff', borderRadius: 3, padding: '2px 7px', whiteSpace: 'nowrap' }}>
            {suggestion.contentType}
          </span>
          {platforms.map((p) => (
            <span key={p} style={{ fontSize: 10, fontWeight: 400, background: '#F5F5F4', color: 'rgba(0,0,0,0.55)', borderRadius: 3, padding: '2px 6px', whiteSpace: 'nowrap' }}>
              {p}
            </span>
          ))}
          {campaign && (
            <span style={{ fontSize: 10, fontWeight: 400, color: 'rgba(0,0,0,0.35)', fontStyle: 'italic', whiteSpace: 'nowrap' }}>
              · {campaign}
            </span>
          )}
        </div>
        <button
          onClick={onDismiss}
          title="Dismiss"
          style={{ fontSize: 16, lineHeight: 1, color: 'rgba(0,0,0,0.2)', flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', marginTop: -1 }}
        >
          ×
        </button>
      </div>

      <p style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(0,0,0,0.35)', marginBottom: 5 }}>
        {suggestion.pillar}
      </p>
      <p style={{ fontSize: 12, fontWeight: 400, color: '#000', lineHeight: 1.55, marginBottom: 5 }}>
        {suggestion.suggestedAngle}
      </p>
      <p style={{ fontSize: 11, fontWeight: 350, color: 'rgba(0,0,0,0.45)', lineHeight: 1.45, marginBottom: 10 }}>
        {suggestion.rationale}
      </p>

      <div style={{ display: 'flex', gap: 6 }}>
        <button
          onClick={onOpenAsBrief}
          style={{ fontSize: 11, padding: '3px 10px', border: '0.79px solid #D35F0B', borderRadius: 4, background: '#fff', color: '#D35F0B', cursor: 'pointer', fontWeight: 500 }}
        >
          Open as Brief →
        </button>
        <button
          onClick={onTryInChat}
          style={{ fontSize: 11, padding: '3px 10px', border: '0.79px solid #D9D8D6', borderRadius: 4, background: '#fff', color: 'rgba(0,0,0,0.6)', cursor: 'pointer', fontWeight: 400 }}
        >
          Try in chat
        </button>
      </div>
    </div>
  )
}

export default function SuggestionsPanel({ onOpenAsBrief, onTryInChat }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [dismissed, setDismissed] = useState(new Set())

  useEffect(() => { loadSuggestions() }, [])

  async function loadSuggestions() {
    setLoading(true)
    try {
      const res = await fetch('/api/suggestions/generate')
      if (res.ok) setData(await res.json())
    } catch {}
    setLoading(false)
  }

  async function refresh() {
    setRefreshing(true)
    try {
      const res = await fetch('/api/suggestions/generate', { method: 'POST' })
      if (res.ok) {
        setData(await res.json())
        setDismissed(new Set())
      }
    } catch {}
    setRefreshing(false)
  }

  function dismiss(suggestion) {
    setDismissed((prev) => new Set([...prev, suggestion.id || suggestion.suggestedAngle]))
    fetch('/api/suggestions/dismiss', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: suggestion.id || suggestion.suggestedAngle, angle: suggestion.suggestedAngle }),
    }).catch(() => {})
  }

  const visibleCards = (data?.batch || []).filter((s) => !dismissed.has(s.id || s.suggestedAngle))

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <p style={{ fontSize: 9, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '1.38px', color: 'rgba(0,0,0,0.4)' }}>
          Suggested for you
        </p>
        <button
          onClick={refresh}
          disabled={refreshing || loading}
          style={{ fontSize: 10, color: 'rgba(0,0,0,0.3)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 350, padding: 0 }}
          className="hover:text-black transition-colors"
        >
          {refreshing ? 'Refreshing…' : 'Refresh suggestions'}
        </button>
      </div>

      {data && !data.hasPerformanceData && (
        <p style={{ fontSize: 10, color: 'rgba(0,0,0,0.3)', fontWeight: 350, marginBottom: 10, lineHeight: 1.5 }}>
          Suggestions will improve as you upload performance data under the Performance tab.
        </p>
      )}

      {loading ? (
        <p style={{ fontSize: 11, color: 'rgba(0,0,0,0.3)', fontWeight: 350 }}>Loading suggestions…</p>
      ) : visibleCards.length === 0 ? (
        <p style={{ fontSize: 11, color: 'rgba(0,0,0,0.3)', fontWeight: 350 }}>
          No suggestions right now.{' '}
          <button onClick={refresh} style={{ color: '#D35F0B', background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, padding: 0, fontWeight: 400 }}>
            Generate new ones
          </button>
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {visibleCards.map((s, i) => (
            <SuggestionCard
              key={s.id || i}
              suggestion={s}
              onOpenAsBrief={() => onOpenAsBrief(s)}
              onTryInChat={() => onTryInChat(s.suggestedAngle)}
              onDismiss={() => dismiss(s)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
