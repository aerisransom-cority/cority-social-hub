import Link from 'next/link'
import { useRouter } from 'next/router'

const tabs = [
  { href: '/brand-settings', label: 'Brand Settings', icon: '🎯' },
  { href: '/request-brief', label: 'Request Brief', icon: '📋' },
  { href: '/content-studio', label: 'Content Studio', icon: '✍️' },
  { href: '/utm-builder', label: 'UTM Builder', icon: '🔗' },
  { href: '/performance', label: 'Performance', icon: '📊' },
  { href: '/post-ideas', label: 'Post Ideas', icon: '💡' },
]

export default function Nav() {
  const router = useRouter()

  return (
    <header
      className="bg-white sticky top-0 z-50"
      style={{ borderBottom: '0.75px solid #D9D8D6' }}
    >
      {/* Top bar */}
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-7 h-7 flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: '#E3001B', borderRadius: '4px' }}
          >
            <span className="text-white font-medium text-xs">C</span>
          </div>
          <span className="font-medium text-black text-sm tracking-tight">Cority Social Hub</span>
        </div>
        <div className="text-black/40 text-xs font-[350]">
          {new Date().toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' })}
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
                className={`
                  flex items-center gap-1.5 px-3 py-3 text-[11px] font-medium uppercase tracking-[0.08em] whitespace-nowrap transition-colors duration-150
                  ${isActive
                    ? 'text-cority-red'
                    : 'text-black/50 hover:text-black'
                  }
                `}
                style={{
                  borderBottom: isActive ? '1.5px solid #E3001B' : '1.5px solid transparent',
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
