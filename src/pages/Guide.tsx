import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AuditButton, NoticeForm, ObjectForm } from '../components/forms'
import { ErrorNote, Gate, Ladder, OutcomeChip } from '../components/ui'
import { findNotice, readNotice, readStanding } from '../lib/chain'
import { sameAddress, short } from '../lib/format'
import { SCENARIOS, deleteRun, formatLog, getCurrent, loadRuns, newRunId, saveRun, setCurrent, type Run, type Step } from '../lib/guide'
import { PENALTY, type NoticeView, type Standing } from '../lib/types'
import { useCopy } from '../hooks'
import { useWallet } from '../state/Wallet'
import type { TxEntry } from '../state/Tx'
import { IS_DEPLOYED } from '../config/chains'

const ROLE_LABEL = { publisher: 'Wallet A · publisher', objector: 'Wallet B · objector', anyone: 'Any wallet', reader: 'Read only' } as const

export default function Guide() {
  const { account, connect } = useWallet()
  const [scenarioId, setScenarioId] = useState(SCENARIOS[0].id)
  const [run, setRun] = useState<Run | null>(null)
  const [notice, setNotice] = useState<NoticeView | null>(null)
  const [pub, setPub] = useState<Standing | null>(null)
  const [obj, setObj] = useState<Standing | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [resume, setResume] = useState('')
  const [copied, copy] = useCopy()

  const scenario = SCENARIOS.find((s) => s.id === (run?.scenario ?? scenarioId)) ?? SCENARIOS[0]

  const refresh = useCallback(async (r: Run | null) => {
    if (!r || !IS_DEPLOYED) return
    const sc = SCENARIOS.find((s) => s.id === r.scenario)!
    setLoading(true)
    setErr(null)
    try {
      const row = await findNotice(sc.notice.repo!, sc.notice.base!, sc.notice.head!, r.publisher)
      const n = row ? await readNotice(row.notice_id, true) : null
      setNotice(n)
      setPub(await readStanding(r.publisher, true))
      const filer = n?.objections[0]?.filer
      setObj(filer ? await readStanding(filer, true) : null)
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const id = getCurrent()
    const r = id ? loadRuns()[id] : undefined
    if (r) { setRun(r); setScenarioId(r.scenario); refresh(r) }
  }, [refresh])

  async function start() {
    const who = account ?? (await connect())
    if (!who) return
    const r: Run = { id: newRunId(), scenario: scenarioId, publisher: who.toLowerCase(), createdAt: Date.now(), log: [] }
    saveRun(r); setCurrent(r.id); setRun(r); setNotice(null); setPub(null); setObj(null)
    refresh(r)
  }
  function resumeRun() {
    const r = loadRuns()[resume.trim()]
    if (!r) { setErr('That run ID is not saved on this device.'); return }
    setErr(null); setCurrent(r.id); setRun(r); setScenarioId(r.scenario); refresh(r)
  }
  function clearRun() {
    if (!run) return
    deleteRun(run.id); setCurrent(null); setRun(null); setNotice(null); setPub(null); setObj(null)
  }
  const log = useCallback((e: TxEntry) => {
    setRun((r) => {
      if (!r) return r
      const next = { ...r, log: [...r.log, { at: e.at, label: e.label, phase: e.phase, status: e.status, exec: e.exec, hash: e.hash, message: e.message }] }
      saveRun(next)
      return next
    })
  }, [])

  const done = useMemo(() => {
    const flags = scenario.steps.map((s) => {
      if (s.kind === 'file') return !!notice
      if (s.kind === 'audit') return notice?.status === 'audited'
      if (s.kind === 'object') return !!notice?.objections.some((o) => o.path === s.path)
      return false
    })
    const verifyIdx = scenario.steps.findIndex((s) => s.kind === 'verify')
    if (verifyIdx >= 0) flags[verifyIdx] = flags.every((f, i) => i === verifyIdx || f)
    return flags
  }, [scenario, notice])
  const nextIdx = done.findIndex((d) => !d)

  function roleProblem(s: Step): string | null {
    if (!run || !account) return 'Connect a wallet.'
    if (s.role === 'publisher' && !sameAddress(account, run.publisher)) return `Switch to Wallet A (${short(run.publisher, 6, 4)}).`
    if (s.role === 'objector' && sameAddress(account, run.publisher)) return 'Switch to a different wallet (Wallet B). A publisher cannot object to their own notice.'
    return null
  }

  function body(s: Step, i: number) {
    if (!run) return null
    const problem = roleProblem(s)
    const sc = scenario
    if (s.kind === 'verify') {
      return (
        <div className="stack">
          <div className="grid g2">
            <div className="card raised pad-sm small"><strong>Publisher {short(run.publisher, 6, 4)}</strong><div className="dim">notices {pub?.notices ?? '–'} · clean audits {pub?.audits_clean ?? '–'} · penalty {pub?.penalty ?? '–'} · objections against {pub?.objections_against ?? '–'} ({pub?.upheld_against ?? '–'} upheld)</div></div>
            {obj && <div className="card raised pad-sm small"><strong>Objector {short(obj.address, 6, 4)}</strong><div className="dim">filed {obj.filed} · upheld {obj.upheld} · dismissed {obj.dismissed}</div></div>}
          </div>
          {notice && <Link className="btn sm" to={`/notices/${notice.notice_id}`}>Open the notice and verify the evidence on GitHub</Link>}
        </div>
      )
    }
    if (done[i]) return <div className="small dim">Done. {s.kind === 'audit' && notice?.audit.outcome && <>Result: <OutcomeChip outcome={notice.audit.outcome} /> penalty {PENALTY[notice.audit.outcome]}.</>} {s.kind === 'object' && notice?.objections.filter((o) => o.path === s.path).map((o) => <span key={o.objection_id}><OutcomeChip outcome={o.outcome} /> {o.upheld ? 'upheld' : 'dismissed'}.</span>)}</div>
    if (i !== nextIdx) return <div className="small faint">Unlocks after the step above.</div>
    return (
      <div className="stack">
        {problem && <div className="banner warn small">{problem}</div>}
        {s.kind === 'file' && <NoticeForm initial={sc.notice} onLog={log} onDone={() => refresh(run)} />}
        {s.kind === 'audit' && notice && <AuditButton noticeId={notice.notice_id} onLog={log} onDone={() => refresh(run)} />}
        {s.kind === 'object' && notice && <ObjectForm noticeId={notice.notice_id} repo={notice.repository} base={notice.base_sha} head={notice.head_sha} covered={notice.covered} publisher={notice.publisher} decidedPaths={notice.objections.map((o) => o.path)} initialPath={s.path} initialNote={s.note} onLog={log} onDone={() => refresh(run)} />}
      </div>
    )
  }

  return (
    <div className="wrap page stack" style={{ maxWidth: 860 }}>
      <div><span className="eyebrow">In-app test guide</span><h2 style={{ marginTop: 8 }}>Walk every flow on demo documents</h2></div>
      <p className="dim">The scenarios use <a href="https://github.com/Siriron/palimpsest-demo-docs" target="_blank" rel="noreferrer">palimpsest-demo-docs</a>, three commits of fictional policies. A step turns done only when the contract's own state shows its result. Verdicts come from a live model, so the expected outcomes below are typical, not guaranteed.</p>
      <Gate>
        <div className="card stack">
          <label className="f"><span className="l">Scenario</span>
            <select value={run ? run.scenario : scenarioId} disabled={!!run} onChange={(e) => setScenarioId(e.target.value)}>
              {SCENARIOS.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
            </select></label>
          <div className="dim">{scenario.blurb}</div>
          <div className="banner small"><strong>Expected outcome (typical):</strong> {scenario.expectation}</div>
          {!run ? (
            <div className="row">
              <button className="btn primary" onClick={start}>{account ? 'Start a new run with this wallet as A' : 'Connect wallet and start a run'}</button>
              <input style={{ maxWidth: 190 }} className="mono" placeholder="resume run ID" value={resume} onChange={(e) => setResume(e.target.value)} aria-label="Run ID" />
              <button className="btn" onClick={resumeRun} disabled={!resume.trim()}>Resume</button>
            </div>
          ) : (
            <div className="row between">
              <div className="row"><span className="chip amber mono">{run.id}</span><span className="chip mono">A {short(run.publisher, 6, 4)}</span><span className="chip mono">now {account ? short(account, 6, 4) : 'not connected'}</span></div>
              <div className="row">
                <button className="btn sm" onClick={() => refresh(run)} disabled={loading}>{loading ? 'Reading…' : 'Refresh'}</button>
                <button className="btn sm" onClick={() => { setCurrent(null); setRun(null); setNotice(null); setPub(null); setObj(null) }}>New run</button>
                <button className="btn sm" onClick={clearRun}>Clear saved run</button>
              </div>
            </div>
          )}
          {err && <ErrorNote message={err} onRetry={() => refresh(run)} />}
        </div>

        {run && (
          <div className="card stack">
            {scenario.steps.map((s, i) => (
              <div key={i} className="step">
                <div className={'tick ' + (done[i] ? 'done' : i === nextIdx ? 'next' : '')}>{done[i] ? '✓' : i + 1}</div>
                <div className="stack">
                  <div className="row between"><strong>{s.title}</strong><span className="chip">{ROLE_LABEL[s.role]}</span></div>
                  <div className="small dim">{s.body}</div>
                  <div className="small faint">Expect: {s.expect}</div>
                  {body(s, i)}
                </div>
              </div>
            ))}
            {notice && <div className="stack"><hr className="rule" /><div className="row between"><span className="small dim">Notice #{notice.notice_id} · {notice.status}</span><Link className="small" to={`/notices/${notice.notice_id}`}>Open ↗</Link></div><Ladder outcome={notice.audit.outcome} compact /></div>}
          </div>
        )}

        {run && (
          <div className="card stack">
            <div className="row between"><h3>Transaction log</h3><button className="btn sm" onClick={() => copy(formatLog(run))} disabled={!run.log.length}>{copied ? 'Copied' : 'Copy log'}</button></div>
            <div className="log">{run.log.length ? formatLog(run) : 'No transactions yet. Each action, its status, execution result and hash will be listed here.'}</div>
            <div className="small faint">The log and run ID live in this browser. The notices themselves are on-chain, so a run is rebuilt from contract state on refresh.</div>
          </div>
        )}
      </Gate>
    </div>
  )
}
