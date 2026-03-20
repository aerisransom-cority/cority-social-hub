import { useState } from 'react'
import { useSession } from 'next-auth/react'
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

// ── Content type config ──────────────────────────────────────────────────────

const CONTENT_TYPE_OPTIONS = [
  { id: 'text-post',    label: 'Text post / link post', desc: 'Caption only — formatted per platform.' },
  { id: 'video-post',   label: 'Video post',            desc: 'Video caption — formatted per platform.' },
  { id: 'carousel',     label: 'Carousel',              desc: 'Caption + slide copy (hook, body slides, CTA slide).' },
  { id: 'graphic',      label: 'Graphic / image',       desc: 'Caption + asset copy (headline + subheadline).' },
  { id: 'infographic',  label: 'Infographic',           desc: 'Caption + structured key points.' },
  { id: 'youtube',      label: 'YouTube',               desc: 'Title, description, and script outline (YouTube tab) + promo caption for other platforms.' },
  { id: 'video-script', label: 'Video script',          desc: 'Caption + full word-for-word script with stage directions.' },
]

const VISUAL_TYPES = new Set(['carousel', 'graphic', 'infographic', 'youtube', 'video-script'])

const ASSET_FORMAT_PLACEHOLDER = {
  carousel:       'e.g. 5 slides, one key stat per slide, data-driven format',
  graphic:        'e.g. quote card with pull quote and attribution',
  infographic:    'e.g. vertical step-by-step process, 4 stages, icon-driven',
  youtube:        'e.g. 3-minute talking head with b-roll, educational tone',
  'video-script': 'e.g. 90-second LinkedIn short-form, presenter to camera',
}

// Map content type → UTM content value (where a match exists)
const CONTENT_TYPE_TO_UTM = {
  'video-post':   'video',
  carousel:       'carousel',
  infographic:    'infograph',
  youtube:        'video',
  'video-script': 'video',
}

// Output toggles shown in results panel per visual content type
const TOGGLE_CONFIG = {
  carousel:       [{ key: 'caption', label: 'Caption' }, { key: 'assetCopy', label: 'Slide copy' }],
  graphic:        [{ key: 'caption', label: 'Caption' }, { key: 'assetCopy', label: 'Asset copy' }],
  infographic:    [{ key: 'caption', label: 'Caption' }, { key: 'assetCopy', label: 'Asset copy' }],
  youtube:        [{ key: 'title', label: 'Title' }, { key: 'description', label: 'Description' }, { key: 'scriptOutline', label: 'Script outline' }],
  'video-script': [{ key: 'caption', label: 'Caption' }, { key: 'script', label: 'Script' }],
}

// Map suggestion contentType label → form contentType id
const SUGGESTION_TYPE_MAP = {
  carousel: 'carousel', video: 'video-post', 'short-form video': 'video-post',
  'text post': 'text-post', infographic: 'infographic', meme: 'text-post',
}

// ── Toggle switch component ──────────────────────────────────────────────────

function Toggle({ on, onChange, label }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', userSelect: 'none' }}>
      <div
        onClick={(e) => { e.preventDefault(); onChange(!on) }}
        style={{
          width: 28, height: 16, borderRadius: 8,
          background: on ? '#D35F0B' : '#D9D8D6',
          position: 'relative', flexShrink: 0, cursor: 'pointer',
          transition: 'background 0.15s',
        }}
      >
        <div style={{
          position: 'absolute', top: 2,
          left: on ? 14 : 2, width: 12, height: 12,
          borderRadius: '50%', background: '#fff',
          transition: 'left 0.15s',
        }} />
      </div>
      <span style={{ fontSize: 11, color: on ? '#000' : 'rgba(0,0,0,0.4)' }}>{label}</span>
    </label>
  )
}

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

// Map suggestion campaign ID → cloud name
const CAMPAIGN_TO_CLOUD = {
  environment: 'Environmental',
  safety: 'Safety',
}

