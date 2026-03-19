import { useState, useEffect, useRef } from 'react'

const PLATFORMS = ['LinkedIn', 'Instagram', 'X', 'Facebook', 'YouTube']
const STATUSES = ['Draft', 'Scheduled', 'Posted']
const CONTENT_TYPES = ['Post', 'Carousel', 'Video', 'Short', 'Meme', 'Article', 'Story']

const STATUS_STYLE = {
  Draft:     { bg: '#ffffff', border: '#D9D8D6', color: '#000000' },
  Scheduled: { bg: '#FFF7ED', border: '#D35F0B', color: '#D35F0B' },
  Posted:    { bg: '#F0F7EE', border: '#49763E', color: '#49763E' },
}

const PLATFORM_DOT = {
  LinkedIn:  '#0077B5',
  Instagram: '#E1306C',
  X:         '#000000',
  Facebook:  '#1877F2',
  YouTube:   '#FF0000',
}

// Lowercase key → display label
const PLATFORM_LABEL = {
  linkedin: 'LinkedIn', instagram: 'Instagram',
  x: 'X', facebook: 'Facebook', youtube: 'YouTube',
}

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}
function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay()
}

// ─── Copy panel helpers ───────────────────────────────────────────────────────

function variantPlatforms(variants) {
  if (!variants) return []
  return Object.keys(variants).filter((k) => variants[k])
}

