import { useState, useRef, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'

function initials(name) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default function ProfileDropdown({ onOpenAccountSettings }) {
  const { data: session } = useSession()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const isAdmin = session?.user?.role === 'admin'
  const name = session?.user?.name || ''
  const email = session?.user?.email || ''

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: 28, height: 28,
          borderRadius: '50%',
          background: '#D35F0B',
          color: '#fff',
          fontSize: 10,
          fontWeight: 600,
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          letterSpacing: '0.03em',
          flexShrink: 0,
        }}
        aria-label="Account menu"
      >
        {initials(name)}
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: 220,
            background: '#fff',
            border: '0.75px solid #D9D8D6',
            borderRadius: 8,
            boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
            zIndex: 200,
            overflow: 'hidden',
          }}
        >
          {/* Name / email */}
          <div style={{ padding: '12px 16px 10px', borderBottom: '0.75px solid #D9D8D6' }}>
            <p style={{ fontSize: 13, fontWeight: 500, color: '#000', margin: 0, lineHeight: 1.3 }}>{name}</p>
            <p style={{ fontSize: 11, color: 'rgba(0,0,0,0.4)', margin: '2px 0 0', fontWeight: 350, lineHeight: 1.3 }}>{email}</p>
          </div>

          {/* Menu items */}
          <div style={{ padding: '4px 0' }}>
            {isAdmin && (
              <Link
                href="/admin/users"
                onClick={() => setOpen(false)}
                style={{ display: 'block', padding: '8px 16px', fontSize: 13, color: '#000', textDecoration: 'none', fontWeight: 350 }}
                className="hover:bg-black/5 transition-colors"
              >
                User management
              </Link>
            )}
            <button
              onClick={() => { setOpen(false); onOpenAccountSettings() }}
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 16px', fontSize: 13, color: '#000', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 350 }}
              className="hover:bg-black/5 transition-colors"
            >
              Account settings
            </button>
          </div>

          {/* Sign out */}
          <div style={{ padding: '4px 0', borderTop: '0.75px solid #D9D8D6' }}>
            <button
              onClick={() => { setOpen(false); signOut({ callbackUrl: '/login' }) }}
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 16px', fontSize: 13, color: 'rgba(0,0,0,0.5)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 350 }}
              className="hover:bg-black/5 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
