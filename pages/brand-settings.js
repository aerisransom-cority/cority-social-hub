import { useState, useEffect } from 'react'

export default function BrandSettings() {
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState(null) // 'saved' | 'error' | null
  const [activeSection, setActiveSection] = useState('overview')
  const [editingPrompt, setEditingPrompt] = useState(false)

  useEffect(() => {
    fetch('/api/brand-settings')
      .then((r) => r.json())
      .then((data) => {
        setSettings(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

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

  function handleFieldChange(field, value) {
    const updated = { ...settings, [field]: value }
    setSettings(updated)
  }

  function handleVoicePillarChange(id, field, value) {
    const updated = {
      ...settings,
      voicePillars: settings.voicePillars.map((p) =>
        p.id === id ? { ...p, [field]: value } : p
      ),
    }
    setSettings(updated)
  }

  function handleThemeChange(themeId, field, value) {
    const updated = {
      ...settings,
      storytellingThemes: settings.storytellingThemes.map((t) =>
        t.id === themeId ? { ...t, [field]: value } : t
      ),
    }
    setSettings(updated)
  }

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
    { id: 'overview', label: 'Overview' },
    { id: 'voice', label: 'Voice Pillars' },
    { id: 'themes', label: 'Story Themes' },
    { id: 'campaigns', label: 'Campaigns' },
    { id: 'content', label: 'Content Mix' },
    { id: 'platforms', label: 'Platforms' },
    { id: 'ai-prompt', label: 'AI System Prompt' },
  ]

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
          {saveStatus === 'saved' && (
            <span className="text-xs text-black/50 font-medium uppercase tracking-eyebrow">✓ Saved</span>
          )}
          {saveStatus === 'error' && (
            <span className="text-xs text-cority-red font-medium">Save failed</span>
          )}
          <button
            className="btn-primary"
            onClick={() => save(settings)}
            disabled={saving}
          >
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
                  activeSection === s.id
                    ? 'text-cority-red font-medium'
                    : 'text-black/50 hover:text-black'
                }`}
                style={{
                  borderLeft: activeSection === s.id ? '1.5px solid #E3001B' : '1.5px solid transparent',
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
                <textarea
                  className="textarea"
                  rows={2}
                  value={settings.vision}
                  onChange={(e) => handleFieldChange('vision', e.target.value)}
                />
              </div>

              <div>
                <label className="section-label">How We Win</label>
                <textarea
                  className="textarea"
                  rows={2}
                  value={settings.winStrategy}
                  onChange={(e) => handleFieldChange('winStrategy', e.target.value)}
                />
              </div>

              {/* Brand color swatch */}
              <div>
                <label className="section-label">Brand Color</label>
                <div className="flex items-center gap-4">
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      backgroundColor: settings.brandColors?.primary,
                      borderRadius: '6px',
                      border: '0.79px solid #D9D8D6',
                      flexShrink: 0,
                    }}
                  />
                  <div>
                    <p className="text-sm font-medium text-black font-mono">
                      {settings.brandColors?.primary}
                    </p>
                    <p className="text-xs text-black/40 font-[350]">Cority Red — primary</p>
                  </div>
                </div>
              </div>

              {/* Related clouds */}
              <div>
                <label className="section-label">Cority Clouds / Products</label>
                <div className="flex flex-wrap gap-2">
                  {settings.relatedClouds?.map((cloud) => (
                    <span key={cloud} className="tag">{cloud}</span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* VOICE PILLARS */}
          {activeSection === 'voice' && (
            <div className="card p-8">
              <h2 className="text-base font-medium text-black mb-6">Voice Pillars</h2>
              <div className="space-y-px" style={{ borderTop: '0.75px solid #D9D8D6' }}>
                {settings.voicePillars.map((pillar, i) => (
                  <div
                    key={pillar.id}
                    className="flex items-start gap-6 py-6"
                    style={{ borderBottom: '0.75px solid #D9D8D6' }}
                  >
                    <div
                      className="flex-shrink-0 flex items-center justify-center text-cority-red font-medium text-xs"
                      style={{
                        width: '24px',
                        height: '24px',
                        border: '0.79px solid #E3001B',
                        borderRadius: '6px',
                        marginTop: '6px',
                      }}
                    >
                      {i + 1}
                    </div>
                    <div className="flex-1 space-y-2">
                      <input
                        className="input font-medium"
                        value={pillar.name}
                        onChange={(e) => handleVoicePillarChange(pillar.id, 'name', e.target.value)}
                      />
                      <textarea
                        className="textarea"
                        rows={2}
                        value={pillar.description}
                        onChange={(e) =>
                          handleVoicePillarChange(pillar.id, 'description', e.target.value)
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STORYTELLING THEMES */}
          {activeSection === 'themes' && (
            <div className="card p-8">
              <h2 className="text-base font-medium text-black mb-1">Social Storytelling Themes</h2>
              <p className="text-sm text-black/40 font-[350] mb-6">
                These themes frame every post. AI uses them to anchor copy to a strategic narrative.
              </p>
              <div style={{ borderTop: '0.75px solid #D9D8D6' }}>
                {settings.storytellingThemes.map((theme) => (
                  <div
                    key={theme.id}
                    className="flex items-start gap-6 py-5"
                    style={{ borderBottom: '0.75px solid #D9D8D6' }}
                  >
                    <div
                      className="flex-shrink-0 flex items-center justify-center text-black/30 font-medium text-xs"
                      style={{
                        width: '24px',
                        height: '24px',
                        border: '0.79px solid #D9D8D6',
                        borderRadius: '6px',
                        marginTop: '6px',
                      }}
                    >
                      {theme.id}
                    </div>
                    <div className="flex-1 space-y-2">
                      <input
                        className="input font-medium"
                        value={theme.theme}
                        onChange={(e) => handleThemeChange(theme.id, 'theme', e.target.value)}
                      />
                      <textarea
                        className="textarea"
                        rows={1}
                        value={theme.description}
                        onChange={(e) => handleThemeChange(theme.id, 'description', e.target.value)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CAMPAIGNS */}
          {activeSection === 'campaigns' && (
            <div className="card p-8">
              <h2 className="text-base font-medium text-black mb-1">Active Campaigns — H1 2026</h2>
              <p className="text-sm text-black/40 font-[350] mb-6">AI will reference these when generating campaign-aligned copy.</p>
              <div style={{ borderTop: '0.75px solid #D9D8D6' }}>
                {settings.activeCampaigns.map((campaign) => (
                  <div
                    key={campaign.id}
                    className="py-6"
                    style={{ borderBottom: '0.75px solid #D9D8D6' }}
                  >
                    <p className="font-medium text-black text-sm mb-3">{campaign.name}</p>
                    <div className="flex flex-wrap gap-2">
                      {campaign.themes.map((theme) => (
                        <span key={theme} className="tag">{theme}</span>
                      ))}
                    </div>
                  </div>
                ))}
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
                      <span
                        style={{
                          display: 'inline-block',
                          width: '8px',
                          height: '8px',
                          backgroundColor: '#49763E',
                          borderRadius: '2px',
                          flexShrink: 0,
                        }}
                      />
                      High Performing
                    </div>
                    <ul style={{ borderTop: '0.75px solid #D9D8D6' }}>
                      {settings.contentPerformance.highPerforming.map((item) => (
                        <li
                          key={item}
                          className="text-sm text-black font-[350] flex items-start gap-2 py-2.5"
                          style={{ borderBottom: '0.75px solid #D9D8D6' }}
                        >
                          <span className="text-xs mt-0.5" style={{ color: '#49763E' }}>↑</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="section-label flex items-center gap-2">
                      <span
                        style={{
                          display: 'inline-block',
                          width: '8px',
                          height: '8px',
                          backgroundColor: '#E3001B',
                          borderRadius: '2px',
                          flexShrink: 0,
                        }}
                      />
                      Underperforming
                    </div>
                    <ul style={{ borderTop: '0.75px solid #D9D8D6' }}>
                      {settings.contentPerformance.underPerforming.map((item) => (
                        <li
                          key={item}
                          className="text-sm text-black font-[350] flex items-start gap-2 py-2.5"
                          style={{ borderBottom: '0.75px solid #D9D8D6' }}
                        >
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
                  <div
                    key={platform.platform}
                    className="flex items-start gap-6 py-6"
                    style={{ borderBottom: '0.75px solid #D9D8D6' }}
                  >
                    <div className="w-28 flex-shrink-0">
                      <p className="font-medium text-black text-sm">{platform.platform}</p>
                      <span
                        className="tag mt-2"
                        style={{ display: 'inline-flex' }}
                      >
                        {platform.role}
                      </span>
                    </div>
                    <ul className="flex-1 space-y-1.5">
                      {platform.targets.map((target) => (
                        <li key={target} className="text-sm text-black/60 font-[350]">
                          {target}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI SYSTEM PROMPT */}
          {activeSection === 'ai-prompt' && (
            <div className="card p-8">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-base font-medium text-black">AI System Prompt</h2>
                  <p className="text-sm text-black/40 font-[350] mt-1">
                    This is injected into every AI call as the brand context. Edit with care.
                  </p>
                </div>
                <button
                  className="btn-secondary"
                  onClick={() => setEditingPrompt(!editingPrompt)}
                >
                  {editingPrompt ? 'Lock' : 'Edit'}
                </button>
              </div>
              {editingPrompt ? (
                <textarea
                  className="textarea font-mono text-xs leading-relaxed"
                  rows={28}
                  value={settings.aiSystemPrompt}
                  onChange={(e) => handleFieldChange('aiSystemPrompt', e.target.value)}
                />
              ) : (
                <pre
                  className="text-xs text-black/60 whitespace-pre-wrap leading-relaxed font-mono max-h-[500px] overflow-y-auto p-5"
                  style={{
                    border: '0.79px solid #D9D8D6',
                    borderRadius: '6px',
                    fontWeight: 350,
                  }}
                >
                  {settings.aiSystemPrompt}
                </pre>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
