import { useState, useEffect, useRef } from 'react'

// ── Constants ─────────────────────────────────────────────────────────────────
export const CAMPAIGNS = [
  'converge-ehs', 'safety-stronger', 'eb-emissions', 'eb-safer-stronger',
  'eb-human-centered', 'vtx-gq-ehs', 'vtx-gq-esg', 'vtx-gq-carbon',
  'vtx-oh-bg', 'vtx-ai-ehs', 'vtx-awards', 'coricon', 'cc-na-25',
  'cc-eu-25', 'cc-na-26', 'voc', 'tipdigi', 'tipee', 'tipesgs',
  'tiprisk', '3x-better', 'mkg-gen', 'vo1', 'mp-strat-proof',
  'cority-company', 'earthday', 'HT-IRA', 'SEA-FLU', 'GTM-CA-RS',
  'GTM-OEE', 'GTM-P2W', 'GTM-RE-TH', 'GTM-VTX-GQ-EHS', 'GTM-VTX-OH-BG',
]

export const CONTENT_TYPES_UTM = [
  'video', 'carousel', 'meme', 'infograph', 'article', 'ebook',
  'casestudy', 'whitepaper', 'lp', 'blog', 'pp', 'web-ad',
]

const SOURCES = ['linkedin', 'instagram', 'twitter', 'facebook', 'youtube']

