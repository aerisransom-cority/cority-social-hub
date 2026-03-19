import { useState } from 'react'
import dynamic from 'next/dynamic'

// Dynamically import heavy components to avoid SSR issues
const BrainstormChat = dynamic(() => import('../components/BrainstormChat'), { ssr: false })
const EditorialCalendar = dynamic(() => import('../components/EditorialCalendar'), { ssr: false })
const MediaLibrary = dynamic(() => import('../components/MediaLibrary'), { ssr: false })

const TABS = [
  { id: 'chat',     label: 'Brainstorm Chat', icon: '✍️' },
  { id: 'calendar', label: 'Editorial Calendar', icon: '📅' },
  { id: 'media',    label: 'Media Library', icon: '🖼️' },
]

export default function ContentStudio() {
  const [activeTab, setActiveTab] = useState('chat')

  return (
    <div>
      {/* Page header */}
      <div className="flex items-start justify-between mb-6" style={{ paddingTop: '24px' }}>
        <div>
          <h1 className="text-3xl text-black font-[350] leading-tight">Content Studio</h1>
          <p className="text-sm text-black/50 mt-1 font-[350]">
            Brainstorm, plan, and manage your content library in one place.
          </p>
        </div>
      </div>

      {/* Sub-tab navigation */}
      <div className="card overflow-hidden">
        <div className="flex" style={{ borderBottom: '0.75px solid #D9D8D6' }}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-2 px-5 py-3.5 text-[11px] font-medium uppercase tracking-[0.08em] whitespace-nowrap transition-colors"
              style={{
                color: activeTab === tab.id ? '#E3001B' : 'rgba(0,0,0,0.4)',
                borderBottom: activeTab === tab.id ? '1.5px solid #E3001B' : '1.5px solid transparent',
              }}
            >
              <span className="text-sm">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'chat' && <BrainstormChat />}
        {activeTab === 'calendar' && <EditorialCalendar />}
        {activeTab === 'media' && <MediaLibrary />}
      </div>
    </div>
  )
}
