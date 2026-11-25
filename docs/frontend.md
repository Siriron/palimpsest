# Frontend

React 18 + Vite + TypeScript, `genlayer-js` ^1.2 (installed 1.2.0), `viem` as an explicit dependency, `react-router-dom` 6. Plain CSS, dark only.

## SDK rules in use

- Chain from `genlayer-js/chains` (`studionet`). Only `genlayer-js`, `genlayer-js/chains` and `genlayer-js/types` are imported.
- Reads use `createClient({ chain: studionet })`. Writes use the connected wallet's plain address string as `account` (never `createAccount`) and `provider: window.ethereum`.
- `ensureChain()` runs before every write. `writeContract` passes `value: BigInt(0)`. Read results are JSON-parsed.
- `waitForTransactionReceipt` uses `{ retries: 120, interval: 4000 }`. A timeout becomes a distinct state carrying the hash and an explorer link.
- Success means status ACCEPTED or FINALIZED and `txExecutionResultName` `FINISHED_WITH_RETURN`. Accepted is shown as provisional and appealable, with an on-demand "Check finality" button. UNDETERMINED, LEADER_TIMEOUT, VALIDATORS_TIMEOUT and CANCELED have their own message. Field names were checked against the installed 1.2.0 type definitions (`statusName`, `txExecutionResultName`).
- Wallet connection reconnects silently through `eth_accounts` and follows `accountsChanged`.

## Pages

| Route | Purpose |
|---|---|
| `/` | Overview |
| `/notices`, `/notices/:id` | Ledger, notice detail, audit, objections, in-browser evidence verification |
| `/file` | File a notice |
| `/standing`, `/standing/:address` | Public record for a wallet |
| `/guide` | In-app test guide: scenario dropdown, per-wallet steps, steps done only from on-chain state, resumable run ID, refresh/new run/clear, copyable transaction log |
| `/docs` | In-app docs including the live policy read from the contract |

## Reachability

Every contract method has a UI path: `file_notice` (File), `audit_notice` (notice page, guide), `object_to_path` (notice page, guide), `get_notice`, `list_notices`, `get_standing`, `get_policy` (Docs).

## Evidence verification

`src/lib/github.ts` recomputes the contract's SHA-256 evidence digest in the browser. The canonical form is `json.dumps([{file, patch}...], sort_keys, compact, ensure_ascii)`, with DEL (0x7f) escaped like Python does. Parity with the contract was checked on real fixtures.

## Limits

Verification calls api.github.com unauthenticated from the browser (60 requests an hour per IP). The app was type-checked, built and screenshotted headlessly, but has not been exercised against a live StudioNet contract.
