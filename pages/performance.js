import dynamic from 'next/dynamic'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import { useEffect } from 'react'

const PerformanceDashboard = dynamic(() => import('../components/PerformanceDashboard'), { ssr: false })

export default function Performance() {
  const { data: session, status } = useSession()
  const router = useRouter()
  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login')
  }, [status, router])
  if (status === 'loading' || !session) return null
  return (
    <div style={{ paddingTop: '24px' }}>
      <div className="mb-8">
        <h1 className="text-3xl text-black font-[350] leading-tight">Performance</h1>
        <p className="text-sm text-black/50 mt-1 font-[350]">Upload XLSX exports, match against UTM campaigns, and analyze what's working.</p>
      </div>
      <PerformanceDashboard />
    </div>
  )
}
