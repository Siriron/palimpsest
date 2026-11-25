import { Link } from 'react-router-dom'
import { CONTRACT_ADDRESS, IS_DEPLOYED, explorerAddress } from '../config/chains'
import { ErrorNote, Ladder } from '../components/ui'
import { useLoad } from '../hooks'
import { readPolicy } from '../lib/chain'

const METHODS: [string, string, string][] = [
  ['file_notice(repository, base_sha, head_sha, scope, summary, covered_json)', 'write', 'Locks a statement: two commits, a declared scope, a summary and 1 to 3 covered files. Deterministic, no model call. One notice per wallet per comparison.'],
  ['audit_notice(notice_id)', 'write', 'Consensus round 1. Validators judge the covered files\' diffs against the declared scope and summary. Anyone may call it, once.'],
  ['object_to_path(notice_id, path, note)', 'write', 'Consensus round 2. Judges one uncovered file against the same notice. Each path can be decided once. Publishers cannot object to their own notice.'],
  ['get_notice(notice_id)', 'view', 'Full notice with audit result and every objection.'],
  ['list_notices(start, limit)', 'view', 'A page of notices (at most 20) and the total count.'],
  ['get_standing(address)', 'view', 'Publisher and objector counters for a wallet. The lookup is case-insensitive.'],
  ['get_policy()', 'view', 'The scope definitions, the ladder, the penalty table and the limits.'],
]

function LivePolicy() {
  const { data, error, loading, reload } = useLoad(() => (IS_DEPLOYED ? readPolicy() : Promise.resolve(null)), [])
  if (!IS_DEPLOYED) return <p className="small faint">The live policy appears here once a contract address is set.</p>
  if (error) return <ErrorNote message={error} onRetry={() => reload(true)} />
  if (loading || !data) return <p className="small faint">Reading the policy from the contract…</p>
  const penalty = data.penalty as Record<string, number>
  return (
    <div className="card raised pad-sm stack">
      <strong className="small">Live from the contract (get_policy)</strong>
      <div className="row">{Object.entries(penalty).map(([k, v]) => <span key={k} className="chip mono">{k}: {v}</span>)}</div>
      <div className="small dim">Upheld from <code>{String(data.material_from)}</code>. At most {String(data.max_covered)} covered files, {String(data.max_compare_files)} files per comparison, {String(data.max_patch_bytes)} bytes per judged patch.</div>
    </div>
  )
}

