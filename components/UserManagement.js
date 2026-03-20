import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'

function RoleBadge({ role }) {
  const styles = {
    admin:       { color: '#D35F0B', bg: '#FFF3EC' },
    contributor: { color: '#49763E', bg: '#EFF6EE' },
    reviewer:    { color: '#6B7280', bg: '#F3F4F6' },
  }
  const s = styles[role] || styles.reviewer
  return (
    <span style={{ fontSize: 10, fontWeight: 500, textTransform: 'capitalize', color: s.color, background: s.bg, borderRadius: 3, padding: '2px 7px' }}>
      {role}
    </span>
  )
}

function TempPasswordModal({ password, onClose }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(password).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 400 }}>
      <div className="card p-8" style={{ width: 420, maxWidth: '90vw' }}>
        <h2 className="text-base font-medium text-black mb-2">User created</h2>
        <p className="text-sm text-black/50 font-[350] mb-5 leading-relaxed">
          Share this temporary password with the user — it will not be shown again.
        </p>
        <div className="p-4 font-mono text-sm text-black text-center" style={{ border: '0.79px solid #D9D8D6', borderRadius: 6, background: '#FAFAFA', letterSpacing: '0.12em', userSelect: 'all' }}>
          {password}
        </div>
        <div className="flex gap-3 mt-5">
          <button className="btn-secondary flex-1" onClick={copy}>{copied ? '✓ Copied' : 'Copy password'}</button>
          <button className="btn-primary flex-1" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  )
}

// Inline edit row for a single user
function EditRow({ user, onSave, onCancel }) {
  const [name, setName] = useState(user.name)
  const [email, setEmail] = useState(user.email)
  const [role, setRole] = useState(user.role)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)

  async function save() {
    setSaving(true)
    setErr(null)
    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id, name, email, role }),
      })
      const data = await res.json()
      if (res.ok) { onSave(data) }
      else setErr(data.error || 'Save failed')
    } catch { setErr('Network error') }
    setSaving(false)
  }

  return (
    <>
      <tr style={{ background: '#FFFDF9', borderBottom: err ? 'none' : '0.75px solid #D9D8D6' }}>
        <td style={{ padding: '8px 8px 8px 24px' }}>
          <input className="input" value={name} onChange={e => setName(e.target.value)} style={{ fontSize: 12, padding: '4px 8px' }} />
        </td>
        <td style={{ padding: '8px' }}>
          <input type="email" className="input" value={email} onChange={e => setEmail(e.target.value)} style={{ fontSize: 12, padding: '4px 8px' }} />
        </td>
        <td style={{ padding: '8px' }}>
          <select className="input" value={role} onChange={e => setRole(e.target.value)} style={{ fontSize: 12, padding: '4px 8px' }}>
            <option value="contributor">Contributor</option>
            <option value="reviewer">Reviewer</option>
          </select>
        </td>
        <td style={{ padding: '8px', fontSize: 12, color: 'rgba(0,0,0,0.35)' }}>
          {user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-CA') : '—'}
        </td>
        <td style={{ padding: '8px 16px', whiteSpace: 'nowrap' }}>
          <button onClick={save} disabled={saving} style={{ fontSize: 11, color: '#D35F0B', background: 'none', border: 'none', cursor: 'pointer', marginRight: 8, fontWeight: 500 }}>
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button onClick={onCancel} style={{ fontSize: 11, color: 'rgba(0,0,0,0.35)', background: 'none', border: 'none', cursor: 'pointer' }}>Cancel</button>
        </td>
      </tr>
      {err && (
        <tr style={{ borderBottom: '0.75px solid #D9D8D6' }}>
          <td colSpan={5} style={{ padding: '4px 24px 8px', fontSize: 11, color: '#B91C1C' }}>{err}</td>
        </tr>
      )}
    </>
  )
}

