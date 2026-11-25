import { useState } from 'react'
import { fetchCompare, type CompareFile } from '../lib/github'
import { findNotice } from '../lib/chain'
import { byteLen, parseRepo, sameAddress, short, validRepo, validSha } from '../lib/format'
import { SCOPES, SCOPE_HELP, SCOPE_LABEL, type NoticeRow, type Scope } from '../lib/types'
import { useWallet } from '../state/Wallet'
import { useTx, type TxEntry } from '../state/Tx'

export type NoticeInit = { repo?: string; base?: string; head?: string; scope?: Scope; summary?: string; covered?: string[] }

export function NoticeForm({ initial, onDone, onLog, submitLabel = 'File notice' }: {
  initial?: NoticeInit
  onDone?: (row: NoticeRow | null) => void
  onLog?: (e: TxEntry) => void
  submitLabel?: string
}) {
  const { account, connect } = useWallet()
  const { send, busy } = useTx()
  const [repo, setRepo] = useState(initial?.repo ?? '')
  const [base, setBase] = useState(initial?.base ?? '')
  const [head, setHead] = useState(initial?.head ?? '')
  const [scope, setScope] = useState<Scope>(initial?.scope ?? 'typo_fix')
  const [summary, setSummary] = useState(initial?.summary ?? '')
  const [covered, setCovered] = useState<string[]>(initial?.covered ?? [])
  const [files, setFiles] = useState<CompareFile[] | null>(null)
  const [problems, setProblems] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const r = parseRepo(repo)
  const b = base.trim().toLowerCase()
  const h = head.trim().toLowerCase()
  const sb = byteLen(summary.trim())
  const issues: string[] = []
  if (!validRepo(r)) issues.push('Enter a public GitHub repository as owner/name.')
  if (!validSha(b) || !validSha(h)) issues.push('Both commits must be full 40-character SHAs.')
  else if (b === h) issues.push('Baseline and head must be different commits.')
  if (sb < 1 || sb > 400) issues.push('The summary must be 1 to 400 bytes.')
  if (covered.length < 1 || covered.length > 3) issues.push('Cover between 1 and 3 files.')

  async function load() {
    setMsg(null)
    setLoading(true)
    try {
      const res = await fetchCompare(r, b, h)
      setFiles(res.files)
      setProblems(res.problems)
      setCovered((c) => c.filter((p) => res.files.some((f) => f.filename === p)))
    } catch (e) {
      setFiles(null)
      setMsg(e instanceof Error ? e.message : 'Could not load the comparison.')
    } finally {
      setLoading(false)
    }
  }

  function toggle(path: string) {
    setCovered((c) => (c.includes(path) ? c.filter((p) => p !== path) : c.length >= 3 ? c : [...c, path]))
  }

  async function submit() {
    setMsg(null)
    const who = account ?? (await connect())
    if (!who) return
    const out = await send(`File notice for ${r}`, 'file_notice', [r, b, h, scope, summary.trim(), JSON.stringify([...covered].sort())], onLog)
    if (out.phase === 'accepted' || out.phase === 'finalized') {
      let row: NoticeRow | null = null
      try { row = await findNotice(r, b, h, who) } catch { /* the list refreshes on its own */ }
      onDone?.(row)
    }
  }

  const blocked = issues.length > 0 || problems.length > 0

  return (
    <div className="stack">
      <div className="grid g2">
        <label className="f"><span className="l">Repository</span>
          <input className="mono" value={repo} onChange={(e) => setRepo(e.target.value)} placeholder="owner/name or a github.com URL" /></label>
        <label className="f"><span className="l">Declared scope</span>
          <select value={scope} onChange={(e) => setScope(e.target.value as Scope)}>
            {SCOPES.map((s) => <option key={s} value={s}>{SCOPE_LABEL[s]}</option>)}
          </select>
          <div className="hint">{SCOPE_HELP[scope]}</div></label>
      </div>
      <div className="grid g2">
        <label className="f"><span className="l">Baseline commit (before)</span>
          <input className="mono" value={base} onChange={(e) => setBase(e.target.value)} placeholder="40-character SHA" /></label>
        <label className="f"><span className="l">Head commit (after)</span>
          <input className="mono" value={head} onChange={(e) => setHead(e.target.value)} placeholder="40-character SHA" /></label>
      </div>
      <label className="f"><span className="l">What this change did (locked once filed)</span>
        <textarea value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Corrects three spelling mistakes in the terms of use." />
        <div className={'hint' + (sb > 400 ? ' bad' : '')}>{sb} / 400 bytes</div></label>

      <div className="stack">
        <div className="row between">
          <span className="small dim">Files this notice covers ({covered.length}/3). Every other changed file can be objected to.</span>
          <button className="btn sm" onClick={load} disabled={loading || !validRepo(r) || !validSha(b) || !validSha(h)}>{loading ? 'Loading…' : 'Load changed files from GitHub'}</button>
        </div>
        {files && (
          <div className="card raised pad-sm stack">
            {files.map((f) => (
              <label key={f.filename} className="row" style={{ cursor: 'pointer' }}>
                <input type="checkbox" style={{ width: 'auto' }} checked={covered.includes(f.filename)} onChange={() => toggle(f.filename)} />
                <span className="mono small">{f.filename}</span>
                <span className="chip add">+{f.additions}</span><span className="chip del">−{f.deletions}</span>
              </label>
            ))}
          </div>
        )}
        {!files && covered.length > 0 && <div className="mono small dim">{covered.join(', ')}</div>}
        {problems.map((p) => <div key={p} className="banner bad small">{p}</div>)}
      </div>

      {msg && <div className="banner bad">{msg}</div>}
      {blocked && (covered.length || summary || repo) ? <div className="hint">{[...issues, ...problems][0]}</div> : null}
      <div className="row">
        <button className="btn primary" onClick={submit} disabled={busy || blocked}>{busy ? 'Working…' : account ? submitLabel : 'Connect wallet and ' + submitLabel.toLowerCase()}</button>
        <span className="small faint">Judged by validators on api.github.com diffs. Takes a few minutes only at audit time.</span>
      </div>
    </div>
  )
}

