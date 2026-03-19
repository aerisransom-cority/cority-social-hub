import { useState } from 'react'

const CLOUDS = [
  'CorityOne',
  'Health',
  'Safety',
  'Environmental',
  'Sustainability',
  'Quality',
  'Analytics',
  'EHS+ Converge Studio',
]

const PLATFORMS = [
  { id: 'linkedin',  label: 'LinkedIn',  icon: '💼' },
  { id: 'instagram', label: 'Instagram', icon: '📸' },
  { id: 'x',        label: 'X',         icon: '✖️' },
  { id: 'facebook',  label: 'Facebook',  icon: '📘' },
  { id: 'youtube',   label: 'YouTube',   icon: '▶️' },
]

const CHAR_LIMITS = { linkedin: 3000, instagram: 2200, x: 280, facebook: 2000 }

function CharCount({ text, platform }) {
  const count = text?.length || 0
  const limit = CHAR_LIMITS[platform]
  if (!limit) return <span className="text-xs text-black/30 font-[350]">{count} chars</span>
  const over = count > limit
  return (
    <span className={`text-xs font-[350] ${over ? 'text-cority-red' : 'text-black/30'}`}>
      {count} / {limit}{over ? ' — over limit' : ''}
    </span>
  )
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <button
      onClick={handleCopy}
      className="btn-secondary text-xs px-3 py-1.5"
    >
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  )
}

