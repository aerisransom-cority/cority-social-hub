import { useState, useEffect } from 'react'

const PLATFORM_LABEL = {
  linkedin:  'LinkedIn',
  instagram: 'Instagram',
  x:         'X',
  facebook:  'Facebook',
  youtube:   'YouTube',
}

function CopyButton({ text, label }) {
  const [copied, setCopied] = useState(false)
  function handleCopy() {
    navigator.clipboard.writeText(text || '').then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <button
      onClick={handleCopy}
      style={{
        fontSize: 11,
        padding: '4px 10px',
        border: '0.79px solid #D9D8D6',
        borderRadius: 4,
        background: '#fff',
        color: copied ? '#2D7D46' : 'rgba(0,0,0,0.5)',
        cursor: 'pointer',
        fontWeight: 400,
        whiteSpace: 'nowrap',
        transition: 'color 0.15s',
      }}
    >
      {copied ? '✓ Copied' : label || 'Copy'}
    </button>
  )
}

export default function DesignHandoff({ initialBriefId }) {
  const [briefs, setBriefs]         = useState([])
  const [selectedId, setSelectedId] = useState(initialBriefId || '')
  const [loading, setLoading]       = useState(true)

  useEffect(() => {
    fetch('/api/briefs')
      .then((r) => r.json())
      .then((data) => {
        setBriefs(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  // Sync if parent passes a new initialBriefId (e.g. from URL param)
  useEffect(() => {
    if (initialBriefId) setSelectedId(String(initialBriefId))
  }, [initialBriefId])

  const selectedBrief = briefs.find((b) => String(b.id) === String(selectedId)) || null
  const platforms = selectedBrief
    ? Object.keys(selectedBrief.variants || {}).filter((p) => selectedBrief.variants[p])
    : []

  function getCopyText(brief, platform) {
    const v = brief.variants?.[platform]
    if (!v) return ''
    if (platform === 'youtube') {
      return [v.title && `Title: ${v.title}`, v.description].filter(Boolean).join('\n\n')
    }
    return v.copy || ''
  }

  async function handleOpenDesignTool(platform) {
    // Log the session (fire-and-forget)
    fetch('/api/mockups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ briefId: selectedBrief?.id || null, platform: platform || null }),
    }).catch(() => {})
    window.open('https://design-dog.vercel.app/', '_blank', 'noopener,noreferrer')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Brief selector */}
      <div className="card p-6">
        <div className="section-label mb-3">Select Brief</div>
        {loading ? (
          <p className="text-sm text-black/40 font-[350]">Loading briefs…</p>
        ) : (
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            style={{
              width: '100%',
              border: '0.79px solid #D9D8D6',
              borderRadius: 4,
              padding: '8px 10px',
              fontSize: 13,
              fontWeight: 350,
              background: '#fff',
              color: selectedId ? '#000' : 'rgba(0,0,0,0.4)',
            }}
          >
            <option value="">— No brief selected —</option>
            {briefs.map((b) => (
              <option key={b.id} value={String(b.id)}>
                {b.description?.slice(0, 80) || `Brief ${b.id}`}
                {b.deadline ? ` · ${b.deadline}` : ''}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Copy handoff panel */}
      {selectedBrief && platforms.length > 0 ? (
        <div className="card p-6" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <div className="section-label mb-1">Copy for Design Handoff</div>
            <p className="text-xs text-black/40 font-[350]">
              Copy the variant you need before opening the design tool.
            </p>
          </div>

          {platforms.map((platform) => {
            const copyText = getCopyText(selectedBrief, platform)
            return (
              <div key={platform} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 500,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: 'rgba(0,0,0,0.4)',
                    }}
                  >
                    {PLATFORM_LABEL[platform] || platform}
                  </span>
                  <CopyButton
                    text={copyText}
                    label={`Copy ${PLATFORM_LABEL[platform] || platform} copy`}
                  />
                </div>
                <div
                  style={{
                    padding: '10px 12px',
                    border: '0.79px solid #D9D8D6',
                    borderRadius: 4,
                    background: '#FAFAFA',
                    fontSize: 12,
                    fontWeight: 350,
                    color: '#000',
                    lineHeight: 1.6,
                    whiteSpace: 'pre-wrap',
                    maxHeight: 120,
                    overflowY: 'auto',
                  }}
                >
                  {copyText || <span style={{ color: 'rgba(0,0,0,0.3)' }}>No copy available.</span>}
                </div>
              </div>
            )
          })}
        </div>
      ) : selectedBrief ? (
        <div className="card p-6">
          <p className="text-sm text-black/40 font-[350]">No copy variants found for this brief.</p>
        </div>
      ) : null}

      {/* Open design tool */}
      <div className="card p-6" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <div className="section-label mb-1">Open Design Tool</div>
          <p className="text-xs text-black/40 font-[350]" style={{ maxWidth: 480 }}>
            Use Cority&rsquo;s design tool to create brand-compliant graphics. Copy your post copy above before opening.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {selectedBrief && platforms.length > 0 ? (
            platforms.map((platform) => (
              <button
                key={platform}
                className="btn-primary"
                onClick={() => handleOpenDesignTool(platform)}
              >
                Open Design Tool · {PLATFORM_LABEL[platform] || platform} ↗
              </button>
            ))
          ) : (
            <button
              className="btn-primary"
              onClick={() => handleOpenDesignTool(null)}
            >
              Open Design Tool ↗
            </button>
          )}
        </div>
      </div>

    </div>
  )
}
