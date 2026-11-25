import { DEMO_C1, DEMO_C2, DEMO_C3, DEMO_REPO } from '../config/chains'
import type { NoticeInit } from '../components/forms'

export type StepKind = 'file' | 'audit' | 'object' | 'verify'
export type Role = 'publisher' | 'anyone' | 'objector' | 'reader'

export type Step = {
  kind: StepKind
  role: Role
  title: string
  body: string
  expect: string
  path?: string
  note?: string
}

export type Scenario = {
  id: string
  title: string
  blurb: string
  expectation: string
  notice: NoticeInit
  steps: Step[]
}

const demo = (base: string, head: string): Pick<NoticeInit, 'repo' | 'base' | 'head'> => ({ repo: DEMO_REPO, base, head })

export const SCENARIOS: Scenario[] = [
  {
    id: 'honest',
    title: '1 · Honest typo notice',
    blurb: 'A publisher says a commit only fixed spelling, and it did. One file, one audit.',
    expectation: 'Within scope. Publisher gets 0 penalty points and one clean audit.',
    notice: { ...demo(DEMO_C1, DEMO_C2), scope: 'typo_fix', summary: 'Corrects three spelling mistakes in the terms of use.', covered: ['TERMS.md'] },
    steps: [
      { kind: 'file', role: 'publisher', title: 'File the notice', body: 'Wallet A locks the statement. The form is pre-filled with the demo repository and its first two commits.', expect: 'A new notice appears with status "filed".' },
      { kind: 'audit', role: 'anyone', title: 'Audit the notice', body: 'Any wallet starts the audit. Validators fetch the GitHub comparison and judge TERMS.md against "typo fix".', expect: 'Outcome within_scope, no quoted line, penalty 0.' },
      { kind: 'verify', role: 'reader', title: 'Read the publisher standing', body: 'Standing is read straight from the contract.', expect: 'Notices 1, clean audits 1, penalty 0.' },
    ],
  },
  {
    id: 'omitted',
    title: '2 · A file the note left out',
    blurb: 'The notice covers only the terms. The same range also changed the privacy notice (retention 30 to 365 days, new analytics sharing) and reflowed the security policy.',
    expectation: 'Audit: within scope. Objection on PRIVACY.md: upheld (material or contradicts). Objection on SECURITY.md: dismissed (within scope or minor).',
    notice: { ...demo(DEMO_C1, DEMO_C3), scope: 'typo_fix', summary: 'Spelling fixes in the terms of use.', covered: ['TERMS.md'] },
    steps: [
      { kind: 'file', role: 'publisher', title: 'File the notice (Wallet A)', body: 'The note says "spelling fixes" and covers TERMS.md only, but the range is two commits and three files.', expect: 'A notice with status "filed".' },
      { kind: 'audit', role: 'anyone', title: 'Audit the covered file', body: 'TERMS.md really only has spelling fixes.', expect: 'Within scope, penalty 0.' },
      { kind: 'object', role: 'objector', title: 'Object to PRIVACY.md (Wallet B)', body: 'Switch wallets. The objector, not the publisher, chooses which omitted file goes on trial.', path: 'PRIVACY.md', note: 'Retention period and data sharing changed.', expect: 'Upheld. The cited line shows the retention or sharing change. Penalty 3 or 6.' },
      { kind: 'object', role: 'objector', title: 'Object to SECURITY.md (Wallet B)', body: 'This file only had a line rewrapped. An honest ledger should not punish that hard.', path: 'SECURITY.md', note: 'Line wrapping changed.', expect: 'Dismissed. Within scope (0) or minor (1 point). Objector gets a dismissal.' },
      { kind: 'verify', role: 'reader', title: 'Read both standings', body: 'Publisher penalty rose through the upheld objection. Wallet B holds one upheld and one dismissed objection.', expect: 'Publisher penalty 3 to 7. Objector: filed 2, upheld 1, dismissed 1.' },
    ],
  },
  {
    id: 'understated',
    title: '3 · Understated scope on a covered file',
    blurb: 'The publisher calls a retention change a "clarification". The covered file itself exceeds the note.',
    expectation: 'Material or contradicts. Publisher gets 3 or 6 penalty points and the audit cites the changed line.',
    notice: { ...demo(DEMO_C2, DEMO_C3), scope: 'clarification', summary: 'Clarifies the data retention wording in the privacy notice.', covered: ['PRIVACY.md'] },
    steps: [
      { kind: 'file', role: 'publisher', title: 'File the notice (Wallet A)', body: 'Declared scope: clarification. The diff actually changes 30 days to 365 days and adds sharing with analytics partners.', expect: 'A notice with status "filed".' },
      { kind: 'audit', role: 'anyone', title: 'Audit the notice', body: 'Validators must quote an exact changed line to claim a mismatch.', expect: 'material_beyond or contradicts_note, with a quoted + or - line from PRIVACY.md.' },
      { kind: 'verify', role: 'reader', title: 'Read the publisher standing', body: 'The penalty comes from a fixed table, not from the model.', expect: 'Penalty 3 or 6, no clean audit.' },
    ],
  },
]

export type LogEntry = { at: number; label: string; phase: string; status?: string; exec?: string; hash?: string; message?: string }
export type Run = { id: string; scenario: string; publisher: string; createdAt: number; log: LogEntry[] }

const KEY = 'palimpsest.guide.runs'
const CUR = 'palimpsest.guide.current'

export function loadRuns(): Record<string, Run> {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '{}') } catch { return {} }
}
export function saveRun(run: Run) {
  const all = loadRuns()
  all[run.id] = run
  try { localStorage.setItem(KEY, JSON.stringify(all)) } catch { /* storage unavailable */ }
}
export function deleteRun(id: string) {
  const all = loadRuns()
  delete all[id]
  try { localStorage.setItem(KEY, JSON.stringify(all)) } catch { /* storage unavailable */ }
}
export const getCurrent = () => { try { return localStorage.getItem(CUR) } catch { return null } }
export const setCurrent = (id: string | null) => { try { id ? localStorage.setItem(CUR, id) : localStorage.removeItem(CUR) } catch { /* storage unavailable */ } }
export const newRunId = () => 'pal-' + Math.random().toString(36).slice(2, 8)

export function formatLog(run: Run): string {
  const head = `Palimpsest test run ${run.id} · scenario ${run.scenario} · wallet A ${run.publisher}`
  const lines = run.log.map((e) => `${new Date(e.at).toISOString()} | ${e.label} | ${e.phase}${e.status ? ' / ' + e.status : ''}${e.exec ? ' / ' + e.exec : ''} | ${e.hash ?? 'no hash'}${e.message ? ' | ' + e.message : ''}`)
  return [head, ...lines].join('\n')
}