export default function UserManagement() {
  const { data: session } = useSession()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({ name: '', email: '', role: 'contributor' })
  const [adding, setAdding] = useState(false)
  const [tempPassword, setTempPassword] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => { loadUsers() }, [])

  async function loadUsers() {
    setLoading(true)
    try {
      const res = await fetch('/api/users')
      if (res.ok) setUsers(await res.json())
    } catch {}
    setLoading(false)
  }

  async function addUser(e) {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim()) return
    setAdding(true)
    setError(null)
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (res.ok) {
        setUsers((prev) => [...prev, data.user])
        setTempPassword(data.tempPassword)
        setForm({ name: '', email: '', role: 'contributor' })
      } else {
        setError(data.error || 'Failed to add user')
      }
    } catch { setError('Network error — please try again') }
    setAdding(false)
  }

  async function removeUser(id, name) {
    if (!confirm(`Remove ${name}? Their session will be invalidated within 5 minutes.`)) return
    try {
      const res = await fetch('/api/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (res.ok) setUsers((prev) => prev.filter((u) => u.id !== id))
    } catch {}
  }

  return (
    <div className="space-y-6">

      {/* User table */}
      <div className="card">
        <div className="px-6 py-4" style={{ borderBottom: '0.75px solid #D9D8D6' }}>
          <p className="font-medium text-black text-sm">Team Members</p>
          <p className="text-xs text-black/40 font-[350] mt-0.5">Everyone with access to this hub.</p>
        </div>

        {loading ? (
          <p className="text-sm text-black/40 p-6 font-[350]">Loading…</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#FAFAFA', borderBottom: '0.75px solid #D9D8D6' }}>
                  {['Name', 'Email', 'Role', 'Date Added', ''].map((h, i) => (
                    <th key={i} style={{ padding: '8px 16px', textAlign: 'left', fontSize: 9, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '1.38px', color: 'rgba(0,0,0,0.4)', whiteSpace: 'nowrap', paddingLeft: i === 0 ? 24 : 16 }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Admin row — not editable */}
                <tr style={{ borderBottom: '0.75px solid #D9D8D6' }}>
                  <td style={{ padding: '10px 16px 10px 24px', fontSize: 13, fontWeight: 500, color: '#000' }}>{session?.user?.name || 'Admin'}</td>
                  <td style={{ padding: '10px 16px', fontSize: 12, color: 'rgba(0,0,0,0.5)' }}>{session?.user?.email || '—'}</td>
                  <td style={{ padding: '10px 16px' }}><RoleBadge role="admin" /></td>
                  <td style={{ padding: '10px 16px', fontSize: 12, color: 'rgba(0,0,0,0.35)' }}>Always</td>
                  <td style={{ padding: '10px 16px' }} />
                </tr>

                {/* KV users */}
                {users.map((u) =>
                  editingId === u.id ? (
                    <EditRow
                      key={u.id}
                      user={u}
                      onSave={(updated) => { setUsers((prev) => prev.map((x) => x.id === u.id ? updated : x)); setEditingId(null) }}
                      onCancel={() => setEditingId(null)}
                    />
                  ) : (
                    <tr key={u.id} style={{ borderBottom: '0.75px solid #D9D8D6' }}>
                      <td style={{ padding: '10px 16px 10px 24px', fontSize: 13, color: '#000' }}>{u.name}</td>
                      <td style={{ padding: '10px 16px', fontSize: 12, color: 'rgba(0,0,0,0.5)' }}>{u.email}</td>
                      <td style={{ padding: '10px 16px' }}><RoleBadge role={u.role} /></td>
                      <td style={{ padding: '10px 16px', fontSize: 12, color: 'rgba(0,0,0,0.35)' }}>{u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-CA') : '—'}</td>
                      <td style={{ padding: '10px 16px', whiteSpace: 'nowrap' }}>
                        <button onClick={() => setEditingId(u.id)} style={{ fontSize: 11, color: 'rgba(0,0,0,0.4)', background: 'none', border: 'none', cursor: 'pointer', marginRight: 10 }} className="hover:text-black transition-colors">
                          Edit
                        </button>
                        <button onClick={() => removeUser(u.id, u.name)} style={{ fontSize: 11, color: 'rgba(0,0,0,0.3)', background: 'none', border: 'none', cursor: 'pointer' }} className="hover:text-cority-red transition-colors">
                          Remove
                        </button>
                      </td>
                    </tr>
                  )
                )}

                {users.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: '20px 24px', fontSize: 12, color: 'rgba(0,0,0,0.35)', fontStyle: 'italic' }}>
                      No team members added yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invite form */}
      <div className="card p-6">
        <div className="mb-4">
          <p className="font-medium text-black text-sm">Invite a team member</p>
          <p className="text-xs text-black/40 font-[350] mt-0.5">A temporary password will be generated. Share it directly with the user.</p>
        </div>
        {error && <p className="text-xs font-[350] mb-3 px-3 py-2 text-cority-red" style={{ border: '0.79px solid #D35F0B', borderRadius: 6 }}>{error}</p>}
        <form onSubmit={addUser}>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div>
              <label className="section-label">Name <span className="text-cority-red">*</span></label>
              <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Jane Smith" required />
            </div>
            <div>
              <label className="section-label">Email <span className="text-cority-red">*</span></label>
              <input type="email" className="input" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="jane@cority.com" required />
            </div>
            <div>
              <label className="section-label">Role</label>
              <select className="input" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                <option value="contributor">Contributor</option>
                <option value="reviewer">Reviewer</option>
              </select>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <button type="submit" className="btn-primary" disabled={adding || !form.name.trim() || !form.email.trim()}>
              {adding ? 'Adding…' : 'Add user →'}
            </button>
            <div className="text-[10px] text-black/35 font-[350] leading-relaxed pt-1">
              <strong className="font-medium text-black/50">Contributor:</strong> Content Studio, Performance, UTM Builder<br />
              <strong className="font-medium text-black/50">Reviewer:</strong> Editorial Calendar and brief library (read-only)
            </div>
          </div>
        </form>
      </div>

      {tempPassword && <TempPasswordModal password={tempPassword} onClose={() => setTempPassword(null)} />}
    </div>
  )
}
