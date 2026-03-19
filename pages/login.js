import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/router'

// Skip the main nav layout for the login page
Login.noLayout = true

export default function Login() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    if (result?.error) {
      setError('Invalid email or password.')
      setLoading(false)
    } else {
      router.push('/brand-settings')
    }
  }

  return (
    <div
      className="min-h-screen bg-white flex flex-col items-center justify-center px-4"
      style={{ paddingBottom: '80px' }}
    >
      {/* Logo mark */}
      <div className="mb-10 flex flex-col items-center gap-4">
        <div
          className="flex items-center justify-center"
          style={{
            width: '40px',
            height: '40px',
            backgroundColor: '#E3001B',
            borderRadius: '8px',
          }}
        >
          <span className="text-white font-medium text-base">C</span>
        </div>
        <div className="text-center">
          <h1 className="text-2xl text-black font-[350]">Cority Social Hub</h1>
          <p className="text-sm text-black/40 font-[350] mt-1">Sign in to continue</p>
        </div>
      </div>

      {/* Login card */}
      <div className="w-full max-w-sm">
        <form
          onSubmit={handleSubmit}
          className="card p-8 space-y-5"
        >
          <div>
            <label className="section-label">Email</label>
            <input
              type="email"
              className="input"
              placeholder="you@cority.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div>
            <label className="section-label">Password</label>
            <input
              type="password"
              className="input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <div
              className="text-sm text-cority-red font-[350] px-3 py-2"
              style={{ border: '0.79px solid #E3001B', borderRadius: '6px' }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn-primary w-full"
            disabled={loading}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-xs text-black/30 font-[350] mt-6">
          Cority Social Hub · Internal tool
        </p>
      </div>
    </div>
  )
}