const MEDIUM_BY_SOURCE = {
  linkedin:  ['social', 'paidsocial', 'pp'],
  instagram: ['social', 'paidsocial'],
  twitter:   ['social', 'paidsocial'],
  facebook:  ['social', 'paidsocial'],
  youtube:   ['social', 'paidsocial'],
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function buildUtmUrl(baseUrl, { source, medium, campaign, content, term }) {
  if (!baseUrl || !source || !medium || !campaign || !content) return ''
  try {
    const url = new URL(baseUrl)
    url.searchParams.set('utm_source',   source.toLowerCase())
    url.searchParams.set('utm_medium',   medium.toLowerCase())
    url.searchParams.set('utm_campaign', campaign.toLowerCase())
    url.searchParams.set('utm_content',  content.toLowerCase())
    if (term) url.searchParams.set('utm_term', term.toLowerCase().replace(/\s+/g, '-'))
    return url.toString()
  } catch {
    // Invalid URL — return raw with manual params
    const params = [
      `utm_source=${source.toLowerCase()}`,
      `utm_medium=${medium.toLowerCase()}`,
      `utm_campaign=${campaign.toLowerCase()}`,
      `utm_content=${content.toLowerCase()}`,
      ...(term ? [`utm_term=${term.toLowerCase().replace(/\s+/g, '-')}`] : []),
    ].join('&')
    return `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}${params}`
  }
}

// ── SearchableSelect ──────────────────────────────────────────────────────────
export function SearchableSelect({ options, value, onChange, placeholder = 'Select…' }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState(value || '')
  const containerRef = useRef(null)

  // Sync display text when value changes externally (e.g. form reset)
  useEffect(() => { setQuery(value || '') }, [value])

  // Close on outside click — mousedown fires before blur, element still in DOM
  useEffect(() => {
    function onMouseDown(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
        setQuery(value || '') // reset display to last committed value
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [value])

  const filtered = options.filter((o) =>
    o.toLowerCase().includes(query.toLowerCase())
  )

  function select(opt) {
    onChange(opt)
    setQuery(opt)
    setOpen(false)
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <input
        type="text"
        className="input"
        value={query}
        placeholder={placeholder}
        autoComplete="off"
        onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => { setQuery(''); setOpen(true) }}
      />
      {open && filtered.length > 0 && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 2px)', left: 0, right: 0,
          zIndex: 50, background: '#fff', border: '0.79px solid #D9D8D6',
          borderRadius: '6px', maxHeight: '200px', overflowY: 'auto',
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        }}>
          {filtered.map((opt) => (
            <div
              key={opt}
              onMouseDown={(e) => { e.preventDefault(); select(opt) }}
              style={{
                padding: '8px 12px', fontSize: '13px', cursor: 'pointer',
                background: opt === value ? '#FFF7F2' : 'transparent',
                fontWeight: opt === value ? 500 : 350,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#FFF7F2' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = opt === value ? '#FFF7F2' : 'transparent' }}
            >
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── CopyButton ────────────────────────────────────────────────────────────────
function CopyBtn({ text, label = 'Copy', className = 'btn-secondary text-xs px-3 py-1' }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return <button onClick={copy} className={className}>{copied ? '✓ Copied' : label}</button>
}

// ── UTM Log Row ───────────────────────────────────────────────────────────────
function LogRow({ utm }) {
  const date = utm.date ? new Date(utm.date).toLocaleDateString('en-CA') : '—'
  return (
    <tr style={{ borderBottom: '0.75px solid #D9D8D6' }}>
      <td className="py-3 pr-4 text-black/50 font-[350] whitespace-nowrap text-xs" style={{ paddingLeft: '24px' }}>{date}</td>
      <td className="py-3 pr-4 text-xs font-[350]" style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        <a href={utm.baseUrl} target="_blank" rel="noopener noreferrer" className="text-black hover:underline">{utm.baseUrl}</a>
      </td>
      <td className="py-3 pr-4 text-xs text-black/70 font-[350]">{utm.source}</td>
      <td className="py-3 pr-4 text-xs text-black/70 font-[350]">{utm.medium}</td>
      <td className="py-3 pr-4 text-xs text-black/70 font-[350]">{utm.campaign}</td>
      <td className="py-3 pr-4 text-xs text-black/70 font-[350]">{utm.content || '—'}</td>
      <td className="py-3 pr-4 text-xs text-black/50 font-[350]">{utm.briefId ? `brief-${utm.briefId}` : '—'}</td>
      <td className="py-3 pr-4 text-xs text-black/40 font-mono" style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {utm.fullUrl}
      </td>
      <td className="py-3">
        <CopyBtn text={utm.fullUrl || ''} />
      </td>
    </tr>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function UTMBuilder() {
  const [form, setForm] = useState({
    baseUrl: '', source: '', medium: '', campaign: '', content: '', term: '', briefId: '',
  })
  const [log, setLog] = useState([])
  const [briefs, setBriefs] = useState([])
  const [saving, setSaving] = useState(false)
  const [savedId, setSavedId] = useState(null)
  const [filter, setFilter] = useState({ source: '', medium: '', campaign: '' })
  const [warnings, setWarnings] = useState([])

  useEffect(() => {
    fetch('/api/utms').then((r) => r.json()).then((d) => Array.isArray(d) && setLog(d)).catch(() => {})
    fetch('/api/briefs').then((r) => r.json()).then((d) => Array.isArray(d) && setBriefs(d.slice(0, 30))).catch(() => {})
  }, [])

  // Auto-reset medium when source changes to an incompatible value
  useEffect(() => {
    if (form.source && form.medium) {
      const valid = MEDIUM_BY_SOURCE[form.source] || []
      if (!valid.includes(form.medium)) setForm((f) => ({ ...f, medium: '' }))
    }
  }, [form.source])

  // Warn on term issues
  useEffect(() => {
    const w = []
    if (form.term && /[A-Z]/.test(form.term)) w.push('utm_term has uppercase — it will be auto-lowercased in the URL.')
    if (form.term && /\s/.test(form.term)) w.push('utm_term has spaces — they will be replaced with hyphens.')
    setWarnings(w)
  }, [form.term])

  function setField(k, v) { setForm((f) => ({ ...f, [k]: v })); setSavedId(null) }

  const mediumOptions = MEDIUM_BY_SOURCE[form.source] || []
  const previewUrl = buildUtmUrl(form.baseUrl, form)
  const canSave = Boolean(previewUrl)

  async function handleSave() {
    if (!canSave) return
    setSaving(true)
    try {
      const res = await fetch('/api/utms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl: form.baseUrl,
          source: form.source.toLowerCase(),
          medium: form.medium.toLowerCase(),
          campaign: form.campaign.toLowerCase(),
          content: form.content.toLowerCase(),
          term: form.term ? form.term.toLowerCase().replace(/\s+/g, '-') : null,
          briefId: form.briefId || null,
          fullUrl: previewUrl,
        }),
      })
      if (res.ok) {
        const entry = await res.json()
        setLog((prev) => [entry, ...prev])
        setSavedId(entry.id)
      }
    } catch {}
    setSaving(false)
  }

  const filteredLog = log.filter((u) => {
    if (filter.source && u.source !== filter.source) return false
    if (filter.medium && u.medium !== filter.medium) return false
    if (filter.campaign && !(u.campaign || '').includes(filter.campaign.toLowerCase())) return false
    return true
  })

  return (
    <div className="space-y-8">

      {/* ── Builder form ───────────────────────────────────────────────── */}
      <div className="card p-8">
        <h2 className="text-base font-medium text-black mb-6">Generate UTM URL</h2>

        <div className="grid grid-cols-2 gap-5" style={{ maxWidth: '680px' }}>
          {/* Base URL — full width */}
          <div className="col-span-2">
            <label className="section-label">Base URL <span className="text-cority-red">*</span></label>
            <input type="url" className="input" placeholder="https://cority.com/..."
              value={form.baseUrl} onChange={(e) => setField('baseUrl', e.target.value)} />
          </div>

          {/* Source */}
          <div>
            <label className="section-label">utm_source <span className="text-cority-red">*</span></label>
            <select className="input" value={form.source} onChange={(e) => setField('source', e.target.value)}>
              <option value="">Select source…</option>
              {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Medium — filtered by source */}
          <div>
            <label className="section-label">utm_medium <span className="text-cority-red">*</span></label>
            <select className="input" value={form.medium} onChange={(e) => setField('medium', e.target.value)} disabled={!form.source}>
              <option value="">{form.source ? 'Select medium…' : 'Select source first'}</option>
              {mediumOptions.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          {/* Campaign — searchable */}
          <div>
            <label className="section-label">utm_campaign <span className="text-cority-red">*</span></label>
            <SearchableSelect options={CAMPAIGNS} value={form.campaign}
              onChange={(v) => setField('campaign', v)} placeholder="Search campaigns…" />
          </div>

          {/* Content */}
          <div>
            <label className="section-label">utm_content <span className="text-cority-red">*</span></label>
            <select className="input" value={form.content} onChange={(e) => setField('content', e.target.value)}>
              <option value="">Select content type…</option>
              {CONTENT_TYPES_UTM.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Term — optional */}
          <div>
            <label className="section-label">utm_term <span className="text-black/40 normal-case">(optional)</span></label>
            <input className="input" placeholder="e.g. safety, cortex-ai, ehs-manager"
              value={form.term} onChange={(e) => setField('term', e.target.value)} />
          </div>

          {/* Link to Brief */}
          <div>
            <label className="section-label">Link to Brief <span className="text-black/40 normal-case">(optional)</span></label>
            <select className="input" value={form.briefId} onChange={(e) => setField('briefId', e.target.value)}>
              <option value="">— None —</option>
              {briefs.map((b) => (
                <option key={b.id} value={String(b.id)}>
                  {b.description?.slice(0, 55)} · {b.deadline}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="mt-4 text-xs font-[350] px-3 py-2 text-cority-red"
            style={{ border: '0.79px solid #D35F0B', borderRadius: '6px', maxWidth: '680px' }}>
            {warnings.map((w, i) => <p key={i}>⚠ {w}</p>)}
          </div>
        )}

        {/* Live preview */}
        <div className="mt-6" style={{ maxWidth: '680px' }}>
          <label className="section-label">Live Preview</label>
          <div className="p-3 text-xs font-mono font-[350] text-black/60 break-all"
            style={{ border: '0.79px solid #D9D8D6', borderRadius: '6px', background: '#fafafa', minHeight: '44px' }}>
            {previewUrl || <span className="text-black/30">Fill required fields to preview UTM URL…</span>}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 mt-4">
          {previewUrl && <CopyBtn text={previewUrl} label="Copy URL" className="btn-secondary" />}
          <button className="btn-primary" disabled={!canSave || saving} onClick={handleSave}>
            {saving ? 'Saving…' : savedId ? '✓ Saved to Log' : 'Save to Log'}
          </button>
        </div>
      </div>

      {/* ── UTM Log ────────────────────────────────────────────────────── */}
      <div className="card">
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '0.75px solid #D9D8D6' }}>
          <p className="font-medium text-black text-sm">UTM Log <span className="text-xs text-black/40 font-[350] ml-2">{filteredLog.length} entries</span></p>
          <button className="btn-secondary text-xs" onClick={() => { window.location.href = '/api/utms?export=csv' }}>
            Export CSV
          </button>
        </div>

        {/* Filters */}
        <div className="px-6 py-4 flex flex-wrap gap-4" style={{ borderBottom: '0.75px solid #D9D8D6' }}>
          <div>
            <label className="section-label">Source</label>
            <select className="input text-xs py-1.5" style={{ width: 'auto', minWidth: '130px' }}
              value={filter.source} onChange={(e) => setFilter((f) => ({ ...f, source: e.target.value }))}>
              <option value="">All sources</option>
              {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="section-label">Medium</label>
            <select className="input text-xs py-1.5" style={{ width: 'auto', minWidth: '130px' }}
              value={filter.medium} onChange={(e) => setFilter((f) => ({ ...f, medium: e.target.value }))}>
              <option value="">All mediums</option>
              {['social', 'paidsocial', 'pp'].map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="section-label">Campaign</label>
            <input className="input text-xs py-1.5" style={{ width: '180px' }}
              placeholder="Filter by campaign…" value={filter.campaign}
              onChange={(e) => setFilter((f) => ({ ...f, campaign: e.target.value }))} />
          </div>
        </div>

        {filteredLog.length === 0 ? (
          <p className="text-sm text-black/40 font-[350] text-center py-12">
            {log.length === 0 ? 'No UTMs saved yet. Generate one above.' : 'No results match your filters.'}
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#FAFAFA', borderBottom: '0.75px solid #D9D8D6' }}>
                  {['Date', 'Base URL', 'Source', 'Medium', 'Campaign', 'Content', 'Brief', 'Full UTM URL', ''].map((h, i) => (
                    <th key={h} style={{
                      padding: '8px 16px 8px',
                      paddingLeft: i === 0 ? '24px' : '16px',
                      textAlign: 'left',
                      fontSize: 9,
                      fontWeight: 500,
                      textTransform: 'uppercase',
                      letterSpacing: '1.38px',
                      color: 'rgba(0,0,0,0.4)',
                      whiteSpace: 'nowrap',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredLog.map((u) => <LogRow key={u.id} utm={u} />)}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
