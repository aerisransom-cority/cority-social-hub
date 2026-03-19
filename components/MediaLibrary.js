import { useState, useEffect, useRef } from 'react'

const CLOUDS = ['CorityOne', 'Health', 'Safety', 'Environmental', 'Sustainability', 'Quality', 'Analytics', 'EHS+ Converge Studio']
const PLATFORMS_LIST = ['LinkedIn', 'Instagram', 'X', 'Facebook', 'YouTube', 'All Platforms']
const CONTENT_TYPES = ['Photo', 'Graphic', 'Screenshot', 'Event', 'Headshot', 'Product', 'Other']

export default function MediaLibrary() {
  const [assets, setAssets] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [uploadError, setUploadError] = useState(null)
  const [selected, setSelected] = useState(null)
  const fileRef = useRef(null)
  const [tags, setTags] = useState({
    cloud: '', campaign: '', contentType: 'Photo',
    platformSuitability: '', eventName: '', peopleFeatured: '', source: '',
  })

  useEffect(() => { loadAssets() }, [])

  async function loadAssets() {
    setLoading(true)
    try {
      const res = await fetch('/api/media/list')
      if (res.ok) setAssets(await res.json())
    } catch {}
    setLoading(false)
  }

  async function handleUpload(e) {
    e.preventDefault()
    const file = fileRef.current?.files?.[0]
    if (!file) return

    setUploading(true)
    setUploadError(null)

    const formData = new FormData()
    formData.append('file', file)
    Object.entries(tags).forEach(([k, v]) => { if (v) formData.append(k, v) })

    try {
      const res = await fetch('/api/media/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed.')
      setAssets((prev) => [data, ...prev])
      setShowUpload(false)
      setTags({ cloud: '', campaign: '', contentType: 'Photo', platformSuitability: '', eventName: '', peopleFeatured: '', source: '' })
      if (fileRef.current) fileRef.current.value = ''
    } catch (err) {
      setUploadError(err.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="p-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm font-medium text-black">{assets.length} asset{assets.length !== 1 ? 's' : ''}</p>
          <p className="text-xs text-black/40 font-[350] mt-0.5">
            Storage: {process.env.NEXT_PUBLIC_STORAGE_PROVIDER || 'local'} · Photos only (video coming soon)
          </p>
        </div>
        <div className="flex gap-3">
          <button
            className="btn-secondary text-xs opacity-40 cursor-not-allowed"
            disabled
            title="Coming soon"
          >
            🎬 Upload Video
          </button>
          <button className="btn-primary text-xs" onClick={() => setShowUpload(true)}>
            📷 Upload Photo
          </button>
        </div>
      </div>

      {/* Asset grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <p className="text-sm text-black/40 font-[350]">Loading media…</p>
        </div>
      ) : assets.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center text-center py-16"
          style={{ border: '0.79px dashed #D9D8D6', borderRadius: '6px' }}
        >
          <div className="text-4xl mb-3">🖼️</div>
          <p className="text-sm font-medium text-black mb-1">No media yet</p>
          <p className="text-xs text-black/40 font-[350]">Upload your first photo to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {assets.map((asset) => (
            <div
              key={asset.id}
              className="relative group cursor-pointer"
              style={{ border: '0.79px solid #D9D8D6', borderRadius: '6px', overflow: 'hidden' }}
              onClick={() => setSelected(asset)}
            >
              <div className="aspect-square bg-gray-50 flex items-center justify-center overflow-hidden">
                <img
                  src={asset.url}
                  alt={asset.filename}
                  className="w-full h-full object-cover"
                  onError={(e) => { e.target.style.display = 'none' }}
                />
              </div>
              <div className="p-2" style={{ borderTop: '0.75px solid #D9D8D6' }}>
                <p className="text-[10px] font-medium text-black truncate">{asset.filename}</p>
                <p className="text-[9px] text-black/40 font-[350] mt-0.5">
                  {new Date(asset.uploadedAt).toLocaleDateString('en-CA')}
                  {asset.tags?.cloud ? ` · ${asset.tags.cloud}` : ''}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload modal */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowUpload(false) }}>
          <div className="bg-white w-full max-w-lg mx-4" style={{ borderRadius: '8px', border: '0.79px solid #D9D8D6', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="flex items-center justify-between px-6 py-4 sticky top-0 bg-white" style={{ borderBottom: '0.75px solid #D9D8D6' }}>
              <h3 className="font-medium text-black text-sm">Upload Photo</h3>
              <button onClick={() => setShowUpload(false)} className="text-black/40 hover:text-black text-lg leading-none">×</button>
            </div>
            <form onSubmit={handleUpload} className="p-6 space-y-4">
              {/* File picker */}
              <div>
                <label className="section-label">Photo file <span className="text-cority-red">*</span></label>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  required
                  className="input py-1.5"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="section-label">Cloud / Product</label>
                  <select className="input" value={tags.cloud} onChange={(e) => setTags(t => ({ ...t, cloud: e.target.value }))}>
                    <option value="">None</option>
                    {CLOUDS.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="section-label">Content Type</label>
                  <select className="input" value={tags.contentType} onChange={(e) => setTags(t => ({ ...t, contentType: e.target.value }))}>
                    {CONTENT_TYPES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="section-label">Platform Suitability</label>
                  <select className="input" value={tags.platformSuitability} onChange={(e) => setTags(t => ({ ...t, platformSuitability: e.target.value }))}>
                    <option value="">Any</option>
                    {PLATFORMS_LIST.map((p) => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="section-label">Campaign</label>
                  <input className="input" placeholder="e.g. Safety is Stronger" value={tags.campaign} onChange={(e) => setTags(t => ({ ...t, campaign: e.target.value }))} />
                </div>
              </div>

              <div>
                <label className="section-label">Event / Source</label>
                <input className="input" placeholder="e.g. Cority Summit 2026, Field visit — Calgary" value={tags.eventName} onChange={(e) => setTags(t => ({ ...t, eventName: e.target.value }))} />
              </div>

              <div>
                <label className="section-label">People Featured</label>
                <input className="input" placeholder="e.g. Ted Kail, Sarah Chen" value={tags.peopleFeatured} onChange={(e) => setTags(t => ({ ...t, peopleFeatured: e.target.value }))} />
              </div>

              {uploadError && (
                <div className="text-sm text-cority-red font-[350] px-3 py-2"
                  style={{ border: '0.79px solid #E3001B', borderRadius: '6px' }}>
                  {uploadError}
                </div>
              )}

              <button type="submit" className="btn-primary w-full" disabled={uploading}>
                {uploading ? 'Uploading…' : 'Upload Photo'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Asset detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setSelected(null) }}>
          <div className="bg-white w-full max-w-2xl mx-4 flex" style={{ borderRadius: '8px', border: '0.79px solid #D9D8D6', overflow: 'hidden', maxHeight: '80vh' }}>
            <div className="w-1/2 bg-gray-50 flex items-center justify-center">
              <img src={selected.url} alt={selected.filename} className="max-w-full max-h-full object-contain" />
            </div>
            <div className="w-1/2 p-6 overflow-y-auto">
              <div className="flex items-start justify-between mb-4">
                <h3 className="font-medium text-black text-sm pr-4 break-all">{selected.filename}</h3>
                <button onClick={() => setSelected(null)} className="text-black/40 hover:text-black text-lg leading-none flex-shrink-0">×</button>
              </div>
              <dl className="space-y-3">
                {[
                  ['Uploaded', new Date(selected.uploadedAt).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })],
                  ['Cloud', selected.tags?.cloud],
                  ['Content Type', selected.tags?.contentType],
                  ['Platform', selected.tags?.platformSuitability],
                  ['Campaign', selected.tags?.campaign],
                  ['Event / Source', selected.tags?.eventName],
                  ['People Featured', selected.tags?.peopleFeatured],
                ].filter(([, v]) => v).map(([k, v]) => (
                  <div key={k}>
                    <dt className="section-label" style={{ marginBottom: '2px' }}>{k}</dt>
                    <dd className="text-sm text-black font-[350]">{v}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-5 pt-4" style={{ borderTop: '0.75px solid #D9D8D6' }}>
                <a href={selected.url} download={selected.filename} className="btn-secondary text-xs w-full text-center block">
                  Download
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
