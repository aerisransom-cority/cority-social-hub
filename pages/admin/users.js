import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import { useEffect } from 'react'
import UserManagement from '../../components/UserManagement'

export default function AdminUsersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return
    if (!session || session.user?.role !== 'admin') {
      router.replace('/content-studio')
    }
  }, [session, status, router])

  if (status === 'loading' || !session || session.user?.role !== 'admin') return null

  return (
    <div style={{ paddingTop: 32, paddingBottom: 48 }}>
      <div className="mb-8">
        <h1 className="text-3xl text-black font-[350] leading-tight">User Management</h1>
        <p className="text-sm text-black/50 mt-1 font-[350]">Invite and manage team members who have access to this hub.</p>
      </div>
      <UserManagement />
    </div>
  )
}