export default function RequestBrief() {
  const [form, setForm] = useState({
    description: '',
    deadline: '',
    audience: '',
    goal: '',
    url: '',
    suggestedCopy: '',
    clouds: [],
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)
  const [activeTab, setActiveTab] = useState('linkedin')

  function handleField(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function toggleCloud(cloud) {
    setForm((f) => ({
      ...f,
      clouds: f.clouds.includes(cloud)
        ? f.clouds.filter((c) => c !== cloud)
        : [...f.clouds, cloud],
    }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch('/api/generate-copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Something went wrong.')
      setResult(data)
      setActiveTab('linkedin')
      setTimeout(() => {
        document.getElementById('results-section')?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleRegenerate() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/generate-copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Something went wrong.')
      setResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const activePlatform = PLATFORMS.find((p) => p.id === activeTab)
  const activeVariant = result?.variants?.[activeTab]

  return (
    <div>
      {/* Page header */}
      <div className="flex items-start justify-between mb-8" style={{ paddingTop: '24px' }}>
        <div>
          <h1 className="text-3xl text-black font-[350] leading-tight">Request Brief</h1>
          <p className="text-sm text-black/50 mt-1 font-[350]">
            Describe your social request and get AI-drafted copy for every platform.
          </p>
        </div>
      </div>

      <div className="flex gap-8 items-start">
        {/* ── FORM ── */}
        <div className="w-[420px] flex-shrink-0">
          <form onSubmit={handleSubmit} className="card p-8 space-y-6">

            <div>
              <label className="section-label">
                Describe your social request <span className="text-cority-red">*</span>
              </label>
              <textarea
                className="textarea"
                rows={4}
                placeholder="e.g. Announce our new Cortex AI incident prediction feature targeting EHS managers in manufacturing..."
                value={form.description}
                onChange={(e) => handleField('description', e.target.value)}
                required
              />
            </div>

            <div>
              <label className="section-label">
                When is this needed by? <span className="text-cority-red">*</span>
              </label>
              <input
                type="date"
                className="input"
                value={form.deadline}
                onChange={(e) => handleField('deadline', e.target.value)}
                required
              />
            </div>

            <div>
              <label className="section-label">
                Target audience <span className="text-cority-red">*</span>
              </label>
              <input
                type="text"
                className="input"
                placeholder="e.g. EHS managers in manufacturing, mid-market, 500–5000 employees"
                value={form.audience}
                onChange={(e) => handleField('audience', e.target.value)}
                required
              />
            </div>

            <div>
              <label className="section-label">
                Goal of this post <span className="text-cority-red">*</span>
              </label>
              <input
                type="text"
                className="input"
                placeholder="e.g. Drive demo requests, build brand awareness, amplify event attendance"
                value={form.goal}
                onChange={(e) => handleField('goal', e.target.value)}
                required
              />
            </div>

            <div>
              <label className="section-label">URL to include</label>
              <input
                type="url"
                className="input"
                placeholder="https://"
                value={form.url}
                onChange={(e) => handleField('url', e.target.value)}
              />
            </div>

            <div>
              <label className="section-label">Suggested copy or angle</label>
              <textarea
                className="textarea"
                rows={3}
                placeholder="Paste any existing copy, talking points, or a direction you want to explore..."
                value={form.suggestedCopy}
                onChange={(e) => handleField('suggestedCopy', e.target.value)}
              />
            </div>

            <div>
              <label className="section-label">Related Cloud / Product</label>
              <div className="flex flex-wrap gap-2">
                {CLOUDS.map((cloud) => {
                  const selected = form.clouds.includes(cloud)
                  return (
                    <button
                      key={cloud}
                      type="button"
                      onClick={() => toggleCloud(cloud)}
                      className="tag transition-colors"
                      style={{
                        backgroundColor: selected ? '#E3001B' : '#ffffff',
                        color: selected ? '#ffffff' : '#000000',
                        borderColor: selected ? '#E3001B' : '#D9D8D6',
                        cursor: 'pointer',
                      }}
                    >
                      {cloud}
                    </button>
                  )
                })}
              </div>
            </div>

            {error && (
              <div
                className="text-sm text-cority-red font-[350] p-3"
                style={{ border: '0.79px solid #E3001B', borderRadius: '6px' }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn-primary w-full"
              disabled={loading}
            >
              {loading ? 'Generating copy…' : 'Generate Copy →'}
            </button>
          </form>
        </div>

        {/* ── RESULTS ── */}
        <div className="flex-1 min-w-0" id="results-section">
          {!result && !loading && (
            <div
              className="flex flex-col items-center justify-center text-center"
              style={{
                border: '0.79px dashed #D9D8D6',
                borderRadius: '6px',
                padding: '80px 40px',
              }}
            >
              <div className="text-4xl mb-4">✨</div>
              <p className="text-sm font-medium text-black mb-1">Copy will appear here</p>
              <p className="text-sm text-black/40 font-[350] max-w-xs">
                Fill out the brief and click Generate Copy to get platform-specific variants.
              </p>
            </div>
          )}

          {loading && (
            <div
              className="flex flex-col items-center justify-center text-center"
              style={{
                border: '0.79px solid #D9D8D6',
                borderRadius: '6px',
                padding: '80px 40px',
              }}
            >
              <div className="text-4xl mb-4" style={{ animation: 'pulse 1.5s infinite' }}>⏳</div>
              <p className="text-sm font-medium text-black mb-1">Drafting copy…</p>
              <p className="text-sm text-black/40 font-[350]">
                Claude is writing 5 platform variants anchored to Cority brand strategy.
              </p>
            </div>
          )}

          {result && !loading && (
            <div className="card">
              {/* Result header */}
              <div
                className="flex items-center justify-between px-6 py-4"
                style={{ borderBottom: '0.75px solid #D9D8D6' }}
              >
                <div>
                  <p className="font-medium text-black text-sm">Copy variants generated</p>
                  <p className="text-xs text-black/40 font-[350] mt-0.5">
                    Select a platform to review and copy.
                  </p>
                </div>
                <button
                  onClick={handleRegenerate}
                  className="btn-secondary text-xs"
                  disabled={loading}
                >
                  Regenerate
                </button>
              </div>

              {/* Platform tabs */}
              <div
                className="flex overflow-x-auto"
                style={{ borderBottom: '0.75px solid #D9D8D6' }}
              >
                {PLATFORMS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setActiveTab(p.id)}
                    className={`flex items-center gap-1.5 px-4 py-3 text-[11px] font-medium uppercase tracking-[0.08em] whitespace-nowrap transition-colors`}
                    style={{
                      color: activeTab === p.id ? '#E3001B' : 'rgba(0,0,0,0.4)',
                      borderBottom: activeTab === p.id ? '1.5px solid #E3001B' : '1.5px solid transparent',
                    }}
                  >
                    <span className="text-sm">{p.icon}</span>
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Copy content */}
              <div className="p-6 space-y-5">
                {activeTab === 'youtube' && activeVariant ? (
                  <>
                    {/* YouTube title */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="section-label" style={{ marginBottom: 0 }}>Title</label>
                        <div className="flex items-center gap-3">
                          <span className={`text-xs font-[350] ${(activeVariant.title?.length || 0) > 60 ? 'text-cority-red' : 'text-black/30'}`}>
                            {activeVariant.title?.length || 0} / 60 chars
                          </span>
                          <CopyButton text={activeVariant.title || ''} />
                        </div>
                      </div>
                      <div
                        className="p-4 text-sm text-black font-[350] leading-relaxed"
                        style={{ border: '0.79px solid #D9D8D6', borderRadius: '6px', background: '#fafafa' }}
                      >
                        {activeVariant.title}
                      </div>
                    </div>

                    {/* YouTube description */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="section-label" style={{ marginBottom: 0 }}>Description</label>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-black/30 font-[350]">
                            {activeVariant.description?.length || 0} chars
                          </span>
                          <CopyButton text={activeVariant.description || ''} />
                        </div>
                      </div>
                      <div
                        className="p-4 text-sm text-black font-[350] leading-relaxed whitespace-pre-wrap"
                        style={{ border: '0.79px solid #D9D8D6', borderRadius: '6px', background: '#fafafa' }}
                      >
                        {activeVariant.description}
                      </div>
                    </div>
                  </>
                ) : activeVariant ? (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="section-label" style={{ marginBottom: 0 }}>{activePlatform?.label} Post</label>
                      <div className="flex items-center gap-3">
                        <CharCount text={activeVariant.copy} platform={activeTab} />
                        <CopyButton text={activeVariant.copy || ''} />
                      </div>
                    </div>
                    <div
                      className="p-4 text-sm text-black font-[350] leading-relaxed whitespace-pre-wrap"
                      style={{ border: '0.79px solid #D9D8D6', borderRadius: '6px', background: '#fafafa' }}
                    >
                      {activeVariant.copy}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-black/40 font-[350]">No copy available for this platform.</p>
                )}

                {/* Notes */}
                {activeVariant?.notes && (
                  <div
                    className="px-4 py-3"
                    style={{ border: '0.79px solid #D9D8D6', borderRadius: '6px' }}
                  >
                    <span className="section-label" style={{ marginBottom: '4px', display: 'block' }}>Format note</span>
                    <p className="text-xs text-black/50 font-[350] leading-relaxed">{activeVariant.notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
