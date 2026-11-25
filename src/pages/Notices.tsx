import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ErrorNote, Gate, Ladder, OutcomeChip, Skeletons } from '../components/ui'
import { IS_DEPLOYED } from '../config/chains'
import { readNotices } from '../lib/chain'
import { short, shortSha, when } from '../lib/format'
import { SCOPE_LABEL, type NoticeRow } from '../lib/types'

const PAGE = 12

export default function Notices() {
  const [rows, setRows] = useState<NoticeRow[]>([])
  const [total, setTotal] = useState<number | null>(null)
  const [next, setNext] = useState<number | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function load(fresh = false) {
    if (!IS_DEPLOYED) return
    setLoading(true)
    setErr(null)
    try {
      const head = await readNotices(1, 1, fresh)
      setTotal(head.total)
      const end = head.total
      const start = Math.max(1, end - PAGE + 1)
      const page = end ? await readNotices(start, end - start + 1, fresh) : { items: [] as NoticeRow[] }
      setRows(page.items.slice().reverse())
      setNext(start > 1 ? start - 1 : null)
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }
  async function older() {
    if (!next) return
    setLoading(true)
    try {
      const start = Math.max(1, next - PAGE + 1)
      const page = await readNotices(start, next - start + 1)
      setRows((r) => [...r, ...page.items.slice().reverse()])
      setNext(start > 1 ? start - 1 : null)
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  return (
    <div className="wrap page stack">
      <div className="row between">
        <div><span className="eyebrow">The ledger</span><h2 style={{ marginTop: 8 }}>Notices</h2></div>
        <div className="row"><button className="btn sm" onClick={() => load(true)} disabled={loading}>Refresh</button><Link className="btn primary sm" to="/file">File a notice</Link></div>
      </div>
      <Gate>
        {err && <ErrorNote message={err} onRetry={() => load(true)} />}
        {loading && !rows.length && <Skeletons />}
        {total === 0 && <div className="card"><h3>Nothing filed yet.</h3><p className="dim">Be the first, or run the <Link to="/guide">test guide</Link> to see the whole flow on demo documents.</p></div>}
        <div className="stack">
          {rows.map((n) => (
            <Link key={n.notice_id} className="listrow stack" to={`/notices/${n.notice_id}`}>
              <div className="row between">
                <div className="row"><span className="mono faint">#{n.notice_id}</span><strong className="mono">{n.repository}</strong><span className="chip amber">{SCOPE_LABEL[n.scope]}</span></div>
                <OutcomeChip outcome={n.audit_outcome} />
              </div>
              <div className="dim">{n.summary}</div>
              <div className="row small faint"><span className="mono">{shortSha(n.base_sha)} → {shortSha(n.head_sha)}</span><span>by <span className="mono">{short(n.publisher, 6, 4)}</span></span><span>{when(n.created_at)}</span>{n.objections > 0 && <span className="chip del">{n.objections} objection{n.objections > 1 ? 's' : ''}</span>}</div>
              <Ladder outcome={n.audit_outcome} compact />
            </Link>
          ))}
        </div>
        {next && <button className="btn" onClick={older} disabled={loading}>{loading ? 'Loading…' : 'Load older notices'}</button>}
      </Gate>
    </div>
  )
}
