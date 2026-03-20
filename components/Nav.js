import Link from 'next/link'
import { useRouter } from 'next/router'
import { useSession, signOut } from 'next-auth/react'

const ALL_TABS = [
  { href: '/content-studio', label: 'Content Studio', icon: '✍️', roles: ['admin', 'contributor', 'reviewer'] },
  { href: '/performance',    label: 'Performance',    icon: '📊', roles: ['admin', 'contributor'] },
  { href: '/utm-builder',    label: 'UTM Builder',    icon: '🔗', roles: ['admin', 'contributor'] },
  { href: '/brand-settings', label: 'Brand Settings', icon: '🎯', roles: ['admin'] },
]

export default function Nav() {
  const router = useRouter()
  const { data: session } = useSession()
  const role = session?.user?.role || 'admin'
  const tabs = ALL_TABS.filter((t) => t.roles.includes(role))

  return (
    <header
      className="bg-white sticky top-0 z-50"
      style={{ borderBottom: '0.75px solid #D9D8D6' }}
    >
      {/* Top bar */}
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center flex-shrink-0"
            style={{ width: '28px', height: '28px', backgroundColor: '#D35F0B', borderRadius: '4px' }}
          >
            <span className="text-white font-medium text-xs">C</span>
          </div>
          <span className="font-medium text-black text-sm tracking-tight">Cority Social Hub</span>
        </div>

        <div className="flex items-center gap-5">
          <div className="text-black/40 text-xs font-[350]">
            {new Date().toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' })}
          </div>
          {session?.user && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-black/40 font-[350]">{session.user.name}</span>
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="text-xs text-black/40 font-[350] hover:text-black transition-colors"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div className="max-w-6xl mx-auto px-6">
        <nav className="flex overflow-x-auto" aria-label="Main navigation">
          {tabs.map((tab) => {
            const isActive = router.pathname === tab.href
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="flex items-center gap-1.5 px-3 py-3 text-[11px] font-medium uppercase tracking-[0.08em] whitespace-nowrap transition-colors duration-150"
                style={{
                  color: isActive ? '#D35F0B' : 'rgba(0,0,0,0.5)',
                  borderBottom: isActive ? '1.5px solid #D35F0B' : '1.5px solid transparent',
                }}
              >
                <span className="text-sm leading-none">{tab.icon}</span>
                {tab.label}
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