export function AuditButton({ noticeId, onDone, onLog }: { noticeId: number; onDone?: () => void; onLog?: (e: TxEntry) => void }) {
  const { send, busy } = useTx()
  return (
    <button className="btn primary" disabled={busy} onClick={async () => {
      const out = await send(`Audit notice #${noticeId}`, 'audit_notice', [BigInt(noticeId)], onLog)
      if (out.phase === 'accepted' || out.phase === 'finalized') onDone?.()
    }}>{busy ? 'Working…' : 'Audit this notice'}</button>
  )
}

export function ObjectForm({ noticeId, repo, base, head, covered, publisher, decidedPaths, initialPath, initialNote, onDone, onLog }: {
  noticeId: number
  repo: string
  base: string
  head: string
  covered: string[]
  publisher: string
  decidedPaths: string[]
  initialPath?: string
  initialNote?: string
  onDone?: () => void
  onLog?: (e: TxEntry) => void
}) {
  const { account } = useWallet()
  const { send, busy } = useTx()
  const [path, setPath] = useState(initialPath ?? '')
  const [note, setNote] = useState(initialNote ?? '')
  const [files, setFiles] = useState<CompareFile[] | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const own = sameAddress(account, publisher)
  const nb = byteLen(note)
  const bad = !path.trim() ? 'Choose the file you are objecting about.' : covered.includes(path.trim()) ? 'That file is already covered by the notice.' : decidedPaths.includes(path.trim()) ? 'That file already has a decided objection.' : own ? 'A publisher cannot object to their own notice.' : nb > 300 ? 'Keep the note under 300 bytes.' : ''

  async function load() {
    setMsg(null)
    try { setFiles((await fetchCompare(repo, base, head)).files) } catch (e) { setMsg(e instanceof Error ? e.message : 'Could not load files.') }
  }
  const open = files?.filter((f) => !covered.includes(f.filename) && !decidedPaths.includes(f.filename)) ?? []
  return (
    <div className="stack">
      <div className="row between">
        <span className="small dim">Object to a file the notice did not cover. Validators judge that file's diff against the notice.</span>
        <button className="btn sm" onClick={load}>List uncovered files</button>
      </div>
      {files && (open.length ? (
        <div className="row">{open.map((f) => <button key={f.filename} className={'btn sm' + (path === f.filename ? ' primary' : '')} onClick={() => setPath(f.filename)}>{f.filename}</button>)}</div>
      ) : <div className="banner small">Every changed file is already covered or decided.</div>)}
      <label className="f"><span className="l">File path</span>
        <input className="mono" value={path} onChange={(e) => setPath(e.target.value)} placeholder="docs/PRIVACY.md" /></label>
      <label className="f"><span className="l">Note for readers (stored, never sent to the model)</span>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Retention period and data sharing changed." />
        <div className={'hint' + (nb > 300 ? ' bad' : '')}>{nb} / 300 bytes</div></label>
      {msg && <div className="banner bad">{msg}</div>}
      {bad && <div className="hint bad">{bad}</div>}
      <button className="btn primary" disabled={busy || !!bad} onClick={async () => {
        const out = await send(`Object to ${short(path, 18, 10)} on notice #${noticeId}`, 'object_to_path', [BigInt(noticeId), path.trim(), note.trim()], onLog)
        if (out.phase === 'accepted' || out.phase === 'finalized') onDone?.()
      }}>{busy ? 'Working…' : 'File objection'}</button>
    </div>
  )
}
