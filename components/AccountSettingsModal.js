import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'

export default function AccountSettingsModal({ onClose }) {
  const { data: session, update: updateSession } = useSession()
  const isAdmin = session?.user?.role === 'admin'

  const [name, setName] = useState(session?.user?.name || '')
  const [email, setEmail] = useState(session?.user?.email || '')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState(null) // { type: 'ok'|'err', text }
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Sync if session changes externally
  useEffect(() => {
    setName(session?.user?.name || '')
    setEmail(session?.user?.email || '')
  }, [session?.user?.name, session?.user?.email])

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    setSaveMsg(null)
    try {
      const res = await fetch('/api/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email }),
      })
      const data = await res.json()
      if (!res.ok) {
        setSaveMsg({ type: 'err', text: data.error || 'Save failed' })
      } else {
        // Update the live session so the nav reflects the new name immediately
        await updateSession({ name, email })
        setSaveMsg({ type: 'ok', text: 'Changes saved' })
        setTimeout(() => setSaveMsg(null), 3000)
      }
    } catch {
      setSaveMsg({ type: 'err', text: 'Network error — please try again' })
    }
    setSaving(false)
  }

  async function deleteAccount() {
    setDeleting(true)
    try {
      const res = await fetch('/api/account', { method: 'DELETE' })
      if (res.ok) {
        await signOut({ callbackUrl: '/login' })
      } else {
        const data = await res.json()
        setSaveMsg({ type: 'err', text: data.error || 'Delete failed' })
        setConfirmDelete(false)
      }
    } catch {
      setSaveMsg({ type: 'err', text: 'Network error — please try again' })
      setConfirmDelete(false)
    }
    setDeleting(false)
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="card" style={{ width: 440, maxWidth: '90vw', padding: 32 }}>
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-base font-medium text-black">Account Settings</h2>
            <p className="text-xs text-black/40 font-[350] mt-0.5">Update your profile information.</p>
          </div>
          <button
            onClick={onClose}
            style={{ fontSize: 20, lineHeight: 1, color: 'rgba(0,0,0,0.25)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', marginTop: -2 }}
          >
            ×
          </button>
        </div>

        <form onSubmit={save} className="space-y-4">
          <div>
            <label className="section-label">Display name</label>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
            />
          </div>

          <div>
            <label className="section-label">
              Email address
              {isAdmin && <span className="normal-case font-[350] text-black/35"> — display only for admin</span>}
            </label>
            <input
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@cority.com"
              disabled={isAdmin}
              style={isAdmin ? { opacity: 0.5 } : {}}
            />
            {isAdmin && (
              <p className="text-[10px] text-black/35 font-[350] mt-1.5 leading-relaxed">
                Admin credentials are managed through environment variables. Update ADMIN_EMAIL in your Vercel project settings to change your login email.
              </p>
            )}
          </div>

          {saveMsg && (
            <p className={`text-xs font-[350] ${saveMsg.type === 'ok' ? 'text-green-600' : 'text-cority-red'}`}>
              {saveMsg.text}
            </p>
          )}

          <button type="submit" className="btn-primary w-full" disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </form>

        {/* Delete account */}
        <div style={{ borderTop: '0.75px solid #D9D8D6', marginTop: 24, paddingTop: 20 }}>
          {isAdmin ? (
            <p className="text-xs text-black/35 font-[350] leading-relaxed">
              The primary admin account cannot be deleted. To remove admin access, update credentials in your environment variables.
            </p>
          ) : !confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-xs font-[350] transition-colors"
              style={{ color: '#B91C1C', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              Delete my account
            </button>
          ) : (
            <div>
              <p className="text-xs text-black/70 font-[350] mb-3">
                Are you sure? This cannot be undone.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={deleteAccount}
                  disabled={deleting}
                  style={{ fontSize: 12, padding: '5px 14px', background: '#B91C1C', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 500 }}
                >
                  {deleting ? 'Deleting…' : 'Yes, delete'}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="btn-secondary text-xs"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