// Map suggestion platform strings → form platform IDs
function suggestionPlatformsToIds(platforms) {
  const map = { twitter: 'x' }
  return (platforms || []).map((p) => map[p] || p).filter((id) => ALL_PLATFORM_IDS.includes(id))
}

export default function RequestBrief({ initialValues }) {
  const [form, setForm] = useState(() => {
    if (!initialValues) {
      return {
        description: '', deadline: '', audience: '', goal: '', url: '',
        suggestedCopy: '', clouds: [], platforms: [...ALL_PLATFORM_IDS],
        contentType: 'text-post', assetFormat: '',
        utmCampaign: '', utmContent: '', utmTerm: '', utmIsPromoted: false,
      }
    }
    const ids = suggestionPlatformsToIds(initialValues.platforms)
    const cloud = CAMPAIGN_TO_CLOUD[initialValues.suggestedCampaign] || ''
    const rawType = (initialValues.contentType || '').toLowerCase()
    const mappedType = SUGGESTION_TYPE_MAP[rawType] || 'text-post'
    return {
      description: initialValues.suggestedAngle || '',
      deadline: '',
      audience: initialValues.targetAudience || '',
      goal: initialValues.pillar || '',
      url: '', suggestedCopy: '',
      clouds: cloud ? [cloud] : [],
      platforms: ids.length > 0 ? ids : [...ALL_PLATFORM_IDS],
      contentType: mappedType, assetFormat: '',
      utmCampaign: '', utmContent: CONTENT_TYPE_TO_UTM[mappedType] || '', utmTerm: '', utmIsPromoted: false,
    }
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)
  const [activeTab, setActiveTab] = useState('linkedin')
  const [platformUtms, setPlatformUtms] = useState({}) // { linkedin: url, instagram: url, ... }
  const [utmExpanded, setUtmExpanded] = useState(false)
  const [debugPrompt, setDebugPrompt] = useState(null)
  const [outputToggles, setOutputToggles] = useState({})

  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'admin'

  function initToggles(contentType, platforms) {
    const config = TOGGLE_CONFIG[contentType]
    if (!config) return {}
    const t = {}
    for (const p of platforms) {
      t[p] = {}
      for (const item of config) t[p][item.key] = true
    }
    return t
  }

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
    setDebugPrompt(null)
    setOutputToggles({})
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
          contentType: form.contentType || 'text-post',
          assetFormat: form.assetFormat || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Something went wrong.')
      setResult(data)
      setDebugPrompt(data.debugPrompt || null)
      setOutputToggles(initToggles(form.contentType, Object.keys(data.variants || {})))
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
            <label className="section-label">
              Content type <span className="text-cority-red">*</span>
            </label>
            <select
              className="input"
              value={form.contentType}
              onChange={(e) => {
                const ct = e.target.value
                handleField('contentType', ct)
                handleField('assetFormat', '')
                const utmVal = CONTENT_TYPE_TO_UTM[ct]
                if (utmVal) handleField('utmContent', utmVal)
              }}
            >
              {CONTENT_TYPE_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
            {CONTENT_TYPE_OPTIONS.find((o) => o.id === form.contentType) && (
              <p className="text-[10px] text-black/40 font-[350] mt-1.5">
                {CONTENT_TYPE_OPTIONS.find((o) => o.id === form.contentType).desc}
              </p>
            )}
            {VISUAL_TYPES.has(form.contentType) && (
              <div className="mt-3">
                <label className="section-label">Describe your asset format <span className="text-black/30 normal-case">(optional)</span></label>
                <input
                  className="input"
                  placeholder={ASSET_FORMAT_PLACEHOLDER[form.contentType] || ''}
                  value={form.assetFormat}
                  onChange={(e) => handleField('assetFormat', e.target.value)}
                />
              </div>
            )}
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
                {result.sourceDocs?.length > 0 && (
                  <div className="flex items-center gap-1.5 mt-2">
                    <span
                      title={`Referenced: ${result.sourceDocs.map((d) => d.docName).join(', ')}`}
                      style={{ fontSize: 10, fontWeight: 500, color: '#49763E', background: '#EFF6EE', borderRadius: 3, padding: '2px 7px', cursor: 'default' }}
                    >
                      📚 Knowledge base used
                    </span>
                    <span className="text-[10px] text-black/35 font-[350]">
                      {result.sourceDocs.map((d) => d.docName).join(', ')}
                    </span>
                  </div>
                )}
                {isAdmin && debugPrompt && (
                  <details style={{ marginTop: 6 }}>
                    <summary style={{ fontSize: 10, color: 'rgba(0,0,0,0.3)', cursor: 'pointer', userSelect: 'none', listStyle: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <span>▸</span> View prompt
                    </summary>
                    <pre style={{ marginTop: 6, fontSize: 10, color: 'rgba(0,0,0,0.5)', background: '#F9F9F9', border: '0.75px solid #E5E5E5', borderRadius: 4, padding: '10px 12px', whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 320, overflowY: 'auto', fontWeight: 350, lineHeight: 1.5 }}>
                      {debugPrompt.systemPrompt}
                    </pre>
                  </details>
                )}
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
              {(() => {
                const ct = result.contentType || 'text-post'
                const toggleCfg = TOGGLE_CONFIG[ct]
                const ptoggle = outputToggles[activeTab] || {}

                if (!activeVariant) return (
                  <p className="text-sm text-black/40 font-[350]">No copy available for this platform.</p>
                )

                // ── Shared helpers ──────────────────────────────────────────
                const boxStyle = { border: '0.79px solid #D9D8D6', borderRadius: '6px', background: '#fafafa' }

                function FieldRow({ label, charText, onCopy, children }) {
                  // charText may be a string, a number string, or a JSX node (e.g. <CharCount>)
                  const charNode = typeof charText === 'string'
                    ? <span className="text-xs text-black/30 font-[350]">{charText}</span>
                    : charText
                  return (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="section-label" style={{ marginBottom: 0 }}>{label}</label>
                        <div className="flex items-center gap-3">
                          {charNode}
                          <CopyButton text={onCopy} />
                        </div>
                      </div>
                      {children}
                    </div>
                  )
                }

                const toggleBar = toggleCfg && (
                  <div className="flex items-center gap-5 pb-3" style={{ borderBottom: '0.75px solid #D9D8D6' }}>
                    {toggleCfg.map((t) => (
                      <Toggle
                        key={t.key}
                        on={ptoggle[t.key] !== false}
                        onChange={(v) => setOutputToggles((prev) => ({
                          ...prev,
                          [activeTab]: { ...(prev[activeTab] || {}), [t.key]: v },
                        }))}
                        label={t.label}
                      />
                    ))}
                  </div>
                )

                // ── YouTube type on YouTube platform ────────────────────────
                if (ct === 'youtube' && activeTab === 'youtube') {
                  return (
                    <>
                      {toggleBar}
                      {ptoggle.title !== false && (
                        <FieldRow
                          label="Title"
                          charText={`${activeVariant.title?.length || 0} / 60 chars`}
                          onCopy={activeVariant.title || ''}
                        >
                          <div className="p-4 text-sm text-black font-[350] leading-relaxed" style={boxStyle}>
                            {activeVariant.title}
                          </div>
                        </FieldRow>
                      )}
                      {ptoggle.description !== false && (
                        <FieldRow
                          label="Description"
                          charText={`${activeVariant.description?.length || 0} chars`}
                          onCopy={activeVariant.description || ''}
                        >
                          <div className="p-4 text-sm text-black font-[350] leading-relaxed whitespace-pre-wrap" style={boxStyle}>
                            {activeVariant.description}
                          </div>
                        </FieldRow>
                      )}
                      {ptoggle.scriptOutline !== false && activeVariant.scriptOutline && (
                        <FieldRow label="Script outline" onCopy={activeVariant.scriptOutline || ''}>
                          <div className="p-4 text-sm text-black font-[350] leading-relaxed whitespace-pre-wrap" style={boxStyle}>
                            {activeVariant.scriptOutline}
                          </div>
                        </FieldRow>
                      )}
                    </>
                  )
                }

                // ── YouTube type on non-YouTube platform (promo caption) ────
                if (ct === 'youtube' && activeTab !== 'youtube') {
                  return (
                    <FieldRow
                      label={`${activePlatform?.label} Promo Caption`}
                      charText={activeVariant.caption ? `${activeVariant.caption.length} chars` : null}
                      onCopy={activeVariant.caption || ''}
                    >
                      <div className="p-4 text-sm text-black font-[350] leading-relaxed whitespace-pre-wrap" style={boxStyle}>
                        {activeVariant.caption}
                      </div>
                    </FieldRow>
                  )
                }

                // ── Visual types: carousel, graphic, infographic ────────────
                if (['carousel', 'graphic', 'infographic'].includes(ct)) {
                  const assetLabel = ct === 'carousel' ? 'Slide copy' : 'Asset copy'
                  return (
                    <>
                      {toggleBar}
                      {ptoggle.caption !== false && (
                        <FieldRow
                          label="Caption"
                          charText={<CharCount text={activeVariant.caption} platform={activeTab} />}
                          onCopy={activeVariant.caption || ''}
                        >
                          <div className="p-4 text-sm text-black font-[350] leading-relaxed whitespace-pre-wrap" style={boxStyle}>
                            {activeVariant.caption}
                          </div>
                        </FieldRow>
                      )}
                      {ptoggle.assetCopy !== false && activeVariant.assetCopy && (
                        <FieldRow label={assetLabel} onCopy={activeVariant.assetCopy || ''}>
                          <div className="p-4 text-sm text-black font-[350] leading-relaxed whitespace-pre-wrap" style={{ ...boxStyle, fontFamily: 'monospace', fontSize: 12 }}>
                            {activeVariant.assetCopy}
                          </div>
                        </FieldRow>
                      )}
                    </>
                  )
                }

                // ── Video script ────────────────────────────────────────────
                if (ct === 'video-script') {
                  return (
                    <>
                      {toggleBar}
                      {ptoggle.caption !== false && (
                        <FieldRow
                          label="Caption"
                          charText={<CharCount text={activeVariant.caption} platform={activeTab} />}
                          onCopy={activeVariant.caption || ''}
                        >
                          <div className="p-4 text-sm text-black font-[350] leading-relaxed whitespace-pre-wrap" style={boxStyle}>
                            {activeVariant.caption}
                          </div>
                        </FieldRow>
                      )}
                      {ptoggle.script !== false && activeVariant.script && (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <label className="section-label" style={{ marginBottom: 0 }}>Script</label>
                              {activeVariant.estimatedDuration && (
                                <span className="text-[10px] text-black/35 font-[350]">~ {activeVariant.estimatedDuration}</span>
                              )}
                            </div>
                            <CopyButton text={activeVariant.script || ''} />
                          </div>
                          <div className="p-4 text-sm text-black font-[350] leading-relaxed whitespace-pre-wrap" style={boxStyle}>
                            {activeVariant.script}
                          </div>
                        </div>
                      )}
                    </>
                  )
                }

                // ── Standard YouTube platform for non-YouTube content types ─
                if (activeTab === 'youtube') {
                  return (
                    <>
                      <FieldRow
                        label="Title"
                        charText={`${activeVariant.title?.length || 0} / 60 chars`}
                        onCopy={activeVariant.title || ''}
                      >
                        <div className="p-4 text-sm text-black font-[350] leading-relaxed" style={boxStyle}>
                          {activeVariant.title}
                        </div>
                      </FieldRow>
                      <FieldRow
                        label="Description"
                        charText={`${activeVariant.description?.length || 0} chars`}
                        onCopy={activeVariant.description || ''}
                      >
                        <div className="p-4 text-sm text-black font-[350] leading-relaxed whitespace-pre-wrap" style={boxStyle}>
                          {activeVariant.description}
                        </div>
                      </FieldRow>
                    </>
                  )
                }

                // ── Default: text-post, video-post ──────────────────────────
                return (
                  <FieldRow
                    label={`${activePlatform?.label} Post`}
                    charText={<CharCount text={activeVariant.copy} platform={activeTab} />}
                    onCopy={activeVariant.copy || ''}
                  >
                    <div className="p-4 text-sm text-black font-[350] leading-relaxed whitespace-pre-wrap" style={boxStyle}>
                      {activeVariant.copy}
                    </div>
                  </FieldRow>
                )
              })()}

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

            {/* ── Collapsible UTM summary ── */}
            {Object.keys(platformUtms).length > 0 && (
              <div style={{ borderTop: '0.75px solid #D9D8D6' }}>
                <button
                  onClick={() => setUtmExpanded((v) => !v)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 24px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <span style={{ fontSize: 9, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.4)' }}>
                    {utmExpanded ? '▾' : '▸'} UTM URLs — this brief
                  </span>
                  {utmExpanded && (
                    <span
                      onClick={(e) => {
                        e.stopPropagation()
                        const rows = [['Platform', 'Source', 'Medium', 'Campaign', 'Content', 'Term', 'Full URL']]
                        for (const [pid, url] of Object.entries(platformUtms)) {
                          const src = UTM_SOURCE[pid]
                          if (!src) continue
                          const med = (pid === 'linkedin' && form.utmIsPromoted) ? 'pp' : 'social'
                          const plat = PLATFORMS.find((p) => p.id === pid)?.label || pid
                          rows.push([plat, src, med, form.utmCampaign || '', form.utmContent || '', form.utmTerm || '', url])
                        }
                        const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
                        const a = document.createElement('a')
                        a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
                        a.download = `utms-brief-${result.briefId || Date.now()}.csv`
                        a.click()
                      }}
                      style={{
                        fontSize: 11,
                        padding: '2px 10px',
                        border: '0.79px solid #D9D8D6',
                        borderRadius: 4,
                        background: '#fff',
                        color: 'rgba(0,0,0,0.5)',
                        cursor: 'pointer',
                        fontWeight: 400,
                      }}
                    >
                      Export CSV
                    </span>
                  )}
                </button>

                {utmExpanded && (
                  <div style={{ overflowX: 'auto', borderTop: '0.75px solid #D9D8D6' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                      <thead>
                        <tr style={{ background: '#FAFAFA' }}>
                          {['Platform', 'Campaign', 'UTM-tagged URL', ''].map((h) => (
                            <th key={h} style={{ padding: '6px 12px', textAlign: 'left', fontWeight: 500, color: 'rgba(0,0,0,0.4)', whiteSpace: 'nowrap', borderBottom: '0.75px solid #D9D8D6' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(platformUtms).map(([pid, url]) => {
                          const plat = PLATFORMS.find((p) => p.id === pid)
                          return (
                            <tr key={pid} style={{ borderBottom: '0.75px solid #D9D8D6' }}>
                              <td style={{ padding: '8px 12px', whiteSpace: 'nowrap', color: '#000', fontWeight: 400 }}>
                                {plat?.icon} {plat?.label || pid}
                              </td>
                              <td style={{ padding: '8px 12px', whiteSpace: 'nowrap', color: 'rgba(0,0,0,0.5)' }}>
                                {form.utmCampaign || <span style={{ fontStyle: 'italic', color: 'rgba(0,0,0,0.3)' }}>—</span>}
                              </td>
                              <td style={{ padding: '8px 12px', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                <span style={{ fontFamily: 'monospace', color: 'rgba(0,0,0,0.5)', fontSize: 10 }}>{url}</span>
                              </td>
                              <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                                <CopyButton text={url} />
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
