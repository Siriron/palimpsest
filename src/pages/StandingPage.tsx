import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ErrorNote, Gate, Skeletons } from '../components/ui'
import { useLoad } from '../hooks'
import { readStanding } from '../lib/chain'
import { isAddress } from '../lib/format'
import { useWallet } from '../state/Wallet'

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  return <div style={{ height: 6, borderRadius: 6, background: 'var(--line-soft)' }}><div style={{ height: 6, borderRadius: 6, width: `${max ? Math.min(100, (value / max) * 100) : 0}%`, background: color }} /></div>
}

export default function StandingPage() {
  const params = useParams()
  const nav = useNavigate()
  const { account } = useWallet()
  const addr = params.address ?? ''
  const [input, setInput] = useState(addr)
  useEffect(() => setInput(addr), [addr])
  const ok = isAddress(addr)
  const { data: s, error, loading, reload } = useLoad((fresh) => (ok ? readStanding(addr, fresh) : Promise.resolve(null)), [addr])

  return (
    <div className="wrap page stack" style={{ maxWidth: 820 }}>
      <div><span className="eyebrow">Public record</span><h2 style={{ marginTop: 8 }}>Standing</h2></div>
      <p className="dim">Standing belongs to a wallet and records how accurate its statements were and how its objections fared. It scores statements, not organisations.</p>
      <div className="row">
        <input className="mono" style={{ flex: 1, minWidth: 260 }} value={input} onChange={(e) => setInput(e.target.value)} placeholder="0x… wallet address" aria-label="Wallet address" />
        <button className="btn primary" disabled={!isAddress(input)} onClick={() => nav(`/standing/${input.trim()}`)}>Look up</button>
        {account && <button className="btn" onClick={() => nav(`/standing/${account}`)}>My wallet</button>}
      </div>
      {addr && !ok && <div className="banner bad">That is not a valid 0x address.</div>}
      <Gate>
        {error && <ErrorNote message={error} onRetry={() => reload(true)} />}
        {ok && loading && !s && <Skeletons n={2} />}
        {s && !s.known && <div className="card"><h3>No record.</h3><p className="dim">This wallet has not filed a notice or an objection yet.</p></div>}
        {s && s.known && (
          <div className="grid g2">
            <div className="card stack">
              <span className="eyebrow">As a publisher</span>
              <div className="row" style={{ gap: 28 }}>
                <div><div className="stat">{s.notices}</div><div className="small dim">notices filed</div></div>
                <div><div className="stat" style={{ color: 'var(--add)' }}>{s.audits_clean}</div><div className="small dim">clean audits</div></div>
                <div><div className="stat" style={{ color: s.penalty ? 'var(--r2)' : 'var(--text)' }}>{s.penalty}</div><div className="small dim">penalty points</div></div>
              </div>
              <div className="small dim">Objections decided against this wallet's notices: {s.objections_against}, of which upheld: {s.upheld_against}</div>
              <Bar value={s.upheld_against} max={s.objections_against} color="var(--r3)" />
              <div className="small faint">Penalty per rung: minor 1, material 3, contradicts 6. Applied to audits and to every decided objection.</div>
            </div>
            <div className="card stack">
              <span className="eyebrow">As an objector</span>
              <div className="row" style={{ gap: 28 }}>
                <div><div className="stat">{s.filed}</div><div className="small dim">objections filed</div></div>
                <div><div className="stat" style={{ color: 'var(--r3)' }}>{s.upheld}</div><div className="small dim">upheld</div></div>
                <div><div className="stat" style={{ color: 'var(--add)' }}>{s.dismissed}</div><div className="small dim">dismissed</div></div>
              </div>
              <div className="small dim">Upheld means validators found a material or contradicting change in a file the notice left out.</div>
              <Bar value={s.upheld} max={s.filed} color="var(--amber)" />
            </div>
          </div>
        )}
      </Gate>
    </div>
  )
}
