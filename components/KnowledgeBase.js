import { useState, useEffect, useRef } from 'react'

const DOC_TYPES = [
  { value: 'customer-story',    label: 'Customer Story' },
  { value: 'product-portfolio', label: 'Product Portfolio' },
  { value: 'roadmap',           label: 'Roadmap' },
  { value: 'playbook',          label: 'Playbook' },
  { value: 'strategy',          label: 'Strategy' },
  { value: 'other',             label: 'Other' },
]

const TYPE_COLORS = {
  'customer-story':    { color: '#49763E', bg: '#EFF6EE' },
  'product-portfolio': { color: '#1D4ED8', bg: '#EFF6FF' },
  'roadmap':           { color: '#7C3AED', bg: '#F5F3FF' },
  'playbook':          { color: '#B45309', bg: '#FFFBEB' },
  'strategy':          { color: '#0F766E', bg: '#F0FDFA' },
  'other':             { color: '#6B7280', bg: '#F3F4F6' },
}

function TypeBadge({ type }) {
  const s = TYPE_COLORS[type] || TYPE_COLORS.other
  const label = DOC_TYPES.find((t) => t.value === type)?.label || type
  return (
    <span style={{ fontSize: 10, fontWeight: 500, color: s.color, background: s.bg, borderRadius: 3, padding: '2px 7px', whiteSpace: 'nowrap' }}>
      {label}
    </span>
  )
}

