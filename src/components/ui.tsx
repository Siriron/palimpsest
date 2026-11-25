import { Component, type ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { CONTRACT_ADDRESS, IS_DEPLOYED, explorerAddress, explorerTx } from '../config/chains'
import { OUTCOMES, OUTCOME_HELP, OUTCOME_LABEL, PENALTY, type Outcome } from '../lib/types'
import { parsePatch } from '../lib/github'
import { short } from '../lib/format'
import { useWallet } from '../state/Wallet'
import { useTx } from '../state/Tx'

export function Logo() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="14" fill="#12141b" stroke="#262a36" />
      <path d="M14 22h30" stroke="#66645d" strokeWidth="3" strokeLinecap="round" />
      <path d="M14 32h36" stroke="#9b978b" strokeWidth="3" strokeLinecap="round" />
      <path d="M14 42h22" stroke="#e3b35a" strokeWidth="4" strokeLinecap="round" />
      <path d="M11 37l42-9" stroke="#f0645c" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

export function ConnectButton() {
  const { account, connect, connecting } = useWallet()
  if (account) return <span className="chip add mono" title={account}><span className="dot" style={{ background: 'var(--add)' }} />{short(account, 6, 4)}</span>
  return (
    <button className="btn sm primary" onClick={connect} disabled={connecting}>
      {connecting ? 'Connecting…' : 'Connect wallet'}
    </button>
  )
}

export function Nav() {
  const cls = ({ isActive }: { isActive: boolean }) => (isActive ? 'active' : '')
  return (
    <header className="nav">
      <div className="wrap">
        <Link to="/" className="brand"><Logo />Palimpsest</Link>
        <nav className="links" aria-label="Main">
          <NavLink to="/notices" className={cls}>Notices</NavLink>
          <NavLink to="/file" className={cls}>File a notice</NavLink>
          <NavLink to="/standing" className={cls}>Standing</NavLink>
          <NavLink to="/guide" className={cls}>Test guide</NavLink>
          <NavLink to="/docs" className={cls}>Docs</NavLink>
        </nav>
        <ConnectButton />
      </div>
    </header>
  )
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="wrap row between">
        <span>Palimpsest · runs on GenLayer StudioNet, a temporary test network. The repository tests are the proof of behaviour, not the address.</span>
        {IS_DEPLOYED ? <a href={explorerAddress(CONTRACT_ADDRESS)} target="_blank" rel="noreferrer" className="mono small">{short(CONTRACT_ADDRESS, 8, 6)}</a> : <span className="mono small">contract not deployed</span>}
      </div>
    </footer>
  )
}

export function NotDeployed() {
  return (
    <div className="banner warn">
      <strong>Contract address not set.</strong> Deploy <code>contracts/palimpsest.py</code> to StudioNet, then put the address in <code>src/config/chains.ts</code>. Reading and writing are disabled until then. See <Link to="/docs#deploy">Docs</Link>.
    </div>
  )
}

export function Gate({ children }: { children: ReactNode }) {
  return IS_DEPLOYED ? <>{children}</> : <NotDeployed />
}

export function ErrorNote({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="banner bad row between">
      <span>{message}</span>
      {onRetry && <button className="btn sm" onClick={onRetry}>Retry</button>}
    </div>
  )
}

export function Skeletons({ n = 3 }: { n?: number }) {
  return <div className="stack">{Array.from({ length: n }, (_, i) => <div key={i} className="skel" />)}</div>
}

const RUNG_COLOR = ['var(--r0)', 'var(--r1)', 'var(--r2)', 'var(--r3)']

export function Ladder({ outcome, compact = false }: { outcome?: Outcome | ''; compact?: boolean }) {
  const idx = outcome ? OUTCOMES.indexOf(outcome) : -1
  return (
    <div className={'ladder' + (compact ? ' compact' : '')} role="img" aria-label={outcome ? `Outcome: ${OUTCOME_LABEL[outcome]}` : 'No outcome yet'}>
      {OUTCOMES.map((o, i) => (
        <div key={o} className={'rung ' + (i === idx ? 'on' : idx === -1 ? '' : 'dim')} title={OUTCOME_HELP[o]}>
          <div className="bar" style={{ background: RUNG_COLOR[i] }} />
          <div className="t">{OUTCOME_LABEL[o]}</div>
          <div className="p">{PENALTY[o] === 0 ? 'no penalty' : `${PENALTY[o]} pt${PENALTY[o] > 1 ? 's' : ''}`}</div>
        </div>
      ))}
    </div>
  )
}

export function OutcomeChip({ outcome }: { outcome: Outcome | '' }) {
  if (!outcome) return <span className="chip">awaiting audit</span>
  const cls = outcome === 'within_scope' ? 'add' : outcome === 'minor_beyond' ? 'amber' : 'del'
  return <span className={'chip ' + cls}>{OUTCOME_LABEL[outcome]}</span>
}

export function DiffView({ file, patch, cited, extra }: { file: string; patch: string; cited?: string; extra?: ReactNode }) {
  const rows = parsePatch(patch)
  return (
    <div className="diff">
      <div className="name"><span>{file}</span>{extra}</div>
      <pre>
        {rows.map((r, i) => (
          <span key={i} className={'dl ' + r.kind + (cited && r.text === cited ? ' cited' : '')}>{r.text || ' '}</span>
        ))}
      </pre>
    </div>
  )
}

export function TxLink({ hash }: { hash?: string }) {
  if (!hash) return null
  return <a href={explorerTx(hash)} target="_blank" rel="noreferrer" className="mono small">{short(hash, 10, 6)} ↗</a>
}

export function TxPanel() {
  const { current, dismiss, finality, busy } = useTx()
  if (!current) return null
  const working = busy && ['wallet', 'submitted'].includes(current.phase)
  const tone = current.phase === 'accepted' || current.phase === 'finalized' ? 'good' : working ? '' : 'bad'
  return (
    <div className="txpanel" role="status" aria-live="polite">
      <div className="row between">
        <strong className="small">{current.label}</strong>
        <button className="btn sm ghost" onClick={dismiss} aria-label="Dismiss">✕</button>
      </div>
      <div className={'banner ' + tone} style={{ marginTop: 8 }}>
        <div className="row">{working && <span className="spin" />}<span>{current.message ?? current.phase}</span></div>
        {current.exec && <div className="mono small dim" style={{ marginTop: 6 }}>{current.status} · {current.exec}</div>}
      </div>
      <div className="row between" style={{ marginTop: 8 }}>
        <TxLink hash={current.hash} />
        {current.phase === 'accepted' && current.hash && <FinalityButton hash={current.hash} finality={finality} />}
      </div>
    </div>
  )
}

import { useState } from 'react'
function FinalityButton({ hash, finality }: { hash: string; finality: (h: string) => Promise<string> }) {
  const [state, setState] = useState<string>('')
  return (
    <button className="btn sm" onClick={async () => { setState('checking…'); try { setState(await finality(hash)) } catch (e) { setState(e instanceof Error ? e.message : 'failed') } }}>
      {state || 'Check finality'}
    </button>
  )
}

export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) { return { error } }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="wrap page">
        <div className="card stack">
          <span className="eyebrow">Something broke</span>
          <h2>This page failed to render.</h2>
          <p className="dim">{this.state.error.message}</p>
          <button className="btn primary" onClick={() => { this.setState({ error: null }); window.location.assign('/') }}>Back to start</button>
        </div>
      </div>
    )
  }
}
