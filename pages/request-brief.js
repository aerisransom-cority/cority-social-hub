export default function RequestBrief() {
  return (
    <div>
      <div className="flex items-start justify-between mb-8" style={{ paddingTop: '24px' }}>
        <div>
          <h1 className="text-3xl text-black font-[350] leading-tight">Request Brief</h1>
          <p className="text-sm text-black/50 mt-1 font-[350]">Submit a social request and get AI-drafted copy per platform.</p>
        </div>
      </div>
      <div className="card p-16 flex flex-col items-center justify-center text-center">
        <div className="text-5xl mb-6">📋</div>
        <h2 className="text-base font-medium text-black mb-2">Coming in Phase 2</h2>
        <p className="text-sm text-black/40 font-[350] max-w-sm">
          Request brief form + AI copy drafting with per-platform variants (LinkedIn, YouTube, Instagram, X, Facebook).
        </p>
      </div>
    </div>
  )
}