function ChunksModal({ doc, onClose }) {
  const [chunks, setChunks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/knowledge/search?q=${encodeURIComponent('the a')}&type=${doc.type}`)
      .then((r) => r.json())
      .then((data) => {
        // Load via documents then search — instead just show chunk count info
        setLoading(false)
      })
  }, [doc])

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 400 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="card" style={{ width: 600, maxWidth: '90vw', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
        <div className="flex items-start justify-between p-6" style={{ borderBottom: '0.75px solid #D9D8D6' }}>
          <div>
            <h2 className="text-base font-medium text-black">{doc.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <TypeBadge type={doc.type} />
              <span className="text-xs text-black/40 font-[350]">{doc.chunkCount} chunks indexed</span>
            </div>
          </div>
          <button onClick={onClose} style={{ fontSize: 20, color: 'rgba(0,0,0,0.25)', background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">
          <p className="text-sm text-black/50 font-[350] mb-4">
            This document has been split into {doc.chunkCount} chunks of approximately 500 tokens each. Use the search bar below to preview specific content.
          </p>
          <div className="p-4 text-sm text-black/40 font-[350] text-center" style={{ border: '0.79px dashed #D9D8D6', borderRadius: 6 }}>
            Use the search bar on the Knowledge Base page to query content from this document.
          </div>
        </div>
      </div>
    </div>
  )
}

export default function KnowledgeBase() {
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)

  // Upload form state
  const [uploadFile, setUploadFile] = useState(null)
  const [docName, setDocName] = useState('')
  const [docType, setDocType] = useState('other')
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState(null) // { type: 'ok'|'err', text, warning? }
  const fileInputRef = useRef(null)
  const [dragOver, setDragOver] = useState(false)

  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState(null)
  const [searching, setSearching] = useState(false)

  // View chunks modal
  const [viewDoc, setViewDoc] = useState(null)

  // Delete confirmation
  const [deletingId, setDeletingId] = useState(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  useEffect(() => { loadDocs() }, [])

  async function loadDocs() {
    setLoading(true)
    try {
      const res = await fetch('/api/knowledge/documents')
      if (res.ok) setDocs(await res.json())
    } catch {}
    setLoading(false)
  }

  function handleFileDrop(e) {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) {
      setUploadFile(f)
      if (!docName) setDocName(f.name.replace(/\.[^.]+$/, ''))
    }
  }

  function handleFileSelect(e) {
    const f = e.target.files[0]
    if (f) {
      setUploadFile(f)
      if (!docName) setDocName(f.name.replace(/\.[^.]+$/, ''))
    }
  }

  async function handleUpload(e) {
    e.preventDefault()
    if (!uploadFile) return
    setUploading(true)
    setUploadStatus(null)

    const formData = new FormData()
    formData.append('file', uploadFile)
    formData.append('docName', docName || uploadFile.name)
    formData.append('docType', docType)

    try {
      const res = await fetch('/api/knowledge/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) {
        setUploadStatus({ type: 'err', text: data.error || 'Upload failed.' })
      } else {
        setUploadStatus({
          type: 'ok',
          text: `Ingested "${data.docName}" — ${data.chunkCount} chunks indexed.`,
          warning: data.warning || null,
        })
        setUploadFile(null)
        setDocName('')
        setDocType('other')
        if (fileInputRef.current) fileInputRef.current.value = ''
        await loadDocs()
      }
    } catch {
      setUploadStatus({ type: 'err', text: 'Network error — please try again.' })
    }
    setUploading(false)
  }

  async function handleDelete(id) {
    setDeletingId(id)
    try {
      const res = await fetch('/api/knowledge/documents', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (res.ok) {
        setDocs((prev) => prev.filter((d) => d.id !== id))
      }
    } catch {}
    setDeletingId(null)
    setConfirmDeleteId(null)
  }

  async function handleSearch(e) {
    e.preventDefault()
    if (!searchQuery.trim()) return
    setSearching(true)
    setSearchResults(null)
    try {
      const res = await fetch(`/api/knowledge/search?q=${encodeURIComponent(searchQuery)}`)
      const data = await res.json()
      setSearchResults(data.results || [])
    } catch {
      setSearchResults([])
    }
    setSearching(false)
  }

  const totalChunks = docs.reduce((sum, d) => sum + (d.chunkCount || 0), 0)
  const lastUpload = docs.length > 0 ? new Date(docs[0].uploadDate).toLocaleDateString('en-CA') : null
  const storageWarning = totalChunks > 500

  return (
    <div className="space-y-6">

      {/* Health overview */}
      <div className="card p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-base font-medium text-black">Knowledge Base</h2>
            <p className="text-xs text-black/40 font-[350] mt-0.5">
              Documents ingested here are used by AI when generating copy, brainstorming, and creating suggestions.
            </p>
          </div>
          <div className="flex items-center gap-6 text-right pt-1">
            <div>
              <p className="text-xl font-medium text-black leading-none">{docs.length}</p>
              <p className="text-[9px] font-medium uppercase tracking-[1.38px] text-black/40 mt-0.5">Documents</p>
            </div>
            <div>
              <p className="text-xl font-medium text-black leading-none">{totalChunks}</p>
              <p className="text-[9px] font-medium uppercase tracking-[1.38px] text-black/40 mt-0.5">Chunks</p>
            </div>
            {lastUpload && (
              <div>
                <p className="text-sm font-medium text-black leading-none">{lastUpload}</p>
                <p className="text-[9px] font-medium uppercase tracking-[1.38px] text-black/40 mt-0.5">Last Upload</p>
              </div>
            )}
          </div>
        </div>

        {storageWarning && (
          <div className="px-4 py-3 text-sm font-[350] text-black/70" style={{ border: '0.79px solid #D35F0B', borderRadius: 6, background: '#FFF3EC' }}>
            Storage notice: {totalChunks} chunks are indexed. Vercel KV has a 256MB limit — consider removing older documents if uploads start failing.
          </div>
        )}
      </div>

      {/* Upload */}
      <div className="card p-6">
        <h2 className="text-base font-medium text-black mb-1">Upload document</h2>
        <p className="text-xs text-black/40 font-[350] mb-5">
          Accepts PDF or plain text files. Text is extracted, chunked into ~500-token segments, and stored in KV for AI retrieval.
        </p>

        <form onSubmit={handleUpload} className="space-y-4">
          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `0.79px dashed ${dragOver ? '#D35F0B' : '#D9D8D6'}`,
              borderRadius: 6,
              padding: '32px 24px',
              textAlign: 'center',
              cursor: 'pointer',
              background: dragOver ? '#FFF3EC' : '#FAFAFA',
              transition: 'background 0.15s, border-color 0.15s',
            }}
          >
            <input ref={fileInputRef} type="file" accept=".pdf,.txt,.text" onChange={handleFileSelect} style={{ display: 'none' }} />
            {uploadFile ? (
              <div>
                <p className="text-sm font-medium text-black">📄 {uploadFile.name}</p>
                <p className="text-xs text-black/40 font-[350] mt-1">{(uploadFile.size / 1024).toFixed(0)} KB — click to change</p>
              </div>
            ) : (
              <div>
                <p className="text-sm text-black/50 font-[350]">Drop a PDF or .txt file here, or <span className="text-black underline">click to browse</span></p>
                <p className="text-xs text-black/30 font-[350] mt-1">Max 50 MB</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="section-label">Document name</label>
              <input
                className="input"
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
                placeholder="e.g. Customer Stories 2025"
              />
            </div>
            <div>
              <label className="section-label">Document type</label>
              <select className="input" value={docType} onChange={(e) => setDocType(e.target.value)}>
                {DOC_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>

          {uploadStatus && (
            <div
              className="px-4 py-3 text-sm font-[350]"
              style={{
                border: `0.79px solid ${uploadStatus.type === 'ok' ? '#49763E' : '#D35F0B'}`,
                borderRadius: 6,
                background: uploadStatus.type === 'ok' ? '#EFF6EE' : '#FFF3EC',
                color: uploadStatus.type === 'ok' ? '#1A3E15' : '#7A2E00',
              }}
            >
              {uploadStatus.text}
              {uploadStatus.warning && (
                <p className="mt-1 text-xs opacity-75">{uploadStatus.warning}</p>
              )}
            </div>
          )}

          <button
            type="submit"
            className="btn-primary"
            disabled={uploading || !uploadFile}
          >
            {uploading ? 'Indexing…' : 'Upload and index →'}
          </button>
        </form>
      </div>

      {/* Search */}
      <div className="card p-6">
        <h2 className="text-base font-medium text-black mb-1">Search knowledge base</h2>
        <p className="text-xs text-black/40 font-[350] mb-4">Verify ingested content by searching for specific topics, customer names, or product terms.</p>
        <form onSubmit={handleSearch} className="flex gap-3 mb-4">
          <input
            className="input flex-1"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="e.g. CSX customer story safety incident"
          />
          <button type="submit" className="btn-secondary" disabled={searching || !searchQuery.trim()}>
            {searching ? 'Searching…' : 'Search'}
          </button>
        </form>

        {searchResults !== null && (
          <div className="space-y-3">
            {searchResults.length === 0 ? (
              <p className="text-sm text-black/40 font-[350]">No matching chunks found for "{searchQuery}".</p>
            ) : (
              <>
                <p className="text-xs text-black/40 font-[350]">{searchResults.length} result{searchResults.length !== 1 ? 's' : ''} — showing top matches</p>
                {searchResults.map((chunk, i) => (
                  <div key={i} className="p-4 space-y-2" style={{ border: '0.75px solid #D9D8D6', borderRadius: 6 }}>
                    <div className="flex items-center gap-2">
                      <TypeBadge type={chunk.docType} />
                      <span className="text-xs text-black/50 font-[350]">{chunk.docName}</span>
                      <span className="text-xs text-black/30 font-[350]">chunk {chunk.chunkIndex + 1}</span>
                      <span className="text-xs text-black/30 font-mono ml-auto">score: {chunk.score}</span>
                    </div>
                    <p className="text-xs text-black/70 font-[350] leading-relaxed whitespace-pre-wrap line-clamp-6">
                      {chunk.text.slice(0, 500)}{chunk.text.length > 500 ? '…' : ''}
                    </p>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {/* Document library */}
      <div className="card">
        <div className="px-6 py-4" style={{ borderBottom: '0.75px solid #D9D8D6' }}>
          <p className="font-medium text-black text-sm">Document library</p>
          <p className="text-xs text-black/40 font-[350] mt-0.5">All indexed documents and their chunk counts.</p>
        </div>

        {loading ? (
          <p className="text-sm text-black/40 p-6 font-[350]">Loading…</p>
        ) : docs.length === 0 ? (
          <p className="text-sm text-black/40 p-6 font-[350] italic">No documents uploaded yet. Upload a PDF above to get started.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#FAFAFA', borderBottom: '0.75px solid #D9D8D6' }}>
                  {['Document', 'Type', 'Uploaded', 'Chunks', ''].map((h, i) => (
                    <th key={i} style={{
                      padding: '8px 16px', paddingLeft: i === 0 ? 24 : 16,
                      textAlign: 'left', fontSize: 9, fontWeight: 500,
                      textTransform: 'uppercase', letterSpacing: '1.38px',
                      color: 'rgba(0,0,0,0.4)', whiteSpace: 'nowrap',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {docs.map((doc) => (
                  <tr key={doc.id} style={{ borderBottom: '0.75px solid #D9D8D6' }}>
                    <td style={{ padding: '10px 16px 10px 24px', fontSize: 13, fontWeight: 500, color: '#000', maxWidth: 240 }}>
                      <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {doc.name}
                      </span>
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <TypeBadge type={doc.type} />
                    </td>
                    <td style={{ padding: '10px 16px', fontSize: 12, color: 'rgba(0,0,0,0.4)', whiteSpace: 'nowrap' }}>
                      {new Date(doc.uploadDate).toLocaleDateString('en-CA')}
                    </td>
                    <td style={{ padding: '10px 16px', fontSize: 12, color: 'rgba(0,0,0,0.5)', fontVariantNumeric: 'tabular-nums' }}>
                      {doc.chunkCount}
                    </td>
                    <td style={{ padding: '10px 16px', whiteSpace: 'nowrap' }}>
                      <button
                        onClick={() => setViewDoc(doc)}
                        style={{ fontSize: 11, color: 'rgba(0,0,0,0.4)', background: 'none', border: 'none', cursor: 'pointer', marginRight: 10 }}
                        className="hover:text-black transition-colors"
                      >
                        View chunks
                      </button>
                      {confirmDeleteId === doc.id ? (
                        <>
                          <button
                            onClick={() => handleDelete(doc.id)}
                            disabled={deletingId === doc.id}
                            style={{ fontSize: 11, color: '#B91C1C', background: 'none', border: 'none', cursor: 'pointer', marginRight: 6, fontWeight: 500 }}
                          >
                            {deletingId === doc.id ? 'Deleting…' : 'Confirm delete'}
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            style={{ fontSize: 11, color: 'rgba(0,0,0,0.3)', background: 'none', border: 'none', cursor: 'pointer' }}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(doc.id)}
                          style={{ fontSize: 11, color: 'rgba(0,0,0,0.3)', background: 'none', border: 'none', cursor: 'pointer' }}
                          className="hover:text-cority-red transition-colors"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {viewDoc && <ChunksModal doc={viewDoc} onClose={() => setViewDoc(null)} />}
    </div>
  )
}
