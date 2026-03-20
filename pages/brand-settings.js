import { useState, useEffect, useRef } from 'react'
import KnowledgeBase from '../components/KnowledgeBase'

// ── Small inline helpers ────────────────────────────────────────────────────

function RemoveButton({ onClick, disabled, title, confirming, onConfirm, onCancel }) {
  if (confirming) {
    return (
      <div className="flex items-center gap-2" style={{ whiteSpace: 'nowrap' }}>
        <span className="text-xs text-black/50 font-[350]">Remove?</span>
        <button
          onClick={onConfirm}
          style={{ fontSize: 11, color: '#B91C1C', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}
        >
          Yes
        </button>
        <button
          onClick={onCancel}
          style={{ fontSize: 11, color: 'rgba(0,0,0,0.35)', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          Cancel
        </button>
      </div>
    )
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        fontSize: 11, color: disabled ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.35)',
        background: 'none', border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
      }}
      className={disabled ? '' : 'hover:text-cority-red transition-colors'}
    >
      Remove
    </button>
  )
}

// ── Campaign tag input ──────────────────────────────────────────────────────

function CampaignTagInput({ tags, onChange }) {
  const [input, setInput] = useState('')
  const inputRef = useRef(null)

  function addTag(raw) {
    const val = raw.trim()
    if (!val || tags.includes(val)) { setInput(''); return }
    onChange([...tags, val])
    setInput('')
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(input)
    } else if (e.key === 'Backspace' && !input && tags.length > 0) {
      onChange(tags.slice(0, -1))
    }
  }

  return (
    <div
      className="flex flex-wrap items-center gap-1.5"
      style={{ border: '0.79px solid #D9D8D6', borderRadius: 6, padding: '6px 10px', minHeight: 38, cursor: 'text' }}
      onClick={() => inputRef.current?.focus()}
    >
      {tags.map((t) => (
        <span
          key={t}
          className="tag flex items-center gap-1"
          style={{ paddingRight: 4 }}
        >
          {t}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onChange(tags.filter((x) => x !== t)) }}
            style={{ fontSize: 12, lineHeight: 1, color: 'inherit', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            ×
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => input.trim() && addTag(input)}
        placeholder={tags.length === 0 ? 'Type a tag and press Enter…' : ''}
        style={{ border: 'none', outline: 'none', fontSize: 13, fontWeight: 350, minWidth: 120, flex: 1, background: 'transparent' }}
      />
    </div>
  )
}

// ── Main page ───────────────────────────────────────────────────────────────

export default function BrandSettings() {
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState(null) // 'saved' | 'error' | null
  const [isDirty, setIsDirty] = useState(false)
  const [activeSection, setActiveSection] = useState('overview')
  // editingPrompt state kept for compatibility but no longer used as a lock toggle
  const [kbStats, setKbStats] = useState(null)

  // Confirm-remove states
  const [confirmRemovePillarId, setConfirmRemovePillarId] = useState(null)
  const [confirmRemoveThemeId, setConfirmRemoveThemeId] = useState(null)
  const [confirmRemoveCampaignId, setConfirmRemoveCampaignId] = useState(null)

  // Theme drag-and-drop
  const [dragThemeId, setDragThemeId] = useState(null)
  const [dragOverThemeId, setDragOverThemeId] = useState(null)

  useEffect(() => {
    fetch('/api/brand-settings')
      .then((r) => r.json())
      .then((data) => { setSettings(data); setLoading(false) })
      .catch(() => setLoading(false))

    fetch('/api/knowledge/documents')
      .then((r) => r.ok ? r.json() : [])
      .then((docs) => {
        if (Array.isArray(docs)) {
          const totalChunks = docs.reduce((s, d) => s + (d.chunkCount || 0), 0)
          setKbStats({ count: docs.length, totalChunks, lastUpload: docs[0]?.uploadDate || null })
        }
      })
      .catch(() => {})
  }, [])

  // Wrapper: always mark dirty when settings change
  function update(next) {
    setSettings(next)
    setIsDirty(true)
  }

  async function save(updated) {
    setSaving(true)
    setSaveStatus(null)
    try {
      const res = await fetch('/api/brand-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      })
      if (res.ok) {
        setSaveStatus('saved')
        setIsDirty(false)
        setTimeout(() => setSaveStatus(null), 3000)
      } else {
        setSaveStatus('error')
      }
    } catch {
      setSaveStatus('error')
    } finally {
      setSaving(false)
    }
  }

  // ── Field handlers ─────────────────────────────────────────────────────────

  function handleFieldChange(field, value) {
    update({ ...settings, [field]: value })
  }

  // Voice pillars
  function handleVoicePillarChange(id, field, value) {
    update({ ...settings, voicePillars: settings.voicePillars.map((p) => p.id === id ? { ...p, [field]: value } : p) })
  }
  function addVoicePillar() {
    const newPillar = { id: `pillar-${Date.now()}`, name: '', description: '' }
    update({ ...settings, voicePillars: [...settings.voicePillars, newPillar] })
  }
  function removeVoicePillar(id) {
    update({ ...settings, voicePillars: settings.voicePillars.filter((p) => p.id !== id) })
    setConfirmRemovePillarId(null)
  }

  // Story themes
  function handleThemeChange(id, field, value) {
    update({ ...settings, storytellingThemes: settings.storytellingThemes.map((t) => t.id === id ? { ...t, [field]: value } : t) })
  }
  function addTheme() {
    const themes = settings.storytellingThemes
    const newId = themes.length > 0 ? Math.max(...themes.map((t) => Number(t.id) || 0)) + 1 : 1
    update({ ...settings, storytellingThemes: [...themes, { id: newId, theme: '', description: '' }] })
  }
  function removeTheme(id) {
    const filtered = settings.storytellingThemes.filter((t) => t.id !== id)
    // Renumber sequentially
    const renumbered = filtered.map((t, i) => ({ ...t, id: i + 1 }))
    update({ ...settings, storytellingThemes: renumbered })
    setConfirmRemoveThemeId(null)
  }
  function handleThemeDrop(targetId) {
    if (!dragThemeId || dragThemeId === targetId) {
      setDragThemeId(null); setDragOverThemeId(null); return
    }
    const themes = [...settings.storytellingThemes]
    const fromIdx = themes.findIndex((t) => t.id === dragThemeId)
    const toIdx = themes.findIndex((t) => t.id === targetId)
    const [moved] = themes.splice(fromIdx, 1)
    themes.splice(toIdx, 0, moved)
    const renumbered = themes.map((t, i) => ({ ...t, id: i + 1 }))
    update({ ...settings, storytellingThemes: renumbered })
    setDragThemeId(null); setDragOverThemeId(null)
  }

  // Campaigns
  function handleCampaignChange(id, field, value) {
    update({ ...settings, activeCampaigns: settings.activeCampaigns.map((c) => c.id === id ? { ...c, [field]: value } : c) })
  }
  function toggleCampaignActive(id) {
    update({
      ...settings,
      activeCampaigns: settings.activeCampaigns.map((c) =>
        c.id === id ? { ...c, active: c.active === false ? true : false } : c
      ),
    })
  }
  function addCampaign() {
    const newCampaign = { id: `campaign-${Date.now()}`, name: '', description: '', themes: [], active: true }
    update({ ...settings, activeCampaigns: [...settings.activeCampaigns, newCampaign] })
  }
  function removeCampaign(id) {
    update({ ...settings, activeCampaigns: settings.activeCampaigns.filter((c) => c.id !== id) })
    setConfirmRemoveCampaignId(null)
  }

  // ── Loading / error states ─────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-black/40 text-sm font-[350]">Loading brand settings…</div>
      </div>
    )
  }
  if (!settings) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-cority-red text-sm">Failed to load settings.</div>
      </div>
    )
  }

  const sections = [
    { id: 'overview',   label: 'Overview' },
    { id: 'voice',      label: 'Voice Pillars' },
    { id: 'themes',     label: 'Story Themes' },
    { id: 'campaigns',  label: 'Campaigns' },
    { id: 'content',    label: 'Content Mix' },
    { id: 'platforms',  label: 'Platforms' },
    { id: 'ai-prompt',  label: 'AI Instructions' },
    { id: 'knowledge',  label: 'Knowledge Base' },
  ]

  const btnStyle = { fontSize: 11, color: '#D35F0B', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500, padding: 0 }

  return (
    <div>
      {/* Page header */}
      <div className="flex items-start justify-between mb-8" style={{ paddingTop: '24px' }}>
        <div>
          <h1 className="text-3xl text-black font-[350] leading-tight">Brand Settings</h1>
          <p className="text-sm text-black/50 mt-1 font-[350]">
            The source of truth for all AI-generated content in this hub.
          </p>
        </div>
        <div className="flex items-center gap-4 pt-1">
          {isDirty && !saving && saveStatus !== 'saved' && (
            <span className="text-xs text-black/35 font-[350]">Unsaved changes</span>
          )}
          {saveStatus === 'saved' && (
            <span className="text-xs text-black/50 font-medium uppercase tracking-eyebrow">✓ Saved</span>
          )}
          {saveStatus === 'error' && (
            <span className="text-xs text-cority-red font-medium">Save failed</span>
          )}
          <button className="btn-primary" onClick={() => save(settings)} disabled={saving}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="flex gap-8">
        {/* Sidebar nav */}
        <aside className="w-40 flex-shrink-0">
          <nav className="flex flex-col sticky top-32">
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`text-left py-2 pr-3 text-sm transition-colors font-[350] ${
                  activeSection === s.id ? 'text-cority-red font-medium' : 'text-black/50 hover:text-black'
                }`}
                style={{
                  borderLeft: activeSection === s.id ? '1.5px solid #D35F0B' : '1.5px solid transparent',
                  paddingLeft: '10px',
                }}
              >
                {s.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <div className="flex-1 min-w-0 space-y-6">

          {/* OVERVIEW */}
          {activeSection === 'overview' && (
            <div className="card p-8 space-y-6">
              <h2 className="text-base font-medium text-black">Brand Overview</h2>

              <div>
                <label className="section-label">Brand Vision</label>
                <textarea className="textarea" rows={2} value={settings.vision}
                  onChange={(e) => handleFieldChange('vision', e.target.value)} />
              </div>

              <div>
                <label className="section-label">How We Win</label>
                <textarea className="textarea" rows={2} value={settings.winStrategy}
                  onChange={(e) => handleFieldChange('winStrategy', e.target.value)} />
              </div>

              <div>
                <label className="section-label">Brand Color</label>
                <div className="flex items-center gap-4">
                  <div style={{ width: 40, height: 40, backgroundColor: settings.brandColors?.primary, borderRadius: 6, border: '0.79px solid #D9D8D6', flexShrink: 0 }} />
                  <div>
                    <p className="text-sm font-medium text-black font-mono">{settings.brandColors?.primary}</p>
                    <p className="text-xs text-black/40 font-[350]">Cority Orange — primary</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="section-label">Cority Clouds / Products</label>
                <div className="flex flex-wrap gap-2">
                  {settings.relatedClouds?.map((cloud) => (
                    <span key={cloud} className="tag">{cloud}</span>
                  ))}
                </div>
              </div>

              <div style={{ borderTop: '0.75px solid #D9D8D6', paddingTop: 20 }}>
                <div className="flex items-center justify-between">
                  <div>
                    <label className="section-label" style={{ marginBottom: 4 }}>Knowledge Base</label>
                    {kbStats ? (
                      <p className="text-sm text-black/60 font-[350]">
                        {kbStats.count} document{kbStats.count !== 1 ? 's' : ''} — {kbStats.totalChunks} chunks indexed
                        {kbStats.lastUpload && ` · Last upload ${new Date(kbStats.lastUpload).toLocaleDateString('en-CA')}`}
                      </p>
                    ) : (
                      <p className="text-sm text-black/40 font-[350]">No documents uploaded yet.</p>
                    )}
                  </div>
                  <button onClick={() => setActiveSection('knowledge')} className="btn-secondary text-xs" style={{ flexShrink: 0, marginLeft: 16 }}>
                    Manage →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* VOICE PILLARS */}
          {activeSection === 'voice' && (
            <div className="card p-8">
              <h2 className="text-base font-medium text-black mb-1">Voice Pillars</h2>
              <p className="text-xs text-black/40 font-[350] mb-6">
                Each pillar shapes the tone of all AI-generated content.
              </p>
              <div style={{ borderTop: '0.75px solid #D9D8D6' }}>
                {settings.voicePillars.map((pillar, i) => (
                  <div
                    key={pillar.id}
                    className="flex items-start gap-4 py-6"
                    style={{ borderBottom: '0.75px solid #D9D8D6' }}
                  >
                    {/* Index badge */}
                    <div
                      className="flex-shrink-0 flex items-center justify-center text-cority-red font-medium text-xs"
                      style={{ width: 24, height: 24, border: '0.79px solid #D35F0B', borderRadius: 6, marginTop: 6 }}
                    >
                      {i + 1}
                    </div>

                    {/* Fields */}
                    <div className="flex-1 space-y-2">
                      <input
                        className="input font-medium"
                        value={pillar.name}
                        onChange={(e) => handleVoicePillarChange(pillar.id, 'name', e.target.value)}
                        placeholder="Pillar name"
                      />
                      <textarea
                        className="textarea"
                        rows={2}
                        value={pillar.description}
                        onChange={(e) => handleVoicePillarChange(pillar.id, 'description', e.target.value)}
                        placeholder="Describe this pillar…"
                      />
                    </div>

                    {/* Remove */}
                    <div className="flex-shrink-0 pt-1">
                      <RemoveButton
                        onClick={() => setConfirmRemovePillarId(pillar.id)}
                        disabled={settings.voicePillars.length === 1}
                        title={settings.voicePillars.length === 1 ? 'At least one voice pillar is required' : ''}
                        confirming={confirmRemovePillarId === pillar.id}
                        onConfirm={() => removeVoicePillar(pillar.id)}
                        onCancel={() => setConfirmRemovePillarId(null)}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4">
                <button style={btnStyle} onClick={addVoicePillar}>+ Add pillar</button>
              </div>
            </div>
          )}

          {/* STORYTELLING THEMES */}
          {activeSection === 'themes' && (
            <div className="card p-8">
              <h2 className="text-base font-medium text-black mb-1">Social Storytelling Themes</h2>
              <p className="text-sm text-black/40 font-[350] mb-6">
                These themes frame every post. AI uses them to anchor copy to a strategic narrative. Drag to reorder.
              </p>
              <div style={{ borderTop: '0.75px solid #D9D8D6' }}>
                {settings.storytellingThemes.map((theme, i) => (
                  <div
                    key={theme.id}
                    draggable
                    onDragStart={() => setDragThemeId(theme.id)}
                    onDragEnd={() => { setDragThemeId(null); setDragOverThemeId(null) }}
                    onDragOver={(e) => { e.preventDefault(); setDragOverThemeId(theme.id) }}
                    onDrop={() => handleThemeDrop(theme.id)}
                    className="flex items-start gap-4 py-5 transition-colors"
                    style={{
                      borderBottom: '0.75px solid #D9D8D6',
                      background: dragOverThemeId === theme.id && dragThemeId !== theme.id ? '#FFF3EC' : 'transparent',
                      opacity: dragThemeId === theme.id ? 0.5 : 1,
                    }}
                  >
                    {/* Drag handle */}
                    <div
                      className="flex-shrink-0 flex items-center justify-center text-black/20"
                      style={{ width: 20, height: 24, marginTop: 8, cursor: 'grab', fontSize: 14, letterSpacing: -1 }}
                    >
                      ⠿
                    </div>

                    {/* Index badge */}
                    <div
                      className="flex-shrink-0 flex items-center justify-center text-black/30 font-medium text-xs"
                      style={{ width: 24, height: 24, border: '0.79px solid #D9D8D6', borderRadius: 6, marginTop: 6 }}
                    >
                      {i + 1}
                    </div>

                    {/* Fields */}
                    <div className="flex-1 space-y-2">
                      <input
                        className="input font-medium"
                        value={theme.theme}
                        onChange={(e) => handleThemeChange(theme.id, 'theme', e.target.value)}
                        placeholder="Theme name"
                      />
                      <textarea
                        className="textarea"
                        rows={1}
                        value={theme.description}
                        onChange={(e) => handleThemeChange(theme.id, 'description', e.target.value)}
                        placeholder="One-line description…"
                      />
                    </div>

                    {/* Remove */}
                    <div className="flex-shrink-0 pt-1">
                      <RemoveButton
                        onClick={() => setConfirmRemoveThemeId(theme.id)}
                        confirming={confirmRemoveThemeId === theme.id}
                        onConfirm={() => removeTheme(theme.id)}
                        onCancel={() => setConfirmRemoveThemeId(null)}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4">
                <button style={btnStyle} onClick={addTheme}>+ Add theme</button>
              </div>
            </div>
          )}

          {/* CAMPAIGNS */}
          {activeSection === 'campaigns' && (
            <div className="card p-8">
              <h2 className="text-base font-medium text-black mb-1">Campaigns</h2>
              <p className="text-sm text-black/40 font-[350] mb-6">AI will reference active campaigns when generating campaign-aligned copy.</p>

              <div className="space-y-6">
                {settings.activeCampaigns.map((campaign) => {
                  const isActive = campaign.active !== false
                  return (
                    <div
                      key={campaign.id}
                      className="p-5 space-y-4"
                      style={{ border: '0.75px solid #D9D8D6', borderRadius: 8, background: isActive ? '#fff' : '#FAFAFA' }}
                    >
                      {/* Header row */}
                      <div className="flex items-start gap-3">
                        <input
                          className="input font-medium flex-1"
                          value={campaign.name}
                          onChange={(e) => handleCampaignChange(campaign.id, 'name', e.target.value)}
                          placeholder="Campaign name"
                          style={{ fontSize: 14 }}
                        />

                        <div className="flex items-center gap-2 flex-shrink-0 pt-1">
                          {/* Active toggle */}
                          <button
                            onClick={() => toggleCampaignActive(campaign.id)}
                            style={{
                              fontSize: 10, fontWeight: 500, borderRadius: 3, padding: '2px 8px', border: 'none', cursor: 'pointer',
                              color: isActive ? '#49763E' : 'rgba(0,0,0,0.35)',
                              background: isActive ? '#EFF6EE' : '#F3F4F6',
                            }}
                          >
                            {isActive ? 'Active' : 'Inactive'}
                          </button>

                          {/* Remove */}
                          <RemoveButton
                            onClick={() => setConfirmRemoveCampaignId(campaign.id)}
                            confirming={confirmRemoveCampaignId === campaign.id}
                            onConfirm={() => removeCampaign(campaign.id)}
                            onCancel={() => setConfirmRemoveCampaignId(null)}
                          />
                        </div>
                      </div>

                      {/* Description */}
                      <div>
                        <label className="section-label">Description</label>
                        <textarea
                          className="textarea"
                          rows={2}
                          value={campaign.description || ''}
                          onChange={(e) => handleCampaignChange(campaign.id, 'description', e.target.value)}
                          placeholder="What is this campaign about? What is the main message?"
                        />
                      </div>

                      {/* Theme tags */}
                      <div>
                        <label className="section-label">Theme tags</label>
                        <CampaignTagInput
                          tags={campaign.themes || []}
                          onChange={(tags) => handleCampaignChange(campaign.id, 'themes', tags)}
                        />
                        <p className="text-[10px] text-black/35 font-[350] mt-1.5">Press Enter or comma to add a tag. Click × to remove.</p>
                      </div>
                    </div>
                  )
                })}
              </div>

              {settings.activeCampaigns.length === 0 && (
                <p className="text-sm text-black/40 font-[350] italic mb-4">No campaigns yet.</p>
              )}

              <div className="pt-4">
                <button style={btnStyle} onClick={addCampaign}>+ Add campaign</button>
              </div>
            </div>
          )}

          {/* CONTENT MIX */}
          {activeSection === 'content' && (
            <div className="space-y-6">
              <div className="card p-8">
                <h2 className="text-base font-medium text-black mb-1">Always-On Content</h2>
                <p className="text-sm text-black/40 font-[350] mb-5">Content types to maintain consistently regardless of campaign.</p>
                <div className="flex flex-wrap gap-2">
                  {settings.alwaysOnContent.map((item) => (
                    <span key={item} className="tag">{item}</span>
                  ))}
                </div>
              </div>

              <div className="card p-8">
                <h2 className="text-base font-medium text-black mb-6">Content Performance</h2>
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <div className="section-label flex items-center gap-2">
                      <span style={{ display: 'inline-block', width: 8, height: 8, backgroundColor: '#49763E', borderRadius: 2, flexShrink: 0 }} />
                      High Performing
                    </div>
                    <ul style={{ borderTop: '0.75px solid #D9D8D6' }}>
                      {settings.contentPerformance.highPerforming.map((item) => (
                        <li key={item} className="text-sm text-black font-[350] flex items-start gap-2 py-2.5" style={{ borderBottom: '0.75px solid #D9D8D6' }}>
                          <span className="text-xs mt-0.5" style={{ color: '#49763E' }}>↑</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="section-label flex items-center gap-2">
                      <span style={{ display: 'inline-block', width: 8, height: 8, backgroundColor: '#D35F0B', borderRadius: 2, flexShrink: 0 }} />
                      Underperforming
                    </div>
                    <ul style={{ borderTop: '0.75px solid #D9D8D6' }}>
                      {settings.contentPerformance.underPerforming.map((item) => (
                        <li key={item} className="text-sm text-black font-[350] flex items-start gap-2 py-2.5" style={{ borderBottom: '0.75px solid #D9D8D6' }}>
                          <span className="text-xs mt-0.5 text-cority-red">↓</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PLATFORMS */}
          {activeSection === 'platforms' && (
            <div className="card p-8">
              <h2 className="text-base font-medium text-black mb-6">Platform Cadence Targets</h2>
              <div style={{ borderTop: '0.75px solid #D9D8D6' }}>
                {settings.platformCadence.map((platform) => (
                  <div key={platform.platform} className="flex items-start gap-6 py-6" style={{ borderBottom: '0.75px solid #D9D8D6' }}>
                    <div className="w-28 flex-shrink-0">
                      <p className="font-medium text-black text-sm">{platform.platform}</p>
                      <span className="tag mt-2" style={{ display: 'inline-flex' }}>{platform.role}</span>
                    </div>
                    <ul className="flex-1 space-y-1.5">
                      {platform.targets.map((target) => (
                        <li key={target} className="text-sm text-black/60 font-[350]">{target}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI INSTRUCTIONS */}
          {activeSection === 'ai-prompt' && (
            <div className="space-y-6">
              <div className="card p-8">
                <h2 className="text-base font-medium text-black mb-1">Custom AI Instructions</h2>
                <p className="text-sm text-black/40 font-[350] mb-6">
                  Optional. These instructions are appended to the built-in brand-aware system prompt on every AI call. Use them for edge cases, tone nuances, or temporary guidance — the core prompt already includes your voice pillars, campaigns, and platform rules.
                </p>
                <textarea
                  className="textarea"
                  rows={6}
                  placeholder="e.g. For the next two weeks, avoid referencing competitors. Always mention our upcoming webinar on April 15 when relevant…"
                  value={settings.customInstructions || ''}
                  onChange={(e) => handleFieldChange('customInstructions', e.target.value)}
                />
                <p className="text-[10px] text-black/35 font-[350] mt-2">
                  Leave blank to use the built-in system prompt without modification.
                </p>
              </div>

              <div className="card p-8">
                <h2 className="text-base font-medium text-black mb-1">What the AI always knows</h2>
                <p className="text-sm text-black/40 font-[350] mb-4">
                  These are built into every AI prompt automatically from your brand settings — you don't need to repeat them in custom instructions.
                </p>
                <ul className="space-y-2">
                  {[
                    'Brand vision and win strategy',
                    'Voice pillars (Clarity, Empathy, Fact-Based, Action-Oriented)',
                    'All active storytelling themes',
                    'All active campaigns and their themes',
                    'High-performing and underperforming content formats',
                    'Always-on content types',
                    'Platform cadence targets',
                    'Knowledge base documents (when relevant to the request)',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-black/60 font-[350]">
                      <span className="text-xs mt-0.5" style={{ color: '#49763E' }}>✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* KNOWLEDGE BASE */}
          {activeSection === 'knowledge' && <KnowledgeBase />}

        </div>
      </div>
    </div>
  )
}
