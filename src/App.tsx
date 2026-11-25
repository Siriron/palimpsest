import { Route, Routes, Link, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { Footer, Nav, TxPanel } from './components/ui'
import Home from './pages/Home'
import Notices from './pages/Notices'
import NoticeDetail from './pages/NoticeDetail'
import FileNotice from './pages/FileNotice'
import StandingPage from './pages/StandingPage'
import Guide from './pages/Guide'
import Docs from './pages/Docs'

function NotFound() {
  return (
    <div className="wrap page">
      <div className="card stack" style={{ maxWidth: 560 }}>
        <span className="eyebrow">404</span>
        <h2>Nothing is written here.</h2>
        <p className="dim">This page does not exist. The ledger starts from the notices list.</p>
        <div className="row"><Link className="btn primary" to="/notices">Browse notices</Link><Link className="btn" to="/">Home</Link></div>
      </div>
    </div>
  )
}

function ScrollTop() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView()
    else window.scrollTo(0, 0)
  }, [pathname, hash])
  return null
}

export default function App() {
  return (
    <>
      <Nav />
      <ScrollTop />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/notices" element={<Notices />} />
          <Route path="/notices/:id" element={<NoticeDetail />} />
          <Route path="/file" element={<FileNotice />} />
          <Route path="/standing" element={<StandingPage />} />
          <Route path="/standing/:address" element={<StandingPage />} />
          <Route path="/guide" element={<Guide />} />
          <Route path="/docs" element={<Docs />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
      <TxPanel />
    </>
  )
}
