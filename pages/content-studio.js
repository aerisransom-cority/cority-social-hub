import { useState } from 'react'
import dynamic from 'next/dynamic'
import RequestBrief from '../components/RequestBrief'

// Dynamically import heavy components to avoid SSR issues
const BrainstormChat = dynamic(() => import('../components/BrainstormChat'), { ssr: false })
const EditorialCalendar = dynamic(() => import('../components/EditorialCalendar'), { ssr: false })
const MediaLibrary = dynamic(() => import('../components/MediaLibrary'), { ssr: false })

const SECTIONS = [
  {
    id: 'process-request',
    label: 'Process Request',
    icon: '📋',
    description: 'Submit a brief and generate platform copy',
  },
  {
    id: 'brainstorm',
    label: 'Brainstorm Content',
    icon: '✍️',
    description: 'Brand-aware AI chat for ideas and strategy',
  },
  {
    id: 'calendar',
    label: 'Editorial Calendar',
    icon: '📅',
    description: 'Plan, schedule, and view upcoming content',
  },
  {
    id: 'media',
    label: 'Media Library',
    icon: '🖼️',
    description: 'Upload and organise photos and documents',
  },
]

export default function ContentStudio() {
  const [activeSection, setActiveSection] = useState('process-request')

  const current = SECTIONS.find((s) => s.id === activeSection)

  return (
    <div style={{ paddingTop: '24px' }}>
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-3xl text-black font-[350] leading-tight">Content Studio</h1>
        <p className="text-sm text-black/50 mt-1 font-[350]">
          {current?.description}
        </p>
      </div>

      {/* Sidebar + content layout */}
      <div
        className="flex overflow-hidden"
        style={{ border: '0.79px solid #D9D8D6', borderRadius: '6px', minHeight: '640px' }}
      >
        {/* ── Left sidebar ── */}
        <div
          className="flex-shrink-0 flex flex-col"
          style={{
            width: '212px',
            borderRight: '0.75px solid #D9D8D6',
            backgroundColor: '#FAFAF9',
          }}
        >
          <nav className="p-3 flex flex-col gap-0.5">
            {SECTIONS.map((section) => {
              const isActive = activeSection === section.id
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className="w-full text-left flex items-center gap-2.5 px-3 py-2.5 transition-colors"
                  style={{
                    borderRadius: '5px',
                    backgroundColor: isActive ? '#ffffff' : 'transparent',
                    border: isActive ? '0.79px solid #D9D8D6' : '0.79px solid transparent',
                    color: isActive ? '#E3001B' : 'rgba(0,0,0,0.5)',
                    boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                  }}
                >
                  <span className="text-sm leading-none flex-shrink-0">{section.icon}</span>
                  <span
                    className="text-[11px] font-medium uppercase tracking-[0.08em] leading-tight"
                    style={{ color: isActive ? '#E3001B' : 'rgba(0,0,0,0.5)' }}
                  >
                    {section.label}
                  </span>
                </button>
              )
            })}
          </nav>
        </div>

        {/* ── Content area ── */}
        <div className="flex-1 min-w-0 bg-white overflow-auto">
          {activeSection === 'process-request' && (
            <div className="p-8">
              <RequestBrief />
            </div>
          )}
          {activeSection === 'brainstorm' && <BrainstormChat />}
          {activeSection === 'calendar' && <EditorialCalendar />}
          {activeSection === 'media' && <MediaLibrary />}
        </div>
      </div>
    </div>
  )
}
