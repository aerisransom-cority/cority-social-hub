import RequestBrief from '../components/RequestBrief'

export default function RequestBriefPage() {
  return (
    <div>
      <div className="flex items-start justify-between mb-8" style={{ paddingTop: '24px' }}>
        <div>
          <h1 className="text-3xl text-black font-[350] leading-tight">Request Brief</h1>
          <p className="text-sm text-black/50 mt-1 font-[350]">
            Describe your social request and get AI-drafted copy for your selected platforms.
          </p>
        </div>
      </div>
      <RequestBrief />
    </div>
  )
}
