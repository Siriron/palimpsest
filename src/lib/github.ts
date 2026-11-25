export type CompareFile = { filename: string; status: string; additions: number; deletions: number; patch?: string }
export type CompareResult = {
  files: CompareFile[]
  problems: string[]
}

export const MAX_COMPARE_FILES = 12
export const MAX_PATCH_BYTES = 4000

const bytes = (s: string) => new TextEncoder().encode(s).length

/** Fetch a comparison from GitHub and report what the contract would refuse. */
export async function fetchCompare(repo: string, base: string, head: string): Promise<CompareResult> {
  const res = await fetch(`https://api.github.com/repos/${repo}/compare/${base}...${head}`, {
    headers: { Accept: 'application/vnd.github+json' },
  })
  if (res.status === 403 || res.status === 429) throw new Error('GitHub is rate-limiting this browser. Try again later.')
  if (!res.ok) throw new Error(`GitHub returned ${res.status}. Check the repository is public and the SHAs are correct.`)
  const data = await res.json()
  const problems: string[] = []
  if (data.status !== 'ahead') problems.push('The head commit must be strictly ahead of the baseline (a linear range).')
  if (data.merge_base_commit?.sha !== base) problems.push('The baseline must be the merge base of the range.')
  if (data.base_commit?.sha !== base) problems.push('GitHub did not echo the baseline SHA.')
  const commits: { sha: string }[] = data.commits ?? []
  if (!commits.length || commits[commits.length - 1].sha !== head) problems.push('GitHub did not echo the head SHA as the last commit.')
  if (commits.length > 100) problems.push('The range has more than 100 commits.')
  const files: CompareFile[] = data.files ?? []
  if (files.length > MAX_COMPARE_FILES) problems.push(`The range changes ${files.length} files. The contract accepts at most ${MAX_COMPARE_FILES}.`)
  for (const f of files) {
    if (!f.patch) problems.push(`${f.filename} has no text patch (binary, renamed or too large), so it cannot be judged.`)
    else if (bytes(f.patch) > MAX_PATCH_BYTES) problems.push(`${f.filename} has a patch over ${MAX_PATCH_BYTES} bytes, so it cannot be judged.`)
  }
  return { files, problems }
}

/**
 * Must match the contract's _evidence_digest byte for byte:
 * json.dumps([{file, patch}, ...sorted by file], sort_keys, compact separators, ensure_ascii).
 * Python escapes every character outside space..~ so DEL (0x7f) is escaped too.
 */
export async function evidenceDigest(rows: { file: string; patch: string }[]): Promise<string> {
  const sorted = [...rows].sort((a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : 0))
  const json = JSON.stringify(sorted.map((r) => ({ file: r.file, patch: r.patch }))).replace(
    /[\u007f-\uffff]/g,
    (ch) => '\\u' + ch.charCodeAt(0).toString(16).padStart(4, '0'),
  )
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(json))
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

export type DiffRow = { kind: 'hunk' | 'add' | 'del' | 'ctx' | 'meta'; text: string }
export function parsePatch(patch: string): DiffRow[] {
  return patch.split('\n').map((line) => {
    if (line.startsWith('@@')) return { kind: 'hunk', text: line }
    if (line.startsWith('+')) return { kind: 'add', text: line }
    if (line.startsWith('-')) return { kind: 'del', text: line }
    if (line.startsWith('\\')) return { kind: 'meta', text: line }
    return { kind: 'ctx', text: line }
  })
}
