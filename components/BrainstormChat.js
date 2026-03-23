import { useState, useRef, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import SuggestionsPanel from './SuggestionsPanel'

// ── Tab bar ───────────────────────────────────────────────────────────────────
function Tab({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-5 py-3 text-[11px] font-medium uppercase tracking-[0.08em] whitespace-nowrap transition-colors"
      style={{
        color: active ? '#D35F0B' : 'rgba(0,0,0,0.4)',
        borderTop: 'none', borderLeft: 'none', borderRight: 'none',
        borderBottom: active ? '1.5px solid #D35F0B' : '1.5px solid transparent',
        background: 'none', cursor: 'pointer',
      }}
    >
      {label}
    </button>
  )
}

// ── Chat message ──────────────────────────────────────────────────────────────
function Message({ msg, isAdmin }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      {!isUser && (
        <div
          className="flex-shrink-0 w-6 h-6 flex items-center justify-center mr-2 mt-0.5"
          style={{ backgroundColor: '#D35F0B', borderRadius: '4px' }}
        >
          <span className="text-white text-[9px] font-medium">AI</span>
        </div>
      )}
      <div className="max-w-[80%]">
        <div
          className="px-4 py-3 text-sm font-[350] leading-relaxed whitespace-pre-wrap"
          style={{
            border: '0.79px solid #D9D8D6',
            borderRadius: isUser ? '12px 12px 2px 12px' : '2px 12px 12px 12px',
            background: isUser ? '#000000' : '#ffffff',
            color: isUser ? '#ffffff' : '#000000',
          }}
        >
          {msg.content}
        </div>
        {!isUser && msg.sourceDocs?.length > 0 && (
          <p style={{ fontSize: 10, color: 'rgba(0,0,0,0.35)', marginTop: 4, paddingLeft: 4, fontWeight: 350 }}>
            📖 Sources: {msg.sourceDocs.map((d) => d.docName).join(', ')}
          </p>
        )}
        {!isUser && isAdmin && msg.debugPrompt && (
          <details style={{ marginTop: 4, paddingLeft: 4 }}>
            <summary style={{ fontSize: 10, color: 'rgba(0,0,0,0.3)', cursor: 'pointer', userSelect: 'none', listStyle: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span>▸</span> View prompt
            </summary>
            <pre style={{ marginTop: 6, fontSize: 10, color: 'rgba(0,0,0,0.5)', background: '#F9F9F9', border: '0.75px solid #E5E5E5', borderRadius: 4, padding: '10px 12px', whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 280, overflowY: 'auto', fontWeight: 350, lineHeight: 1.5 }}>
              {msg.debugPrompt.systemPrompt}
            </pre>
          </details>
        )}
      </div>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatSessionDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  const isYesterday = d.toDateString() === new Date(now - 86400000).toDateString()
  if (isToday) return `Today ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
  if (isYesterday) return `Yesterday ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ── Main component ────────────────────────────────────────────────────────────
export default function BrainstormChat({ onOpenAsBrief }) {
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'admin'

  // Persist active tab within the browser session
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') return sessionStorage.getItem('brainstorm-tab') || 'suggestions'
    return 'suggestions'
  })

  // Active chat state
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Session ID — persisted in sessionStorage so page refresh restores the same session
  const [sessionId, setSessionId] = useState(() => {
    if (typeof window !== 'undefined') return sessionStorage.getItem('chat-session-id') || null
    return null
  })

  // History state
  const [sessions, setSessions] = useState([])          // all sessions from KV
  const [historyOpen, setHistoryOpen] = useState(false) // history panel toggle
  const [historyLoading, setHistoryLoading] = useState(false)
  const [viewingSession, setViewingSession] = useState(null) // { id, messages, createdAt } | null

  const bottomRef = useRef(null)
  const textareaRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Load history on mount (once session is available)
  const loadHistory = useCallback(async () => {
    if (!session) return
    setHistoryLoading(true)
    try {
      const res = await fetch('/api/chat-history')
      if (res.ok) {
        const data = await res.json()
        setSessions(Array.isArray(data) ? data : [])
        return data
      }
    } catch {}
    finally { setHistoryLoading(false) }
    return []
  }, [session])

  useEffect(() => {
    if (!session) return
    loadHistory().then((data) => {
      if (!Array.isArray(data) || data.length === 0) return
      // Restore from sessionStorage session ID first
      const storedId = sessionStorage.getItem('chat-session-id')
      if (storedId) {
        const found = data.find((s) => s.id === storedId)
        if (found) {
          setSessionId(storedId)
          setMessages(found.messages || [])
          return
        }
      }
      // Otherwise restore latest session
      const latest = data[0]
      setSessionId(latest.id)
      setMessages(latest.messages || [])
      sessionStorage.setItem('chat-session-id', latest.id)
    })
  }, [session]) // run once when session resolves

  function switchTab(tab) {
    setActiveTab(tab)
    sessionStorage.setItem('brainstorm-tab', tab)
  }

  function tryInChat(angle) {
    setInput(angle)
    switchTab('chat')
    setTimeout(() => textareaRef.current?.focus(), 60)
  }

  async function startNewConversation() {
    const newId = Date.now().toString()
    setSessionId(newId)
    sessionStorage.setItem('chat-session-id', newId)
    setMessages([])
    setError(null)
    setViewingSession(null)
    setHistoryOpen(false)
    // Refresh sessions list so archived session appears
    await loadHistory()
  }

  function viewSessionHistory(s) {
    setViewingSession(s)
    setHistoryOpen(false)
  }

  function exitHistoryView() {
    setViewingSession(null)
    // Reload active session messages from sessions list
    const active = sessions.find((s) => s.id === sessionId)
    if (active) setMessages(active.messages || [])
  }

  async function send(content) {
    if (viewingSession) return // shouldn't be callable, but guard anyway

    // Ensure a sessionId is set
    const sid = sessionId || Date.now().toString()
    if (!sessionId) {
      setSessionId(sid)
      sessionStorage.setItem('chat-session-id', sid)
    }

    const userMsg = { role: 'user', content }
    const updated = [...messages, userMsg]
    setMessages(updated)
    setInput('')
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updated, sessionId: sid }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Something went wrong.')
      const assistantMsg = {
        role: 'assistant',
        content: data.message.content,
        sourceDocs: data.sourceDocs || [],
        debugPrompt: data.debugPrompt || null,
      }
      const final = [...updated, assistantMsg]
      setMessages(final)
      // Update sessions list silently (don't block UI)
      loadHistory()
    } catch (err) {
      setError(err.message)
      setMessages(messages)
    } finally {
      setLoading(false)
    }
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!input.trim() || loading || viewingSession) return
    send(input.trim())
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  // Messages to display: viewing history vs active session
  const displayMessages = viewingSession ? (viewingSession.messages || []) : messages

  // Sessions in history list (exclude current active session)
  const historyList = sessions.filter((s) => s.id !== sessionId)

  const exchangeCount = Math.floor(messages.length / 2)

  return (
    <div className="flex flex-col" style={{ height: '680px' }}>

      {/* ── Tab bar ── */}
      <div className="flex flex-shrink-0" style={{ borderBottom: '0.75px solid #D9D8D6' }}>
        <Tab label="Suggested for you" active={activeTab === 'suggestions'} onClick={() => switchTab('suggestions')} />
        <Tab label="Chat" active={activeTab === 'chat'} onClick={() => switchTab('chat')} />
      </div>

      {/* ── Suggested for you tab ── */}
      {activeTab === 'suggestions' && (
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <SuggestionsPanel
            onOpenAsBrief={onOpenAsBrief || (() => {})}
            onTryInChat={tryInChat}
          />
        </div>
      )}

      {/* ── Chat tab ── */}
      {activeTab === 'chat' && (
        <div className="flex-1 flex flex-col" style={{ overflow: 'hidden' }}>

          {/* Chat header — New conversation + History */}
          <div
            className="flex-shrink-0 flex items-center justify-between px-6 py-2.5"
            style={{ borderBottom: '0.75px solid #D9D8D6' }}
          >
            <div className="flex items-center gap-3">
              {viewingSession ? (
                <>
                  <span className="text-[10px] text-black/40 font-[350] uppercase tracking-[1.38px]">
                    Viewing past session
                  </span>
                  <button
                    onClick={exitHistoryView}
                    className="text-[10px] text-black/40 hover:text-black font-[350] transition-colors"
                  >
                    ← Return to current
                  </button>
                </>
              ) : (
                <span className="text-[10px] text-black/30 font-[350] uppercase tracking-[1.38px]">
                  Brand-aware · {exchangeCount > 0 ? `${exchangeCount} exchange${exchangeCount !== 1 ? 's' : ''}` : 'New session'}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {historyList.length > 0 && (
                <button
                  onClick={() => setHistoryOpen((v) => !v)}
                  className="text-[10px] font-[350] transition-colors px-2 py-1"
                  style={{ color: historyOpen ? '#D35F0B' : 'rgba(0,0,0,0.35)' }}
                >
                  History {historyOpen ? '▴' : '▾'}
                </button>
              )}
              <button
                onClick={startNewConversation}
                className="btn-secondary text-[10px] px-3 py-1"
                style={{ fontSize: 11 }}
              >
                New conversation
              </button>
            </div>
          </div>

          {/* History panel — collapsible */}
          {historyOpen && (
            <div
              className="flex-shrink-0 overflow-y-auto"
              style={{ maxHeight: '210px', borderBottom: '0.75px solid #D9D8D6', background: '#fafafa' }}
            >
              {historyLoading ? (
                <p className="px-6 py-4 text-xs text-black/30 font-[350]">Loading history…</p>
              ) : historyList.length === 0 ? (
                <p className="px-6 py-4 text-xs text-black/30 font-[350]">No previous sessions.</p>
              ) : (
                historyList.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => viewSessionHistory(s)}
                    className="w-full text-left px-6 py-3 transition-colors hover:bg-black/[0.03]"
                    style={{ borderBottom: '0.5px solid #EFEFEF', display: 'block' }}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="text-[10px] text-black/35 font-[350] mb-0.5">
                          {formatSessionDate(s.updatedAt || s.createdAt)}
                        </div>
                        <div
                          className="text-xs text-black font-[350]"
                          style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '340px' }}
                        >
                          {s.firstMessage || <span style={{ fontStyle: 'italic', color: 'rgba(0,0,0,0.3)' }}>Empty session</span>}
                          {(s.firstMessage || '').length === 80 ? '…' : ''}
                        </div>
                      </div>
                      <span className="text-[10px] text-black/30 font-[350] flex-shrink-0">
                        {s.messageCount} msg{s.messageCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

          {/* Read-only banner */}
          {viewingSession && (
            <div
              className="flex-shrink-0 flex items-center justify-between px-6 py-2"
              style={{ background: '#FFF7ED', borderBottom: '0.75px solid #FDDDB8' }}
            >
              <span className="text-[11px] text-[#D35F0B] font-[350]">
                Read-only — {formatSessionDate(viewingSession.updatedAt || viewingSession.createdAt)}
              </span>
              <button
                onClick={startNewConversation}
                className="text-[11px] text-[#D35F0B] font-medium hover:underline"
              >
                Start new conversation
              </button>
            </div>
          )}

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto px-6 py-6">
            {displayMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <div className="text-3xl mb-4">✍️</div>
                <p className="text-sm font-medium text-black mb-1">Start brainstorming</p>
                <p className="text-xs text-black/40 font-[350] max-w-xs">
                  Ask anything — angles, drafts, hooks, meme ideas, scripts, or strategy questions. Fully brand-aware.
                </p>
              </div>
            ) : (
              <>
                {displayMessages.map((msg, i) => <Message key={i} msg={msg} isAdmin={isAdmin} />)}
                {loading && (
                  <div className="flex justify-start mb-4">
                    <div
                      className="flex-shrink-0 w-6 h-6 flex items-center justify-center mr-2 mt-0.5"
                      style={{ backgroundColor: '#D35F0B', borderRadius: '4px' }}
                    >
                      <span className="text-white text-[9px] font-medium">AI</span>
                    </div>
                    <div
                      className="px-4 py-3 text-sm text-black/40 font-[350]"
                      style={{ border: '0.79px solid #D9D8D6', borderRadius: '2px 12px 12px 12px' }}
                    >
                      Thinking…
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </>
            )}
          </div>

          {error && (
            <div className="mx-6 mb-3 px-3 py-2 text-xs text-cority-red font-[350]"
              style={{ border: '0.79px solid #D35F0B', borderRadius: '6px' }}>
              {error}
            </div>
          )}

          {/* Input bar — pinned to bottom, disabled in read-only mode */}
          <div className="flex-shrink-0 px-6 pb-6 pt-3" style={{ borderTop: '0.75px solid #D9D8D6' }}>
            {!viewingSession && (
              <form onSubmit={handleSubmit} className="flex gap-3">
                <textarea
                  ref={textareaRef}
                  className="textarea flex-1"
                  rows={2}
                  placeholder="Ask anything… (Shift+Enter for new line, Enter to send)"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={loading}
                />
                <button
                  type="submit"
                  className="btn-primary self-end px-4 py-2"
                  disabled={loading || !input.trim()}
                >
                  Send
                </button>
              </form>
            )}
            {viewingSession && (
              <div
                className="flex items-center justify-center py-3 text-xs text-black/30 font-[350]"
                style={{ border: '0.75px dashed #D9D8D6', borderRadius: '6px' }}
              >
                This is a read-only session. Start a new conversation to continue.
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  )
}
