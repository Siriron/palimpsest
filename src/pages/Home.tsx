import { Link } from 'react-router-dom'
import { Ladder, NotDeployed } from '../components/ui'
import { IS_DEPLOYED } from '../config/chains'
import { useLoad } from '../hooks'
import { readNotices } from '../lib/chain'

const GHOST = `-You will recieve notice at least 14 days before changes take effect.
+You will receive notice at least 14 days before changes take effect.
 Invoices are issued monthly.
-We keep account data for 30 days after you close your account.
+We keep account data for 365 days after you close your account.
 We do not sell personal data.
+We may share usage data with analytics partners.
-Disputes must be seperate from payment requests.
+Disputes must be separate from payment requests.
 We acknowledge reports within 3 business days.
-If an outage occured, service credits apply.
+If an outage occurred, service credits apply.`

export default function Home() {
  const stats = useLoad(() => (IS_DEPLOYED ? readNotices(1, 1) : Promise.resolve(null)), [])
  return (
    <>
      <section className="hero">
        <div className="ghosttext" aria-hidden="true">{GHOST.split('\n').map((l, i) => l.startsWith('-') ? <s key={i}>{l + '\n'}</s> : l.startsWith('+') ? <b key={i}>{l + '\n'}</b> : l + '\n')}</div>
        <div className="wrap">
          <span className="eyebrow">A ledger of edit notes</span>
          <h1 style={{ marginTop: 16 }}>Say what you <em>changed.</em> Let the diff answer.</h1>
          <p className="lede">Policies, terms and charters are rewritten in place. Palimpsest locks what the publisher said a change did, then asks GenLayer validators to judge the real GitHub diff against it. Anyone can object to a file the note left out.</p>
          <div className="row" style={{ marginTop: 28 }}>
            <Link className="btn primary" to="/file">File a notice</Link>
            <Link className="btn" to="/guide">Run the test guide</Link>
            <Link className="btn ghost" to="/notices">Browse the ledger</Link>
          </div>
          {stats.data && <div className="row" style={{ marginTop: 34 }}><div><div className="stat">{stats.data.total}</div><div className="small dim">notices filed</div></div></div>}
        </div>
      </section>

      <div className="wrap page" style={{ paddingTop: 10 }}>
        {!IS_DEPLOYED && <NotDeployed />}
        <div className="grid g3" style={{ marginTop: 18 }}>
          <div className="card stack"><div className="step-no">i.</div><h3>Lock the statement</h3><p className="dim">A publisher names two commits, a declared scope and the files the note covers. The summary is fixed before anyone can object.</p></div>
          <div className="card stack"><div className="step-no">ii.</div><h3>Validators read the diff</h3><p className="dim">Each validator fetches the GitHub comparison itself, hashes the evidence, and must quote a real changed line to claim a mismatch.</p></div>
          <div className="card stack"><div className="step-no">iii.</div><h3>Standing moves</h3><p className="dim">The verdict adds a fixed penalty to the publisher's public record. Upheld objections credit the objector. No stake, no payout.</p></div>
        </div>

        <div className="card stack" style={{ marginTop: 28 }}>
          <span className="eyebrow">The ladder</span>
          <h2>Four outcomes, each with a fixed consequence</h2>
          <p className="dim">The model commits to one rung. The penalty comes from a table in the contract, never from a number the model invents. Validators may differ by one rung, but must agree on whether the change was material.</p>
          <Ladder />
        </div>

        <div className="grid g2" style={{ marginTop: 28 }}>
          <div className="card stack"><h3>Why not just trust the changelog?</h3><p className="dim">A changelog is written by the party that benefits from it being vague. Palimpsest scores the statement against the bytes, and the objector, not the publisher, chooses which omitted file to put on trial.</p></div>
          <div className="card stack"><h3>What it does not do</h3><p className="dim">It scores statements by a wallet, not companies. It judges selected immutable diffs only. It cannot say whether a change is legal or fair, only whether the note matched the diff.</p></div>
        </div>
      </div>
    </>
  )
}
