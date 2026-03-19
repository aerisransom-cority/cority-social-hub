import { SessionProvider } from 'next-auth/react'
import Layout from '../components/Layout'
import '../styles/globals.css'

export default function App({ Component, pageProps: { session, ...pageProps } }) {
  // Login page uses its own layout (no nav)
  const noLayout = Component.noLayout

  return (
    <SessionProvider session={session}>
      {noLayout ? (
        <Component {...pageProps} />
      ) : (
        <Layout>
          <Component {...pageProps} />
        </Layout>
      )}
    </SessionProvider>
  )
}
