import { useState } from 'react'
import { SearchableSelect, CAMPAIGNS, CONTENT_TYPES_UTM } from './UTMBuilder'

const CLOUDS = [
  'CorityOne', 'Health', 'Safety', 'Environmental',
  'Sustainability', 'Quality', 'Analytics', 'EHS+ Converge Studio',
]

const PLATFORMS = [
  { id: 'linkedin',  label: 'LinkedIn',  icon: '💼' },
  { id: 'instagram', label: 'Instagram', icon: '📸' },
  { id: 'x',        label: 'X',         icon: '✖️' },
  { id: 'facebook',  label: 'Facebook',  icon: '📘' },
  { id: 'youtube',   label: 'YouTube',   icon: '▶️' },
]

const ALL_PLATFORM_IDS = PLATFORMS.map((p) => p.id)
const CHAR_LIMITS = { linkedin: 3000, instagram: 2200, x: 280, facebook: 2000 }

// Platform → UTM source (instagram excluded — no clickable links in captions)
const UTM_SOURCE = {
  linkedin: 'linkedin',
  x: 'twitter', facebook: 'facebook', youtube: 'youtube',
}

// Build a UTM-tagged URL for a single platform
function buildPlatformUtm(baseUrl, { utmCampaign, utmContent, utmTerm, utmIsPromoted }, platformId) {
  if (!baseUrl) return null
  const source = UTM_SOURCE[platformId]
  if (!source) return null
  const medium = (platformId === 'linkedin' && utmIsPromoted) ? 'pp' : 'social'
  try {
    const url = new URL(baseUrl)
    url.searchParams.set('utm_source', source)
    url.searchParams.set('utm_medium', medium)
    if (utmCampaign) url.searchParams.set('utm_campaign', utmCampaign.toLowerCase())
    if (utmContent)  url.searchParams.set('utm_content',  utmContent.toLowerCase())
    if (utmTerm)     url.searchParams.set('utm_term', utmTerm.toLowerCase().replace(/\s+/g, '-'))
    return url.toString()
  } catch {
    const parts = [`utm_source=${source}`, `utm_medium=${medium}`]
    if (utmCampaign) parts.push(`utm_campaign=${utmCampaign.toLowerCase()}`)
    if (utmContent)  parts.push(`utm_content=${utmContent.toLowerCase()}`)
    if (utmTerm)     parts.push(`utm_term=${utmTerm.toLowerCase().replace(/\s+/g, '-')}`)
    return `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}${parts.join('&')}`
  }
}

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
    <button onClick={handleCopy} className="btn-secondary text-xs px-3 py-1.5">
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
    platforms: [...ALL_PLATFORM_IDS],
    // UTM fields
    utmCampaign: '',
    utmContent: '',
    utmTerm: '',
    utmIsPromoted: false,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)
  const [activeTab, setActiveTab] = useState('linkedin')
  const [platformUtms, setPlatformUtms] = useState({}) // { linkedin: url, instagram: url, ... }

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

  function togglePlatform(id) {
    setForm((f) => ({
      ...f,
      platforms: f.platforms.includes(id)
        ? f.platforms.filter((p) => p !== id)
        : [...f.platforms, id],
    }))
  }

  async function submit() {
    if (form.platforms.length === 0) {
      setError('Select at least one platform.')
      return
    }
    setLoading(true)
    setError(null)
    setResult(null)
    setPlatformUtms({})
    try {
      const res = await fetch('/api/generate-copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: form.description,
          deadline: form.deadline,
          audience: form.audience,
          goal: form.goal,
          url: form.url || null,
          suggestedCopy: form.suggestedCopy || null,
          clouds: form.clouds,
          platforms: form.platforms,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Something went wrong.')
      setResult(data)
      const firstTab = PLATFORMS.find((p) => data.variants?.[p.id])?.id || 'linkedin'
      setActiveTab(firstTab)

      // Build per-platform UTM URLs and auto-save to log
      if (form.url) {
        const utms = {}
        for (const platformId of Object.keys(data.variants || {})) {
          const utmUrl = buildPlatformUtm(form.url, form, platformId)
          if (utmUrl) utms[platformId] = utmUrl
        }
        setPlatformUtms(utms)

        // Auto-save each platform's UTM to the log (fire-and-forget)
        for (const [platformId, fullUrl] of Object.entries(utms)) {
          const source = UTM_SOURCE[platformId]
          const medium = (platformId === 'linkedin' && form.utmIsPromoted) ? 'pp' : 'social'
          if (form.utmCampaign && form.utmContent) {
            fetch('/api/utms', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                baseUrl: form.url,
                source,
                medium,
                campaign: form.utmCampaign.toLowerCase(),
                content: form.utmContent.toLowerCase(),
                term: form.utmTerm ? form.utmTerm.toLowerCase().replace(/\s+/g, '-') : null,
                briefId: data.briefId || null,
                fullUrl,
              }),
            }).catch(() => {})
          }
        }
      }

      setTimeout(() => {
        document.getElementById('results-section')?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function handleSubmit(e) {
    e.preventDefault()
    submit()
  }

  function handleRegenerate() {
    submit()
  }

  const resultPlatforms = PLATFORMS.filter((p) => result?.variants?.[p.id])
  const activePlatform = PLATFORMS.find((p) => p.id === activeTab)
  const activeVariant = result?.variants?.[activeTab]
  const activeUtmUrl = platformUtms[activeTab]

  return (
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
              placeholder="e.g. Announce our new Cortex AI incident prediction feature targeting EHS managers in manufacturing…"
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
            <label className="section-label">Suggested copy or angle</label>
            <textarea
              className="textarea"
              rows={3}
              placeholder="Paste any existing copy, talking points, or a direction you want to explore…"
              value={form.suggestedCopy}
              onChange={(e) => handleField('suggestedCopy', e.target.value)}
            />
          </div>

          <div>
            <label className="section-label">Platforms <span className="text-cority-red">*</span></label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((p) => {
                const selected = form.platforms.includes(p.id)
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => togglePlatform(p.id)}
                    className="tag transition-colors"
                    style={{
                      backgroundColor: selected ? '#D35F0B' : '#ffffff',
                      color: selected ? '#ffffff' : '#000000',
                      borderColor: selected ? '#D35F0B' : '#D9D8D6',
                      cursor: 'pointer',
                    }}
                  >
                    {p.icon} {p.label}
                  </button>
                )
              })}
            </div>
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
                      backgroundColor: selected ? '#D35F0B' : '#ffffff',
                      color: selected ? '#ffffff' : '#000000',
                      borderColor: selected ? '#D35F0B' : '#D9D8D6',
                      cursor: 'pointer',
                    }}
                  >
                    {cloud}
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── URL + UTM section ── */}
          <div className="space-y-3">
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

            {/* UTM fields — always visible, optional */}
            <div
              className="space-y-3 pt-3"
              style={{ borderTop: '0.75px solid #D9D8D6' }}
            >
              <div className="flex items-center justify-between">
                <p className="text-[9px] font-medium uppercase tracking-[1.38px] text-black/40">
                  UTM Tracking <span className="normal-case font-[350]">— source &amp; medium auto-assigned per platform</span>
                </p>
                <a
                  href="/utm-guide.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-black/40 hover:text-black font-[350] transition-colors underline"
                >
                  View UTM guide
                </a>
              </div>

              <div>
                <label className="section-label">utm_campaign</label>
                <SearchableSelect
                  options={CAMPAIGNS}
                  value={form.utmCampaign}
                  onChange={(v) => handleField('utmCampaign', v)}
                  placeholder="Search campaigns…"
                />
              </div>

              <div>
                <label className="section-label">utm_content</label>
                <select
                  className="input"
                  value={form.utmContent}
                  onChange={(e) => handleField('utmContent', e.target.value)}
                >
                  <option value="">— select content type —</option>
                  {CONTENT_TYPES_UTM.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="section-label">utm_term <span className="text-black/40 normal-case">(optional)</span></label>
                <input
                  className="input"
                  placeholder="e.g. safety, cortex-ai, ehs-manager"
                  value={form.utmTerm}
                  onChange={(e) => handleField('utmTerm', e.target.value)}
                />
              </div>

              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.utmIsPromoted}
                  onChange={(e) => handleField('utmIsPromoted', e.target.checked)}
                  className="w-3.5 h-3.5 accent-cority-red"
                />
                <span className="text-xs text-black/60 font-[350]">
                  Promoted post — LinkedIn gets <code className="text-[10px] bg-black/5 px-1 rounded">utm_medium=pp</code>
                </span>
              </label>
            </div>
          </div>

          {error && (
            <div
              className="text-sm text-cority-red font-[350] p-3"
              style={{ border: '0.79px solid #D35F0B', borderRadius: '6px' }}
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
            style={{ border: '0.79px dashed #D9D8D6', borderRadius: '6px', padding: '80px 40px' }}
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
            style={{ border: '0.79px solid #D9D8D6', borderRadius: '6px', padding: '80px 40px' }}
          >
            <div className="text-4xl mb-4">⏳</div>
            <p className="text-sm font-medium text-black mb-1">Drafting copy…</p>
            <p className="text-sm text-black/40 font-[350]">
              Claude is writing {form.platforms.length} platform variant{form.platforms.length !== 1 ? 's' : ''} anchored to Cority brand strategy.
            </p>
          </div>
        )}

        {result && !loading && (
          <div className="card">
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {result?.briefId && (
                  <a
                    href={`/content-studio?section=design&briefId=${result.briefId}`}
                    style={{
                      fontSize: 11,
                      color: '#D35F0B',
                      fontWeight: 400,
                      textDecoration: 'none',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Create graphic →
                  </a>
                )}
                <button onClick={handleRegenerate} className="btn-secondary text-xs" disabled={loading}>
                  Regenerate
                </button>
              </div>
            </div>

            <div className="flex overflow-x-auto" style={{ borderBottom: '0.75px solid #D9D8D6' }}>
              {resultPlatforms.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setActiveTab(p.id)}
                  className="flex items-center gap-1.5 px-4 py-3 text-[11px] font-medium uppercase tracking-[0.08em] whitespace-nowrap transition-colors"
                  style={{
                    color: activeTab === p.id ? '#D35F0B' : 'rgba(0,0,0,0.4)',
                    borderBottom: activeTab === p.id ? '1.5px solid #D35F0B' : '1.5px solid transparent',
                  }}
                >
                  <span className="text-sm">{p.icon}</span>
                  {p.label}
                </button>
              ))}
            </div>

            <div className="p-6 space-y-5">
              {activeTab === 'youtube' && activeVariant ? (
                <>
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

              {/* Per-platform UTM URL — Instagram shows bio note instead */}
              {activeTab === 'instagram' ? (
                <div
                  className="px-4 py-3 text-xs text-black/50 font-[350]"
                  style={{ border: '0.79px solid #D9D8D6', borderRadius: '6px', background: '#fafafa' }}
                >
                  Instagram does not support clickable links in captions. Add your link to your bio or use a link-in-bio tool.
                </div>
              ) : activeUtmUrl ? (
                <div
                  className="flex items-start justify-between gap-4 p-4"
                  style={{ border: '0.79px solid #D9D8D6', borderRadius: '6px', background: '#fafafa' }}
                >
                  <div className="min-w-0">
                    <p className="section-label mb-1" style={{ marginBottom: '4px' }}>UTM-tagged URL</p>
                    <p className="text-xs text-black/50 font-mono font-[350] break-all leading-relaxed">{activeUtmUrl}</p>
                  </div>
                  <CopyButton text={activeUtmUrl} />
                </div>
              ) : null}

              {activeVariant?.notes && (
                <div className="px-4 py-3" style={{ border: '0.79px solid #D9D8D6', borderRadius: '6px' }}>
                  <span className="section-label" style={{ marginBottom: '4px', display: 'block' }}>Format note</span>
                  <p className="text-xs text-black/50 font-[350] leading-relaxed">{activeVariant.notes}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
