import { useState, useEffect } from 'react'

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

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}
function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay()
}

export default function EditorialCalendar() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [entries, setEntries] = useState([])
  const [filterPlatform, setFilterPlatform] = useState('All')
  const [filterStatus, setFilterStatus] = useState('All')
  const [showForm, setShowForm] = useState(false)
  const [dragId, setDragId] = useState(null)
  const [editEntry, setEditEntry] = useState(null)
  const [form, setForm] = useState({
    title: '', platform: 'LinkedIn', contentType: 'Post',
    scheduledDate: '', status: 'Draft', notes: '',
  })

  useEffect(() => { loadEntries() }, [])

  async function loadEntries() {
    try {
      const res = await fetch('/api/calendar')
      if (res.ok) setEntries(await res.json())
    } catch {}
  }

  async function saveEntry(e) {
    e.preventDefault()
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
        setForm({ title: '', platform: 'LinkedIn', contentType: 'Post', scheduledDate: '', status: 'Draft', notes: '' })
      }
    } catch {}
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
    setShowForm(true)
  }

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
          onClick={() => { setEditEntry(null); setShowForm(true) }}
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
        {/* Empty cells for first week offset */}
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`empty-${i}`} className="min-h-[90px] bg-white/50"
            style={{ borderRight: '0.75px solid #D9D8D6', borderBottom: '0.75px solid #D9D8D6' }} />
        ))}

        {/* Day cells */}
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
                    onClick={() => openEdit(entry)}
                    className="mb-1 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-[0.5px] cursor-grab truncate"
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

      {/* Add/Edit form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
          onClick={(e) => { if (e.target === e.currentTarget) { setShowForm(false); setEditEntry(null) } }}>
          <div className="bg-white w-full max-w-md mx-4" style={{ borderRadius: '8px', border: '0.79px solid #D9D8D6' }}>
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '0.75px solid #D9D8D6' }}>
              <h3 className="font-medium text-black text-sm">{editEntry ? 'Edit Entry' : 'Add Calendar Entry'}</h3>
              <button onClick={() => { setShowForm(false); setEditEntry(null) }} className="text-black/40 hover:text-black text-lg leading-none">×</button>
            </div>
            <form onSubmit={saveEntry} className="p-6 space-y-4">
              <div>
                <label className="section-label">Title <span className="text-cority-red">*</span></label>
                <input className="input" value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} required />
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
                  <input type="date" className="input" value={form.scheduledDate} onChange={(e) => setForm(f => ({ ...f, scheduledDate: e.target.value }))} required />
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
                <textarea className="textarea" rows={2} value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary flex-1">
                  {editEntry ? 'Save Changes' : 'Add to Calendar'}
                </button>
                {editEntry && (
                  <button type="button" className="btn-secondary text-cority-red text-xs px-4"
                    style={{ borderColor: '#E3001B' }}
                    onClick={() => { deleteEntry(editEntry.id); setShowForm(false); setEditEntry(null) }}>
                    Delete
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
