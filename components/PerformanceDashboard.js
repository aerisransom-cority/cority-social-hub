import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

const PLATFORM_COLOR = {
  linkedin:  '#0077B5',
  instagram: '#E1306C',
  facebook:  '#1877F2',
  x:         '#000000',
  youtube:   '#FF0000',
}

const PLATFORM_LABEL = {
  linkedin:  'LinkedIn',
  instagram: 'Instagram',
  facebook:  'Facebook',
  x:         'X',
  youtube:   'YouTube',
}

function fmt(n) {
  if (n == null) return '0'
  return Number(n).toLocaleString()
}

function fmtRate(n) {
  if (n == null) return '0.00%'
  return Number(n).toFixed(2) + '%'
}

function fmtDuration(seconds) {
  if (!seconds) return '0:00'
  const s = Math.round(seconds)
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${String(sec).padStart(2, '0')}`
}

function truncate(str, len = 60) {
  if (!str) return '—'
  return str.length > len ? str.slice(0, len) + '…' : str
}

function PlatformDot({ platform }) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: 8,
        height: 8,
        borderRadius: '50%',
        backgroundColor: PLATFORM_COLOR[platform] || '#999',
        marginRight: 6,
        flexShrink: 0,
      }}
    />
  )
}

function SummaryCard({ label, value, sub }) {
  return (
    <div className="card p-6" style={{ flex: 1 }}>
      <div className="section-label mb-2">{label}</div>
      <div className="text-2xl font-medium text-black">{value}</div>
      {sub && <div className="text-xs text-black/40 mt-1 font-[350]">{sub}</div>}
    </div>
  )
}

function MetricRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
      <span className="text-xs text-black/50 font-[350]">{label}</span>
      <span className="text-xs text-black font-medium">{value}</span>
    </div>
  )
}

export default function PerformanceDashboard() {
  const [records, setRecords]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [filters, setFilters]   = useState({
    platform: 'All',
    type: 'All',
    dateRange: '30d',
    dateFrom: '',
    dateTo: '',
  })
  const [sortCol, setSortCol]   = useState('postDate')
  const [sortDir, setSortDir]   = useState('desc')
  const [upload, setUpload]     = useState({
    platform: 'linkedin',
    file: null,
    dragging: false,
    uploading: false,
    result: null,
    error: null,
  })
  const [dupPrompt, setDupPrompt] = useState(null) // { duplicateCount, newCount, totalIncoming }
  const [insights, setInsights] = useState({ loading: false, data: null, error: null })

  const fileInputRef = useRef(null)

  // Load records on mount
  const loadRecords = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/performance')
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json()
      setRecords(Array.isArray(data) ? data : [])
    } catch {
      setRecords([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadRecords() }, [])

  // Filtered + sorted records
  const filtered = useMemo(() => {
    return records.filter((r) => {
      if (filters.platform !== 'All' && r.platform !== filters.platform.toLowerCase()) return false
      if (filters.type !== 'All' && r.postType !== filters.type.toLowerCase()) return false
      if (filters.dateRange !== 'custom') {
        const days = { '7d': 7, '30d': 30, '90d': 90 }[filters.dateRange] || 30
        const cutoff = new Date()
        cutoff.setDate(cutoff.getDate() - days)
        if (r.postDate && new Date(r.postDate) < cutoff) return false
      } else {
        if (filters.dateFrom && r.postDate < filters.dateFrom) return false
        if (filters.dateTo && r.postDate > filters.dateTo) return false
      }
      return true
    })
  }, [records, filters])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = a[sortCol] ?? ''
      const bv = b[sortCol] ?? ''
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [filtered, sortCol, sortDir])

  function handleSort(col) {
    if (sortCol === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortCol(col)
      setSortDir('desc')
    }
  }

  // Summary stats
  const totalImpressions = filtered.reduce((s, r) => s + (r.impressions || 0), 0)
  const totalReach       = filtered.reduce((s, r) => s + (r.reach || 0), 0)
  const avgEngRate = filtered.length
    ? filtered.reduce((s, r) => s + (r.engagementRate || 0), 0) / filtered.length
    : 0
  const topPost = filtered.length
    ? filtered.reduce((best, r) =>
        (r.engagementRate || 0) > (best.engagementRate || 0) ? r : best
      , filtered[0])
    : null

  // Platforms with data in filtered set
  const platformsWithData = [...new Set(filtered.map((r) => r.platform))].sort()

  // Per-platform aggregates
  function platformAgg(platform) {
    const rows = filtered.filter((r) => r.platform === platform)
    const sum  = (key) => rows.reduce((s, r) => s + (r[key] || 0), 0)
    const avg  = (key) => rows.length ? sum(key) / rows.length : 0
    return { rows, sum, avg }
  }

  // Chart data — engagement rate over time (weekly buckets if > 30 records)
  const timeChartData = useMemo(() => {
    if (!filtered.length) return []
    const withDate = filtered.filter((r) => r.postDate)
    if (!withDate.length) return []

    const useWeekly = filtered.length > 30
    const buckets = {}

    for (const r of withDate) {
      let key = r.postDate
      if (useWeekly) {
        const d = new Date(r.postDate)
        // Round to Monday of that week
        const day = d.getDay()
        const diff = (day === 0 ? -6 : 1) - day
        d.setDate(d.getDate() + diff)
        key = d.toISOString().split('T')[0]
      }
      if (!buckets[key]) buckets[key] = {}
      const plat = r.platform
      if (!buckets[key][plat]) buckets[key][plat] = { sum: 0, count: 0 }
      buckets[key][plat].sum   += r.engagementRate || 0
      buckets[key][plat].count += 1
    }

    return Object.entries(buckets)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, platData]) => {
        const point = { date }
        for (const [plat, { sum, count }] of Object.entries(platData)) {
          point[plat] = Math.round((sum / count) * 100) / 100
        }
        return point
      })
  }, [filtered])

  // Bar chart — avg engagement rate by content type
  const typeChartData = useMemo(() => {
    const byType = {}
    for (const r of filtered) {
      const t = r.postType || 'text'
      if (!byType[t]) byType[t] = { sum: 0, count: 0 }
      byType[t].sum   += r.engagementRate || 0
      byType[t].count += 1
    }
    return Object.entries(byType)
      .filter(([, d]) => d.count > 0)
      .map(([type, data]) => ({
        type: type.charAt(0).toUpperCase() + type.slice(1),
        avgEngRate: Math.round((data.sum / data.count) * 100) / 100,
      }))
      .sort((a, b) => b.avgEngRate - a.avgEngRate)
  }, [filtered])

  // Upload handlers
  function handleFileSelect(e) {
    const file = e.target.files?.[0]
    if (file) setUpload((u) => ({ ...u, file, result: null, error: null }))
  }

  function handleDrop(e) {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) setUpload((u) => ({ ...u, file, dragging: false, result: null, error: null }))
  }

  async function handleUpload(mode = '') {
    if (!upload.file) return
    setUpload((u) => ({ ...u, uploading: true, result: null, error: null }))
    setDupPrompt(null)
    try {
      const formData = new FormData()
      formData.append('platform', upload.platform)
      formData.append('file', upload.file)
      if (mode) formData.append('mode', mode)
      const res = await fetch('/api/performance', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      if (data.hasDuplicates) {
        // Pause — show duplicate prompt, keep file in state
        setDupPrompt(data)
        setUpload((u) => ({ ...u, uploading: false }))
        return
      }
      setUpload((u) => ({ ...u, uploading: false, result: data, file: null }))
      await loadRecords()
    } catch (err) {
      setUpload((u) => ({ ...u, uploading: false, error: err.message }))
    }
  }

  async function loadInsights() {
    if (!filtered.length) return
    setInsights({ loading: true, data: null, error: null })
    try {
      const res = await fetch('/api/performance-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: filtered }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to generate insights')
      setInsights({ loading: false, data, error: null })
    } catch (err) {
      setInsights({ loading: false, data: null, error: err.message })
    }
  }

  function SortArrow({ col }) {
    if (sortCol !== col) return <span style={{ color: '#ccc', marginLeft: 4 }}>↕</span>
    return <span style={{ marginLeft: 4 }}>{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

  const thStyle = {
    textAlign: 'left',
    padding: '8px 12px',
    fontSize: 9,
    fontWeight: 500,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'rgba(0,0,0,0.4)',
    borderBottom: '0.79px solid #D9D8D6',
    cursor: 'pointer',
    userSelect: 'none',
    whiteSpace: 'nowrap',
  }
  const tdStyle = {
    padding: '10px 12px',
    fontSize: 13,
    color: '#000',
    fontWeight: 350,
    borderBottom: '0.79px solid #D9D8D6',
    verticalAlign: 'middle',
  }

  if (loading) {
    return (
      <div className="card p-8" style={{ textAlign: 'center', color: 'rgba(0,0,0,0.4)' }}>
        Loading performance data…
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Upload Section */}
      <div className="card p-8">
        <div className="section-label mb-4">Upload XLSX Export</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Platform selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <label className="text-xs text-black/50 font-[350]" style={{ minWidth: 60 }}>Platform</label>
            <select
              value={upload.platform}
              onChange={(e) => setUpload((u) => ({ ...u, platform: e.target.value, result: null, error: null }))}
              style={{
                border: '0.79px solid #D9D8D6',
                borderRadius: 4,
                padding: '6px 10px',
                fontSize: 13,
                fontWeight: 350,
                background: '#fff',
                color: '#000',
              }}
            >
              <option value="linkedin">LinkedIn</option>
              <option value="instagram">Instagram</option>
              <option value="facebook">Facebook</option>
              <option value="x">X (Twitter)</option>
              <option value="youtube">YouTube</option>
            </select>
          </div>

          {/* Drop zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setUpload((u) => ({ ...u, dragging: true })) }}
            onDragLeave={() => setUpload((u) => ({ ...u, dragging: false }))}
            onDrop={handleDrop}
            style={{
              border: `2px dashed ${upload.dragging ? '#D35F0B' : '#D9D8D6'}`,
              borderRadius: 6,
              padding: '28px 20px',
              textAlign: 'center',
              cursor: 'pointer',
              background: upload.dragging ? 'rgba(211,95,11,0.03)' : '#FAFAFA',
              transition: 'all 0.15s',
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              style={{ display: 'none' }}
              onChange={handleFileSelect}
            />
            {upload.file ? (
              <div>
                <span style={{ fontSize: 13, color: '#000', fontWeight: 400 }}>{upload.file.name}</span>
                <span
                  style={{ marginLeft: 10, fontSize: 11, color: '#D35F0B', cursor: 'pointer' }}
                  onClick={(e) => { e.stopPropagation(); setUpload((u) => ({ ...u, file: null })) }}
                >
                  Remove
                </span>
              </div>
            ) : (
              <span className="text-sm text-black/40 font-[350]">
                Drop your XLSX file here or click to browse
              </span>
            )}
          </div>

          {/* Duplicate prompt */}
          {dupPrompt && (
            <div style={{
              border: '0.79px solid rgba(211,95,11,0.4)',
              borderRadius: 6,
              padding: '14px 16px',
              background: 'rgba(211,95,11,0.04)',
            }}>
              <p style={{ fontSize: 13, color: '#000', fontWeight: 400, margin: '0 0 12px' }}>
                <strong>{dupPrompt.duplicateCount} post{dupPrompt.duplicateCount !== 1 ? 's' : ''}</strong> in this file already exist in your performance data.
                {dupPrompt.newCount > 0
                  ? ` ${dupPrompt.newCount} new post${dupPrompt.newCount !== 1 ? 's' : ''} will be imported either way.`
                  : ' No new posts to import.'}
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn-primary"
                  onClick={() => { setDupPrompt(null); handleUpload('override') }}
                >
                  Override existing
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => { setDupPrompt(null); handleUpload('skip') }}
                >
                  Skip duplicates, import new only
                </button>
              </div>
            </div>
          )}

          {/* Upload button + result */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            {!dupPrompt && (
              <button
                className="btn-primary"
                onClick={() => handleUpload()}
                disabled={!upload.file || upload.uploading}
                style={{ opacity: (!upload.file || upload.uploading) ? 0.5 : 1 }}
              >
                {upload.uploading ? 'Importing…' : 'Import'}
              </button>
            )}

            {upload.result && (
              <div style={{
                display: 'flex',
                gap: 16,
                flexWrap: 'wrap',
                fontSize: 13,
                color: '#000',
                fontWeight: 350,
                padding: '10px 14px',
                background: 'rgba(45,125,70,0.06)',
                border: '0.79px solid rgba(45,125,70,0.25)',
                borderRadius: 6,
              }}>
                <span style={{ color: '#2D7D46', fontWeight: 500 }}>✓ Import complete</span>
                <span><strong>{upload.result.imported}</strong> posts imported</span>
                <span><strong>{upload.result.matched}</strong> UTM {upload.result.matched === 1 ? 'match' : 'matches'}</span>
                {upload.result.duplicatesSkipped > 0 && (
                  <span><strong>{upload.result.duplicatesSkipped}</strong> duplicates skipped</span>
                )}
                {upload.result.duplicatesOverridden > 0 && (
                  <span><strong>{upload.result.duplicatesOverridden}</strong> records overridden</span>
                )}
                <span style={{ color: 'rgba(0,0,0,0.4)' }}>{upload.result.total} total in dataset</span>
              </div>
            )}
            {upload.error && (
              <span style={{ fontSize: 13, color: '#C0392B', fontWeight: 400 }}>{upload.error}</span>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div>
          <span className="section-label mr-2">Platform</span>
          <select
            value={filters.platform}
            onChange={(e) => setFilters((f) => ({ ...f, platform: e.target.value }))}
            style={{ border: '0.79px solid #D9D8D6', borderRadius: 4, padding: '5px 8px', fontSize: 12, fontWeight: 350 }}
          >
            <option>All</option>
            <option value="linkedin">LinkedIn</option>
            <option value="instagram">Instagram</option>
            <option value="facebook">Facebook</option>
            <option value="x">X</option>
            <option value="youtube">YouTube</option>
          </select>
        </div>

        <div>
          <span className="section-label mr-2">Type</span>
          <select
            value={filters.type}
            onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}
            style={{ border: '0.79px solid #D9D8D6', borderRadius: 4, padding: '5px 8px', fontSize: 12, fontWeight: 350 }}
          >
            <option>All</option>
            <option value="video">Video</option>
            <option value="carousel">Carousel</option>
            <option value="image">Image</option>
            <option value="text">Text</option>
            <option value="article">Article</option>
          </select>
        </div>

        <div>
          <span className="section-label mr-2">Period</span>
          <select
            value={filters.dateRange}
            onChange={(e) => setFilters((f) => ({ ...f, dateRange: e.target.value }))}
            style={{ border: '0.79px solid #D9D8D6', borderRadius: 4, padding: '5px 8px', fontSize: 12, fontWeight: 350 }}
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="custom">Custom</option>
          </select>
        </div>

        {filters.dateRange === 'custom' && (
          <>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
              style={{ border: '0.79px solid #D9D8D6', borderRadius: 4, padding: '5px 8px', fontSize: 12, fontWeight: 350 }}
            />
            <span className="text-xs text-black/40">to</span>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
              style={{ border: '0.79px solid #D9D8D6', borderRadius: 4, padding: '5px 8px', fontSize: 12, fontWeight: 350 }}
            />
          </>
        )}

        <span className="text-xs text-black/30 font-[350]">{filtered.length} posts</span>
      </div>

      {filtered.length === 0 ? (
        <div className="card p-12" style={{ textAlign: 'center' }}>
          <div className="text-sm text-black/40 font-[350]">
            {records.length === 0
              ? 'No performance data yet. Upload an XLSX export above to get started.'
              : 'No posts match the current filters.'}
          </div>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <SummaryCard label="Total Impressions" value={fmt(totalImpressions)} />
            <SummaryCard label="Total Reach" value={fmt(totalReach)} />
            <SummaryCard label="Avg Engagement Rate" value={fmtRate(avgEngRate)} />
            <SummaryCard
              label="Top Post"
              value={fmtRate(topPost?.engagementRate)}
              sub={
                topPost
                  ? `${PLATFORM_LABEL[topPost.platform] || topPost.platform} · ${truncate(topPost.postTitle, 40)}`
                  : null
              }
            />
          </div>

          {/* Per-platform metric cards */}
          {platformsWithData.length > 0 && (
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {platformsWithData.map((platform) => {
                const { sum, avg } = platformAgg(platform)
                return (
                  <div
                    key={platform}
                    className="card p-6"
                    style={{ flex: '1 1 180px', minWidth: 160 }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                      <PlatformDot platform={platform} />
                      <span className="section-label">{PLATFORM_LABEL[platform] || platform}</span>
                    </div>
                    {platform === 'linkedin' && (
                      <>
                        <MetricRow label="Impressions" value={fmt(sum('impressions'))} />
                        <MetricRow label="Eng. Rate" value={fmtRate(avg('engagementRate'))} />
                        <MetricRow label="Follower Growth" value={fmt(sum('followerGrowth'))} />
                        <MetricRow label="Comments" value={fmt(sum('comments'))} />
                      </>
                    )}
                    {platform === 'instagram' && (
                      <>
                        <MetricRow label="Reach" value={fmt(sum('reach'))} />
                        <MetricRow label="Saves" value={fmt(sum('saves'))} />
                        <MetricRow label="Eng. Rate" value={fmtRate(avg('engagementRate'))} />
                      </>
                    )}
                    {platform === 'facebook' && (
                      <>
                        <MetricRow label="Reach" value={fmt(sum('reach'))} />
                        <MetricRow label="Eng. Rate" value={fmtRate(avg('engagementRate'))} />
                      </>
                    )}
                    {platform === 'x' && (
                      <>
                        <MetricRow label="Impressions" value={fmt(sum('impressions'))} />
                        <MetricRow label="Eng. Rate" value={fmtRate(avg('engagementRate'))} />
                        <MetricRow label="Retweets" value={fmt(sum('retweets'))} />
                      </>
                    )}
                    {platform === 'youtube' && (
                      <>
                        <MetricRow label="CTR" value={fmtRate(avg('ctr'))} />
                        <MetricRow label="Avg View Duration" value={fmtDuration(avg('avgViewDuration'))} />
                        <MetricRow label="Subscribers" value={fmt(sum('followerGrowth'))} />
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Charts */}
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {/* Line chart: engagement rate over time */}
            {timeChartData.length > 1 && (
              <div className="card p-6" style={{ flex: '2 1 400px', minWidth: 320 }}>
                <div className="section-label mb-4">Engagement Rate Over Time</div>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={timeChartData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10, fill: 'rgba(0,0,0,0.4)' }}
                      tickFormatter={(v) => v.slice(5)}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: 'rgba(0,0,0,0.4)' }}
                      tickFormatter={(v) => v + '%'}
                    />
                    <Tooltip formatter={(v) => v.toFixed(2) + '%'} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    {platformsWithData.map((plat) => (
                      <Line
                        key={plat}
                        type="monotone"
                        dataKey={plat}
                        name={PLATFORM_LABEL[plat] || plat}
                        stroke={PLATFORM_COLOR[plat] || '#999'}
                        strokeWidth={2}
                        dot={false}
                        connectNulls
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Bar chart: avg engagement rate by content type */}
            {typeChartData.length > 0 && (
              <div className="card p-6" style={{ flex: '1 1 260px', minWidth: 220 }}>
                <div className="section-label mb-4">Avg Engagement by Content Type</div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={typeChartData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="type" tick={{ fontSize: 10, fill: 'rgba(0,0,0,0.4)' }} />
                    <YAxis tick={{ fontSize: 10, fill: 'rgba(0,0,0,0.4)' }} tickFormatter={(v) => v + '%'} />
                    <Tooltip formatter={(v) => v.toFixed(2) + '%'} />
                    <Bar dataKey="avgEngRate" name="Avg Eng. Rate" fill="#D35F0B" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Posts table */}
          <div className="card" style={{ overflowX: 'auto' }}>
            <div className="section-label" style={{ padding: '20px 20px 0' }}>Posts</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12 }}>
              <thead>
                <tr>
                  {[
                    { key: 'postDate',       label: 'Date' },
                    { key: 'platform',       label: 'Platform' },
                    { key: 'postType',       label: 'Type' },
                    { key: 'impressions',    label: 'Impressions' },
                    { key: 'engagementRate', label: 'Eng. Rate' },
                    { key: 'matchedCampaign', label: 'Campaign' },
                    { key: 'matchedBriefId', label: 'Brief' },
                  ].map(({ key, label }) => (
                    <th key={key} style={thStyle} onClick={() => handleSort(key)}>
                      {label}<SortArrow col={key} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((r) => (
                  <tr key={r.id} style={{ ':hover': { background: '#FAFAFA' } }}>
                    <td style={tdStyle}>{r.postDate || '—'}</td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <PlatformDot platform={r.platform} />
                        <span>{PLATFORM_LABEL[r.platform] || r.platform}</span>
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ textTransform: 'capitalize' }}>{r.postType || '—'}</span>
                    </td>
                    <td style={tdStyle}>{fmt(r.impressions)}</td>
                    <td style={tdStyle}>{fmtRate(r.engagementRate)}</td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {r.attributed ? (
                          <span
                            style={{
                              display: 'inline-block',
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              background: '#D35F0B',
                              flexShrink: 0,
                            }}
                          />
                        ) : (
                          <span
                            style={{
                              display: 'inline-block',
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              background: '#D9D8D6',
                              flexShrink: 0,
                            }}
                          />
                        )}
                        {r.matchedCampaign ? (
                          <span title={r.matchedCampaign} style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                            {r.matchedCampaign}
                          </span>
                        ) : (
                          <span style={{ color: 'rgba(0,0,0,0.3)', fontSize: 12, fontStyle: 'italic' }}>
                            Unattributed
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={tdStyle}>
                      {r.matchedBriefId ? (
                        <span style={{ color: '#D35F0B', fontSize: 12 }}>
                          View brief
                        </span>
                      ) : (
                        <span style={{ color: 'rgba(0,0,0,0.3)', fontSize: 12 }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {sorted.length === 0 && (
              <div style={{ padding: '24px', textAlign: 'center', color: 'rgba(0,0,0,0.4)', fontSize: 13 }}>
                No posts to display.
              </div>
            )}
          </div>
        </>
      )}

      {/* AI Insights Panel */}
      <div className="card p-8">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 className="text-base font-medium text-black">AI Insights</h2>
          <button
            className="btn-secondary text-xs"
            onClick={loadInsights}
            disabled={insights.loading || filtered.length === 0}
            style={{ opacity: (insights.loading || filtered.length === 0) ? 0.5 : 1 }}
          >
            {insights.loading ? 'Analyzing…' : insights.data ? 'Refresh Insights' : 'Generate Insights'}
          </button>
        </div>

        {insights.error && (
          <p style={{ color: '#C0392B', fontSize: 13 }}>{insights.error}</p>
        )}

        {insights.data && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {insights.data.insights.map((insight, i) => (
                <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span style={{ color: '#D35F0B', fontWeight: 600, fontSize: 14, flexShrink: 0, lineHeight: '1.5' }}>•</span>
                  <span className="text-sm font-[350] text-black">{insight}</span>
                </li>
              ))}
            </ul>

            {insights.data.recommendation && (
              <div
                style={{
                  background: 'rgba(211,95,11,0.05)',
                  border: '0.79px solid rgba(211,95,11,0.2)',
                  borderRadius: 6,
                  padding: '14px 16px',
                }}
              >
                <div className="section-label mb-2">Recommended Action</div>
                <p className="text-sm font-[350] text-black" style={{ margin: 0 }}>
                  {insights.data.recommendation}
                </p>
              </div>
            )}
          </div>
        )}

        {!insights.data && !insights.error && (
          <p className="text-sm text-black/40 font-[350]">
            {filtered.length === 0
              ? 'Import performance data first, then generate AI insights.'
              : 'Click "Generate Insights" to get AI-powered analysis of your current filtered data.'}
          </p>
        )}
      </div>
    </div>
  )
}
