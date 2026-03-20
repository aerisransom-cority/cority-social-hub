import { useState, useRef, useEffect } from 'react'
import SuggestionsPanel from './SuggestionsPanel'

const STARTERS = [
  'Help me brainstorm a meme about EHS teams drowning in spreadsheets.',
  "What's a sharp hook for a LinkedIn post about Cortex AI's incident prediction?",
  'Write 3 caption options for a customer story about Walmart saving 100K hours of manual labor.',
  'Help me plan a week of content around the Safety is Stronger campaign.',
  "I need to write a YouTube Short script about why reactive safety culture is costly. Draft it.",
  "What's an unexpected angle for a post about Cority winning the Verdantix Green Quadrant again?",
]

function Message({ msg }) {
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
      <div
        className={`max-w-[80%] px-4 py-3 text-sm font-[350] leading-relaxed whitespace-pre-wrap ${
          isUser ? 'text-black' : 'text-black'
        }`}
        style={{
          border: '0.79px solid #D9D8D6',
          borderRadius: isUser ? '12px 12px 2px 12px' : '2px 12px 12px 12px',
          background: isUser ? '#000000' : '#ffffff',
          color: isUser ? '#ffffff' : '#000000',
        }}
      >
        {msg.content}
      </div>
    </div>
  )
}

export default function BrainstormChat({ onOpenAsBrief }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [sessionId] = useState(() => Date.now().toString())
  const bottomRef = useRef(null)
  const textareaRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function send(content) {
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
        body: JSON.stringify({ messages: updated, sessionId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Something went wrong.')
      setMessages([...updated, data.message])
    } catch (err) {
      setError(err.message)
      // Remove the optimistic user message on failure
      setMessages(messages)
    } finally {
      setLoading(false)
    }
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!input.trim() || loading) return
    send(input.trim())
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  function clearChat() {
    setMessages([])
    setError(null)
  }

  const isEmpty = messages.length === 0

  return (
    <div className="flex flex-col" style={{ height: '680px' }}>
      {/* Chat area */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {isEmpty ? (
          <div className="flex flex-col">
            <SuggestionsPanel
              onOpenAsBrief={onOpenAsBrief || (() => {})}
              onTryInChat={(angle) => {
                setInput(angle)
                setTimeout(() => textareaRef.current?.focus(), 0)
              }}
            />
            <div style={{ borderTop: '0.75px solid #D9D8D6', marginBottom: 20 }} />
            <div className="flex flex-col items-center text-center mb-4">
              <div className="text-3xl mb-3">✍️</div>
              <p className="text-sm font-medium text-black mb-1">Start brainstorming</p>
              <p className="text-xs text-black/40 font-[350] mb-4 max-w-xs">
                Ask anything — angles, drafts, hooks, meme ideas, scripts, or strategy questions. Fully brand-aware.
              </p>
            </div>
            <div className="flex flex-col gap-2 w-full max-w-md mx-auto">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-left text-xs text-black/60 font-[350] px-3 py-2.5 transition-colors hover:text-black"
                  style={{ border: '0.79px solid #D9D8D6', borderRadius: '6px' }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => <Message key={i} msg={msg} />)}
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

      {/* Input bar */}
      <div className="flex-shrink-0 px-6 pb-6 pt-3" style={{ borderTop: '0.75px solid #D9D8D6' }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] text-black/30 font-[350] uppercase tracking-[1.38px]">
            Brand-aware · {messages.length > 0 ? `${Math.floor(messages.length / 2)} exchange${messages.length > 2 ? 's' : ''}` : 'New session'}
          </span>
          {messages.length > 0 && (
            <button onClick={clearChat} className="text-[10px] text-black/30 hover:text-black font-[350] transition-colors">
              Clear
            </button>
          )}
        </div>
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
      </div>
    </div>
  )
}
