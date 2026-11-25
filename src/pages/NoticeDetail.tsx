import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AuditButton, ObjectForm } from '../components/forms'
import { DiffView, ErrorNote, Gate, Ladder, OutcomeChip, Skeletons } from '../components/ui'
import { useCopy, useLoad } from '../hooks'
import { readNotice } from '../lib/chain'
import { short, shortSha, when } from '../lib/format'
import { evidenceDigest, fetchCompare, type CompareFile } from '../lib/github'
import { OUTCOME_HELP, OUTCOME_LABEL, PENALTY, SCOPE_HELP, SCOPE_LABEL, type NoticeView } from '../lib/types'
import { useWallet } from '../state/Wallet'

type Check = { ok: boolean; text: string }

export default function NoticeDetail() {
  const id = Number(useParams().id)
  const valid = Number.isInteger(id) && id > 0
  const { data: n, error, loading, reload } = useLoad<NoticeView>((fresh) => readNotice(id, fresh), [id])
  const { account } = useWallet()
  const [files, setFiles] = useState<CompareFile[] | null>(null)
  const [checks, setChecks] = useState<Record<string, Check>>({})
  const [gerr, setGerr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [copied, copy] = useCopy()

  if (!valid) return <div className="wrap page"><ErrorNote message="That is not a valid notice number." /></div>

  async function verify(notice: NoticeView) {
    setBusy(true)
    setGerr(null)
    try {
      const res = await fetchCompare(notice.repository, notice.base_sha, notice.head_sha)
      setFiles(res.files)
      const next: Record<string, Check> = {}
      const byName = (p: string) => res.files.find((f) => f.filename === p)
      if (notice.audit.evidence_sha256) {
        const rows = notice.covered.map((p) => ({ file: p, patch: byName(p)?.patch ?? '' }))
        const d = await evidenceDigest(rows)
        next.audit = d === notice.audit.evidence_sha256
          ? { ok: true, text: 'Matches: GitHub serves the same bytes the validators judged.' }
          : { ok: false, text: 'Does not match what validators recorded.' }
      }
      for (const o of notice.objections) {
        const d = await evidenceDigest([{ file: o.path, patch: byName(o.path)?.patch ?? '' }])
        next['o' + o.objection_id] = d === o.evidence_sha256
          ? { ok: true, text: 'Matches the bytes validators judged.' }
          : { ok: false, text: 'Does not match what validators recorded.' }
      }
      setChecks(next)
    } catch (e) {
      setGerr(e instanceof Error ? e.message : 'Verification failed.')
    } finally {
      setBusy(false)
    }
  }

  const patchOf = (p: string) => files?.find((f) => f.filename === p)?.patch

  return (
    <div className="wrap page stack">
      <Link to="/notices" className="small dim">← All notices</Link>
      <Gate>
        {error && <ErrorNote message={error} onRetry={() => reload(true)} />}
        {loading && !n && <Skeletons n={2} />}
        {n && (
          <>
            <div className="stack">
              <div className="row"><span className="mono faint">Notice #{n.notice_id}</span><span className="chip amber">{SCOPE_LABEL[n.scope]}</span><OutcomeChip outcome={n.audit.outcome} /></div>
              <h2 className="mono" style={{ fontFamily: 'var(--mono)', fontSize: '1.5rem' }}>{n.repository}</h2>
              <p className="serif" style={{ fontSize: '1.3rem', margin: 0 }}>“{n.summary}”</p>
              <div className="row small faint">
                <span>filed by <Link to={`/standing/${n.publisher}`} className="mono">{short(n.publisher, 8, 6)}</Link></span>
                <span>{when(n.created_at)}</span>
                <a href={n.compare_url} target="_blank" rel="noreferrer" className="mono">{shortSha(n.base_sha)} → {shortSha(n.head_sha)} on GitHub ↗</a>
              </div>
              <div className="small dim">{SCOPE_HELP[n.scope]}</div>
              <div className="row small"><span className="dim">Covers:</span>{n.covered.map((c) => <span key={c} className="chip mono">{c}</span>)}<span className="faint">Locked at filing. It cannot be edited.</span></div>
            </div>

            <div className="card stack">
              <div className="row between"><h3>Audit of the covered files</h3>
                <div className="row">
                  <button className="btn sm" onClick={() => verify(n)} disabled={busy}>{busy ? 'Checking…' : 'Verify evidence on GitHub'}</button>
                  <button className="btn sm" onClick={() => reload(true)}>Refresh</button>
                </div></div>
              {gerr && <div className="banner bad small">{gerr}</div>}
              {n.status === 'filed' ? (
                <>
                  <p className="dim">Nobody has audited this notice yet. Anyone can start the audit; validators will fetch the diff and judge it against the note.</p>
                  <Ladder />
                  <div className="row"><AuditButton noticeId={n.notice_id} onDone={() => reload(true)} />{!account && <span className="small faint">You will be asked to connect a wallet.</span>}</div>
                </>
              ) : (
                <>
                  <Ladder outcome={n.audit.outcome} />
                  <p className="dim small">{n.audit.outcome && OUTCOME_HELP[n.audit.outcome]} Penalty applied to the publisher: <strong>{n.audit.outcome ? PENALTY[n.audit.outcome] : 0}</strong>. Audited {when(n.audit.audited_at)}.</p>
                  {n.audit.quote && <div className="stack"><span className="small dim">Line the validators cited in <span className="mono">{n.audit.file}</span>:</span><div className="quote">{n.audit.quote}</div></div>}
                  <div className="row small"><span className="dim">Evidence digest</span><span className="mono">{short(n.audit.evidence_sha256, 14, 8)}</span>
                    <button className="btn sm ghost" onClick={() => copy(n.audit.evidence_sha256)}>{copied ? 'Copied' : 'Copy'}</button>
                    {checks.audit && <span className={'chip ' + (checks.audit.ok ? 'add' : 'del')}>{checks.audit.ok ? '✓ ' : '✕ '}{checks.audit.text}</span>}</div>
                  {files && n.covered.map((p) => patchOf(p) && <DiffView key={p} file={p} patch={patchOf(p)!} cited={n.audit.file === p ? n.audit.quote : undefined} />)}
                </>
              )}
            </div>

            <div className="card stack">
              <div className="row between"><h3>Objections to files the note left out</h3><span className="chip">{n.objections.length}</span></div>
              {n.objections.length === 0 && <p className="dim">None yet. An objection puts one uncovered file's diff on trial against this notice.</p>}
              {n.objections.map((o) => (
                <div key={o.objection_id} className="card raised pad-sm stack">
                  <div className="row between"><span className="mono">{o.path}</span><div className="row"><OutcomeChip outcome={o.outcome} /><span className={'chip ' + (o.upheld ? 'del' : 'add')}>{o.upheld ? 'upheld' : 'dismissed'}</span></div></div>
                  <Ladder outcome={o.outcome} compact />
                  <div className="small dim">{OUTCOME_LABEL[o.outcome]}: {OUTCOME_HELP[o.outcome]} Penalty {PENALTY[o.outcome]}.</div>
                  {o.quote && <div className="quote">{o.quote}</div>}
                  {o.note && <div className="small dim">Objector's note: {o.note}</div>}
                  <div className="row small faint"><span>by <Link to={`/standing/${o.filer}`} className="mono">{short(o.filer, 6, 4)}</Link></span><span>{when(o.decided_at)}</span>
                    {checks['o' + o.objection_id] && <span className={'chip ' + (checks['o' + o.objection_id].ok ? 'add' : 'del')}>{checks['o' + o.objection_id].ok ? '✓ ' : '✕ '}{checks['o' + o.objection_id].text}</span>}</div>
                  {files && patchOf(o.path) && <DiffView file={o.path} patch={patchOf(o.path)!} cited={o.quote} />}
                </div>
              ))}
              <hr className="rule" />
              <h3>File an objection</h3>
              <ObjectForm noticeId={n.notice_id} repo={n.repository} base={n.base_sha} head={n.head_sha} covered={n.covered} publisher={n.publisher} decidedPaths={n.objections.map((o) => o.path)} onDone={() => reload(true)} />
            </div>
          </>
        )}
      </Gate>
    </div>
  )
}