export default function Docs() {
  return (
    <div className="wrap page prose" style={{ maxWidth: 820 }}>
      <span className="eyebrow">Documentation</span>
      <h1 style={{ fontSize: '2.6rem', margin: '10px 0 14px' }}>How Palimpsest works</h1>
      <p className="dim">Living documents are rewritten in place. Palimpsest checks that the note describing a change matches the change, using the real diff and GenLayer validator consensus.</p>

      <h2 id="overview">Overview</h2>
      <p>A <strong>publisher</strong> files a notice: a repository, two commits, a declared scope (typo fix, formatting only, clarification or substantive change), a short summary and up to three covered files. That statement is locked. A <strong>validator committee</strong> then judges the diff against it. Any <strong>objector</strong> can pick a file the notice did not cover and ask the same question about it.</p>

      <h2 id="how">How it works</h2>
      <ul>
        <li><strong>User action:</strong> file, audit or object.</li>
        <li><strong>Evidence source:</strong> <code>api.github.com</code> compare endpoint for the locked repository and SHAs.</li>
        <li><strong>Non-deterministic step:</strong> a model judges the patch against the scope. Validators fetch the evidence themselves.</li>
        <li><strong>Equivalence rule:</strong> same evidence digest, outcomes within one rung, and the same answer on "was it material".</li>
        <li><strong>State update:</strong> the verdict, the cited line and the evidence digest are stored; standing moves by a fixed table.</li>
      </ul>
      <p>The frontend owns the forms and read views. The contract owns the locked statement, the verdict rules and the ledger. GitHub owns the raw facts.</p>

      <h2 id="evidence">Evidence sources</h2>
      <div className="tablewrap"><table className="t"><thead><tr><th>Host</th><th>URL pattern</th><th>Fetch</th><th>Deciding field</th></tr></thead>
        <tbody><tr><td className="mono">api.github.com</td><td className="mono">/repos/{'{owner}/{repo}'}/compare/{'{base}...{head}'}</td><td>web.request (JSON)</td><td className="mono">files[].patch</td></tr></tbody></table></div>
      <p style={{ marginTop: 12 }}>The URL is built only from the locked repository and SHAs. The response must echo the repository, both SHAs and "ahead", and each file's counts must match its patch. A comparison over 12 files, or a patch over 4000 bytes, cannot be judged.</p>

      <h2 id="ladder">The ladder</h2>
      <Ladder />
      <p style={{ marginTop: 12 }}>A model cannot assert a mismatch without quoting a real added or removed line; the contract checks the quote against the diff bytes. The penalty is looked up, never invented: minor 1, material 3, contradicts 6. An objection is <em>upheld</em> from material upward.</p>

      <LivePolicy />

      <h2 id="api">Contract API</h2>
      <div className="tablewrap"><table className="t"><thead><tr><th>Method</th><th>Kind</th><th>What it does</th></tr></thead>
        <tbody>{METHODS.map(([m, k, d]) => <tr key={m}><td className="mono small">{m}</td><td>{k}</td><td className="dim">{d}</td></tr>)}</tbody></table></div>

      <h2 id="verify">Verifying evidence yourself</h2>
      <p>Each verdict stores a SHA-256 digest of the evidence. On a notice page, "Verify evidence on GitHub" re-fetches the comparison in your browser and recomputes the digest. A match means GitHub still serves the exact bytes the validators judged.</p>

      <h2 id="faq">FAQ</h2>
      <h3>Can the model be fooled by the document text?</h3>
      <p>Diffs and summaries are wrapped as untrusted data and sanitised. The objector's note is never sent to the model, so it cannot steer a verdict.</p>
      <h3>Why no stake?</h3>
      <p>The consequence is public standing. There is no deposit, wager or payout anywhere in the contract.</p>
      <h3>Does a verdict mean a change is legal or fair?</h3>
      <p>No. It means the note did or did not match the diff.</p>
      <h3>Why can a decided objection not be retried?</h3>
      <p>Each path is decided once, which also stops a publisher pre-clearing files with throwaway wallets and then hiding the real objection. There is no appeal round in this version.</p>

      <h2 id="limits">Limits</h2>
      <ul>
        <li>Standing is per wallet. There is no sybil resistance and no proof that the publisher controls the repository.</li>
        <li>Only public GitHub repositories, linear ranges, and small text patches.</li>
        <li>StudioNet is a temporary network. Addresses may not survive resets, so the repository tests are the proof of behaviour.</li>
        <li>The tests run the real contract in direct mode but mock the web and the model. They do not prove real model behaviour or multi-node timing.</li>
      </ul>

      <h2 id="deploy">Deploying</h2>
      <ul>
        <li>Open GenLayer Studio, deploy <code>contracts/palimpsest.py</code> to StudioNet (no constructor arguments).</li>
        <li>Paste the address into <code>src/config/chains.ts</code> as <code>CONTRACT_ADDRESS</code> and redeploy the site.</li>
        <li>Use the <Link to="/guide">test guide</Link> to exercise every method.</li>
      </ul>
      <p className="small faint">{IS_DEPLOYED ? <>Contract: <a href={explorerAddress(CONTRACT_ADDRESS)} target="_blank" rel="noreferrer">{CONTRACT_ADDRESS}</a></> : 'This build has no contract address set yet.'}</p>
    </div>
  )
}
