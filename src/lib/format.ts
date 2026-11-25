export const short = (s: string, a = 6, b = 4) => (s && s.length > a + b + 2 ? `${s.slice(0, a)}…${s.slice(-b)}` : s)
export const shortSha = (s: string) => s.slice(0, 7)
export const isAddress = (s: string) => /^0x[0-9a-fA-F]{40}$/.test(s.trim())
export const sameAddress = (a?: string | null, b?: string | null) => !!a && !!b && a.toLowerCase() === b.toLowerCase()

export function when(epoch: number): string {
  if (!epoch) return 'unknown time'
  return new Date(epoch * 1000).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

export const byteLen = (s: string) => new TextEncoder().encode(s).length

export function parseRepo(input: string): string {
  let v = input.trim().replace(/^https?:\/\/github\.com\//i, '').replace(/\.git$/i, '').replace(/\/+$/, '')
  v = v.split('/').slice(0, 2).join('/')
  return v.toLowerCase()
}
export const validRepo = (v: string) => /^[a-z0-9][a-z0-9-]{0,38}\/[a-z0-9_.-]{1,100}$/.test(v)
export const validSha = (v: string) => /^[0-9a-f]{40}$/.test(v.trim().toLowerCase())
