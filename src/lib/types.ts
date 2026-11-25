export type Outcome = 'within_scope' | 'minor_beyond' | 'material_beyond' | 'contradicts_note'
export type Scope = 'typo_fix' | 'formatting_only' | 'clarification' | 'substantive_change'

export const OUTCOMES: Outcome[] = ['within_scope', 'minor_beyond', 'material_beyond', 'contradicts_note']
export const PENALTY: Record<Outcome, number> = { within_scope: 0, minor_beyond: 1, material_beyond: 3, contradicts_note: 6 }

export const OUTCOME_LABEL: Record<Outcome, string> = {
  within_scope: 'Within scope',
  minor_beyond: 'Minor, unmentioned',
  material_beyond: 'Material, unmentioned',
  contradicts_note: 'Contradicts the note',
}
export const OUTCOME_HELP: Record<Outcome, string> = {
  within_scope: 'Every added or removed line fits the declared scope and summary.',
  minor_beyond: 'A small change the note does not mention. No effect on obligations, rights, numbers or dates.',
  material_beyond: 'An unmentioned change to obligations, rights, numbers, dates, permissions or data sharing.',
  contradicts_note: 'The diff reverses or negates something the note says.',
}

export const SCOPE_LABEL: Record<Scope, string> = {
  typo_fix: 'Typo fix',
  formatting_only: 'Formatting only',
  clarification: 'Clarification',
  substantive_change: 'Substantive change',
}
export const SCOPE_HELP: Record<Scope, string> = {
  typo_fix: 'Spelling, grammar and punctuation only. No change to meaning, numbers, dates, rights or obligations.',
  formatting_only: 'Whitespace, line wrapping, markup or ordering only. No change to wording.',
  clarification: 'Rewording that keeps the same meaning. No new or removed obligations, rights, numbers or dates.',
  substantive_change: 'A change of meaning that your summary states explicitly. Anything the summary omits is out of scope.',
}
export const SCOPES = Object.keys(SCOPE_LABEL) as Scope[]

export type ObjectionView = {
  objection_id: number
  filer: string
  path: string
  note: string
  outcome: Outcome
  quote: string
  evidence_sha256: string
  upheld: boolean
  decided_at: number
}

export type NoticeView = {
  notice_id: number
  publisher: string
  repository: string
  base_sha: string
  head_sha: string
  scope: Scope
  summary: string
  covered: string[]
  created_at: number
  status: 'filed' | 'audited'
  audit: { outcome: Outcome | ''; file: string; quote: string; evidence_sha256: string; audited_by: string; audited_at: number }
  objections: ObjectionView[]
  compare_url: string
}

export type NoticeRow = {
  notice_id: number
  publisher: string
  repository: string
  base_sha: string
  head_sha: string
  scope: Scope
  summary: string
  status: 'filed' | 'audited'
  audit_outcome: Outcome | ''
  objections: number
  created_at: number
}

export type Standing = {
  address: string
  known: boolean
  notices: number
  audits_clean: number
  penalty: number
  objections_against: number
  upheld_against: number
  filed: number
  upheld: number
  dismissed: number
}
