import Nav from './Nav'

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-white">
      <Nav />
      <main className="max-w-6xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  )
}