function CopyTabContent({ platformKey, variant, editMode, onChange }) {
  const isYouTube = platformKey === 'youtube'

  if (!variant) return (
    <p className="text-sm text-black/40 font-[350] py-4">No copy for this platform.</p>
  )

  if (isYouTube) {
    return (
      <div className="space-y-4">
        <div>
          <p className="section-label mb-1">Title</p>
          {editMode ? (
            <input
              className="input text-sm"
              value={variant.title || ''}
              onChange={(e) => onChange({ ...variant, title: e.target.value })}
            />
          ) : (
            <p className="text-sm text-black font-[350] whitespace-pre-wrap">{variant.title}</p>
          )}
        </div>
        <div>
          <p className="section-label mb-1">Description</p>
          {editMode ? (
            <textarea
              className="textarea text-sm"
              rows={8}
              value={variant.description || ''}
              onChange={(e) => onChange({ ...variant, description: e.target.value })}
            />
          ) : (
            <p className="text-sm text-black font-[350] whitespace-pre-wrap leading-relaxed">{variant.description}</p>
          )}
        </div>
        {(variant.notes || editMode) && (
          <div>
            <p className="section-label mb-1">Notes</p>
            {editMode ? (
              <textarea
                className="textarea text-sm"
                rows={2}
                value={variant.notes || ''}
                onChange={(e) => onChange({ ...variant, notes: e.target.value })}
              />
            ) : (
              <p className="text-xs text-black/50 font-[350] italic">{variant.notes}</p>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="section-label mb-1">Copy</p>
        {editMode ? (
          <textarea
            className="textarea text-sm"
            rows={7}
            value={variant.copy || ''}
            onChange={(e) => onChange({ ...variant, copy: e.target.value })}
          />
        ) : (
          <p className="text-sm text-black font-[350] whitespace-pre-wrap leading-relaxed">{variant.copy}</p>
        )}
      </div>
      {(variant.notes || editMode) && (
        <div>
          <p className="section-label mb-1">Notes</p>
          {editMode ? (
            <textarea
              className="textarea text-sm"
              rows={2}
              value={variant.notes || ''}
              onChange={(e) => onChange({ ...variant, notes: e.target.value })}
            />
          ) : (
            <p className="text-xs text-black/50 font-[350] italic">{variant.notes}</p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function EditorialCalendar() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [entries, setEntries] = useState([])
  const [filterPlatform, setFilterPlatform] = useState('All')
  const [filterStatus, setFilterStatus] = useState('All')

  // Entry metadata form (add/edit)
  const [showForm, setShowForm] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [dragId, setDragId] = useState(null)
  const [editEntry, setEditEntry] = useState(null)
  const [form, setForm] = useState({
    title: '', platform: 'LinkedIn', contentType: 'Post',
    scheduledDate: '', status: 'Draft', notes: '',
  })

  // Detail / copy panel
  const [detailEntry, setDetailEntry] = useState(null)
  const [copyVariants, setCopyVariants] = useState(null)   // { linkedin: {...}, ... }
  const [editCopy, setEditCopy] = useState(null)           // editable copy state
  const [copyEditMode, setCopyEditMode] = useState(false)
  const [activeCopyTab, setActiveCopyTab] = useState(null)
  const [savingCopy, setSavingCopy] = useState(null)       // null | 'all' | platformKey
  const [copyLoading, setCopyLoading] = useState(false)

  // Toast
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)

  useEffect(() => { loadEntries() }, [])

  // Load copy when detail panel opens
  useEffect(() => {
    if (!detailEntry) return
    setCopyVariants(null)
    setEditCopy(null)
    setCopyEditMode(false)
    setSavingCopy(null)

    // Use copy already stored on the calendar entry
    if (detailEntry.copy && Object.keys(detailEntry.copy).length > 0) {
      setCopyVariants(detailEntry.copy)
      setEditCopy(JSON.parse(JSON.stringify(detailEntry.copy)))
      setActiveCopyTab(Object.keys(detailEntry.copy)[0])
      return
    }

    // Fall back to the linked brief's variants
    if (detailEntry.briefId) {
      setCopyLoading(true)
      fetch(`/api/briefs?id=${detailEntry.briefId}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((brief) => {
          if (brief?.variants) {
            setCopyVariants(brief.variants)
            setEditCopy(JSON.parse(JSON.stringify(brief.variants)))
            setActiveCopyTab(Object.keys(brief.variants)[0])
          }
        })
        .catch(() => {})
        .finally(() => setCopyLoading(false))
    }
  }, [detailEntry?.id])

  function showToast(msg) {
    setToast(msg)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 3000)
  }

  async function loadEntries() {
    try {
      const res = await fetch('/api/calendar')
      if (res.ok) setEntries(await res.json())
    } catch {}
  }

  // ── Entry metadata save ──
  async function saveEntry(e) {
    e.preventDefault()
    setSaveError(null)
    setSaving(true)
    const method = editEntry ? 'PATCH' : 'POST'
    const body = editEntry ? { id: editEntry.id, ...form } : form
    try {
      const res = await fetch('/api/calendar', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        await loadEntries()
        setShowForm(false)
        setEditEntry(null)
        setSaveError(null)
        setForm({ title: '', platform: 'LinkedIn', contentType: 'Post', scheduledDate: '', status: 'Draft', notes: '' })
      } else {
        const data = await res.json().catch(() => ({}))
        setSaveError(data.error || `Save failed (${res.status}). Check that you're logged in.`)
      }
    } catch (err) {
      setSaveError(err.message || 'Network error — could not reach the server.')
    } finally {
      setSaving(false)
    }
  }

  async function deleteEntry(id) {
    try {
      await fetch(`/api/calendar?id=${id}`, { method: 'DELETE' })
      setEntries((prev) => prev.filter((e) => e.id !== id))
    } catch {}
  }

  async function moveEntry(id, newDate) {
    try {
      const res = await fetch('/api/calendar', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, scheduledDate: newDate }),
      })
      if (res.ok) {
        setEntries((prev) => prev.map((e) => e.id === id ? { ...e, scheduledDate: newDate } : e))
      }
    } catch {}
  }

  function openEdit(entry) {
    setEditEntry(entry)
    setForm({
      title: entry.title,
      platform: entry.platform || 'LinkedIn',
      contentType: entry.contentType || 'Post',
      scheduledDate: entry.scheduledDate,
      status: entry.status || 'Draft',
      notes: entry.notes || '',
    })
    setSaveError(null)
    setShowForm(true)
  }

  // ── Copy save ──
  async function patchCopy(copyPayload) {
    // Send full entry fields so synthetic entries get promoted to explicit calendar entries
    const body = {
      id: detailEntry.id,
      copy: copyPayload,
      title: detailEntry.title,
      platform: detailEntry.platform,
      contentType: detailEntry.contentType,
      scheduledDate: detailEntry.scheduledDate,
      status: detailEntry.status,
      briefId: detailEntry.briefId || null,
      clouds: detailEntry.clouds || [],
      notes: detailEntry.notes || null,
    }
    const res = await fetch('/api/calendar', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`Save failed (${res.status})`)
    const updated = await res.json()
    // Update local state
    setDetailEntry((prev) => ({ ...prev, copy: copyPayload }))
    setCopyVariants(copyPayload)
    setEntries((prev) => prev.map((e) => e.id === updated.id ? { ...e, copy: copyPayload } : e))
    showToast('Copy saved to calendar.')
  }

  async function savePlatformCopy(platformKey) {
    setSavingCopy(platformKey)
    try {
      const merged = { ...(copyVariants || {}), [platformKey]: editCopy[platformKey] }
      await patchCopy(merged)
    } catch (err) {
      showToast('Save failed — ' + err.message)
    } finally {
      setSavingCopy(null)
    }
  }

  async function saveAllCopy() {
    setSavingCopy('all')
    try {
      await patchCopy(editCopy)
    } catch (err) {
      showToast('Save failed — ' + err.message)
    } finally {
      setSavingCopy(null)
    }
  }

  // ── Calendar grid helpers ──
  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)
  const monthName = new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const filtered = entries.filter((e) => {
    const matchPlatform = filterPlatform === 'All' || e.platform === filterPlatform
    const matchStatus = filterStatus === 'All' || e.status === filterStatus
    return matchPlatform && matchStatus
  })

  function entriesForDay(day) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return filtered.filter((e) => e.scheduledDate === dateStr)
  }

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const tabs = copyVariants ? variantPlatforms(copyVariants) : []

  return (
    <div className="p-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <button onClick={prevMonth} className="btn-secondary px-2 py-1 text-xs">‹</button>
            <span className="text-sm font-medium text-black w-36 text-center">{monthName}</span>
            <button onClick={nextMonth} className="btn-secondary px-2 py-1 text-xs">›</button>
          </div>
          <select
            className="input text-xs py-1.5"
            style={{ width: 'auto' }}
            value={filterPlatform}
            onChange={(e) => setFilterPlatform(e.target.value)}
          >
            <option>All</option>
            {PLATFORMS.map((p) => <option key={p}>{p}</option>)}
          </select>
          <select
            className="input text-xs py-1.5"
            style={{ width: 'auto' }}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option>All</option>
            {STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        <button
          className="btn-primary text-xs"
          onClick={() => { setEditEntry(null); setSaveError(null); setShowForm(true) }}
        >
          + Add Entry
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="section-label text-center py-2" style={{ marginBottom: 0 }}>{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div
        className="grid grid-cols-7"
        style={{ border: '0.75px solid #D9D8D6', borderRadius: '6px', overflow: 'hidden' }}
      >
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`empty-${i}`} className="min-h-[90px] bg-white/50"
            style={{ borderRight: '0.75px solid #D9D8D6', borderBottom: '0.75px solid #D9D8D6' }} />
        ))}

        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const isToday = dateStr === todayStr
          const dayEntries = entriesForDay(day)

          return (
            <div
              key={day}
              className="min-h-[90px] bg-white p-1.5 relative"
              style={{ borderRight: '0.75px solid #D9D8D6', borderBottom: '0.75px solid #D9D8D6' }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                if (dragId) { moveEntry(dragId, dateStr); setDragId(null) }
              }}
            >
              <div className="flex items-center justify-center mb-1">
                <span
                  className="text-xs font-medium w-5 h-5 flex items-center justify-center"
                  style={{
                    borderRadius: '50%',
                    backgroundColor: isToday ? '#E3001B' : 'transparent',
                    color: isToday ? '#ffffff' : 'rgba(0,0,0,0.6)',
                  }}
                >
                  {day}
                </span>
              </div>
              {dayEntries.map((entry) => {
                const s = STATUS_STYLE[entry.status] || STATUS_STYLE.Draft
                return (
                  <div
                    key={entry.id}
                    draggable
                    onDragStart={() => setDragId(entry.id)}
                    onDragEnd={() => setDragId(null)}
                    onClick={() => setDetailEntry(entry)}
                    className="mb-1 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-[0.5px] cursor-pointer truncate"
                    style={{
                      backgroundColor: s.bg,
                      border: `0.79px solid ${s.border}`,
                      borderRadius: '4px',
                      color: s.color,
                      borderLeft: `3px solid ${PLATFORM_DOT[entry.platform] || '#D9D8D6'}`,
                    }}
                    title={entry.title}
                  >
                    {entry.title}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      {/* ── Detail / copy panel ─────────────────────────────────────────── */}
      {detailEntry && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setDetailEntry(null) }}
        >
          <div
            className="bg-white w-full mx-4 flex flex-col"
            style={{
              maxWidth: '720px',
              borderRadius: '8px',
              border: '0.79px solid #D9D8D6',
              maxHeight: '88vh',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-6 py-4 flex-shrink-0"
              style={{ borderBottom: '0.75px solid #D9D8D6' }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: PLATFORM_DOT[detailEntry.platform] || '#D9D8D6' }}
                />
                <span className="text-sm font-medium text-black truncate">{detailEntry.title}</span>
                <span
                  className="text-[9px] font-medium uppercase tracking-[1px] px-2 py-0.5 flex-shrink-0"
                  style={{
                    border: `0.79px solid ${STATUS_STYLE[detailEntry.status]?.border || '#D9D8D6'}`,
                    borderRadius: '4px',
                    color: STATUS_STYLE[detailEntry.status]?.color || '#000',
                  }}
                >
                  {detailEntry.status}
                </span>
                <span className="text-xs text-black/40 font-[350] flex-shrink-0">
                  {detailEntry.scheduledDate}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                <button
                  className="btn-secondary text-xs px-3 py-1.5"
                  onClick={() => { openEdit(detailEntry) }}
                >
                  Edit Details
                </button>
                <button
                  onClick={() => setDetailEntry(null)}
                  className="text-black/40 hover:text-black text-lg leading-none"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Copy section */}
            <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
              {copyLoading ? (
                <div className="flex items-center justify-center py-16">
                  <p className="text-sm text-black/40 font-[350]">Loading copy…</p>
                </div>
              ) : !copyVariants ? (
                <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                  <p className="text-sm font-medium text-black mb-1">No copy linked</p>
                  <p className="text-xs text-black/40 font-[350]">
                    This entry has no linked brief. Submit a brief on the Request Brief page to generate copy.
                  </p>
                </div>
              ) : (
                <>
                  {/* Copy tabs + edit toggle */}
                  <div
                    className="flex items-center justify-between flex-shrink-0"
                    style={{ borderBottom: '0.75px solid #D9D8D6' }}
                  >
                    <div className="flex">
                      {tabs.map((key) => (
                        <button
                          key={key}
                          onClick={() => setActiveCopyTab(key)}
                          className="px-5 py-3 text-[11px] font-medium uppercase tracking-[0.08em] whitespace-nowrap transition-colors"
                          style={{
                            color: activeCopyTab === key ? '#E3001B' : 'rgba(0,0,0,0.4)',
                            borderBottom: activeCopyTab === key ? '1.5px solid #E3001B' : '1.5px solid transparent',
                          }}
                        >
                          {PLATFORM_LABEL[key] || key}
                        </button>
                      ))}
                    </div>
                    <div className="px-5">
                      <button
                        className={copyEditMode ? 'btn-secondary text-xs px-3 py-1.5' : 'btn-primary text-xs px-3 py-1.5'}
                        onClick={() => {
                          if (copyEditMode) {
                            // Cancel: reset edits
                            setEditCopy(JSON.parse(JSON.stringify(copyVariants)))
                          }
                          setCopyEditMode(!copyEditMode)
                        }}
                      >
                        {copyEditMode ? 'Cancel' : 'Edit & Save'}
                      </button>
                    </div>
                  </div>

                  {/* Tab content */}
                  <div className="flex-1 overflow-y-auto px-6 py-5">
                    {activeCopyTab && (
                      <CopyTabContent
                        key={activeCopyTab}
                        platformKey={activeCopyTab}
                        variant={editCopy?.[activeCopyTab]}
                        editMode={copyEditMode}
                        onChange={(updated) =>
                          setEditCopy((prev) => ({ ...prev, [activeCopyTab]: updated }))
                        }
                      />
                    )}
                  </div>

                  {/* Save actions — only visible in edit mode */}
                  {copyEditMode && (
                    <div
                      className="flex items-center justify-end gap-3 px-6 py-4 flex-shrink-0"
                      style={{ borderTop: '0.75px solid #D9D8D6' }}
                    >
                      <button
                        className="btn-secondary text-xs px-4"
                        disabled={savingCopy !== null}
                        onClick={() => savePlatformCopy(activeCopyTab)}
                      >
                        {savingCopy === activeCopyTab
                          ? 'Saving…'
                          : `Save ${PLATFORM_LABEL[activeCopyTab] || activeCopyTab}`}
                      </button>
                      <button
                        className="btn-primary text-xs px-4"
                        disabled={savingCopy !== null}
                        onClick={saveAllCopy}
                      >
                        {savingCopy === 'all' ? 'Saving…' : 'Save All Platforms'}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Add/Edit entry form modal ───────────────────────────────────── */}
      {showForm && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
          onClick={(e) => { if (e.target === e.currentTarget) { setShowForm(false); setEditEntry(null); setSaveError(null) } }}
        >
          <div className="bg-white w-full max-w-md mx-4" style={{ borderRadius: '8px', border: '0.79px solid #D9D8D6' }}>
            <div
              className="flex items-center justify-between px-6 py-4"
              style={{ borderBottom: '0.75px solid #D9D8D6' }}
            >
              <h3 className="font-medium text-black text-sm">{editEntry ? 'Edit Entry' : 'Add Calendar Entry'}</h3>
              <button
                onClick={() => { setShowForm(false); setEditEntry(null); setSaveError(null) }}
                className="text-black/40 hover:text-black text-lg leading-none"
              >
                ×
              </button>
            </div>
            <form onSubmit={saveEntry} className="p-6 space-y-4">
              <div>
                <label className="section-label">Title <span className="text-cority-red">*</span></label>
                <input
                  className="input"
                  value={form.title}
                  onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="section-label">Platform</label>
                  <select className="input" value={form.platform} onChange={(e) => setForm(f => ({ ...f, platform: e.target.value }))}>
                    {PLATFORMS.map((p) => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="section-label">Content Type</label>
                  <select className="input" value={form.contentType} onChange={(e) => setForm(f => ({ ...f, contentType: e.target.value }))}>
                    {CONTENT_TYPES.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="section-label">Date <span className="text-cority-red">*</span></label>
                  <input
                    type="date"
                    className="input"
                    value={form.scheduledDate}
                    onChange={(e) => setForm(f => ({ ...f, scheduledDate: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="section-label">Status</label>
                  <select className="input" value={form.status} onChange={(e) => setForm(f => ({ ...f, status: e.target.value }))}>
                    {STATUSES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="section-label">Notes</label>
                <textarea
                  className="textarea"
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
                />
              </div>
              {saveError && (
                <div
                  className="text-sm text-cority-red font-[350] px-3 py-2"
                  style={{ border: '0.79px solid #E3001B', borderRadius: '6px' }}
                >
                  {saveError}
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary flex-1" disabled={saving}>
                  {saving ? 'Saving…' : editEntry ? 'Save Changes' : 'Add to Calendar'}
                </button>
                {editEntry && (
                  <button
                    type="button"
                    className="btn-secondary text-cority-red text-xs px-4"
                    style={{ borderColor: '#E3001B' }}
                    onClick={() => { deleteEntry(editEntry.id); setShowForm(false); setEditEntry(null); setDetailEntry(null) }}
                  >
                    Delete
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Toast ──────────────────────────────────────────────────────── */}
      {toast && (
        <div
          className="fixed bottom-6 right-6 z-[70] px-4 py-3 text-sm font-medium text-white"
          style={{
            backgroundColor: '#49763E',
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}
        >
          {toast}
        </div>
      )}
    </div>
  )
}
