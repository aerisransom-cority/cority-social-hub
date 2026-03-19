import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import { useEffect } from 'react'
import UTMBuilder from '../components/UTMBuilder'

export default function UTMBuilderPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login')
  }, [status, router])

  if (status === 'loading' || !session) return null

  return (
    <div style={{ paddingTop: '24px' }}>
      <div className="mb-8">
        <h1 className="text-3xl text-black font-[350] leading-tight">UTM Builder</h1>
        <p className="text-sm text-black/50 mt-1 font-[350]">
          Generate, enforce, and log every UTM-tagged link.
        </p>
      </div>
      <UTMBuilder />
    </div>
  )
}
