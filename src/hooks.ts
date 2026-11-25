import { useCallback, useEffect, useRef, useState } from 'react'

export type Loaded<T> = { data: T | null; error: string | null; loading: boolean; reload: (fresh?: boolean) => void }

/** Minimal async loader. Reads are cached 15 s inside lib/chain, so remounting never hammers StudioNet. */
export function useLoad<T>(fn: (fresh: boolean) => Promise<T>, deps: unknown[]): Loaded<T> {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const alive = useRef(true)
  const run = useCallback(
    (fresh = false) => {
      setLoading(true)
      setError(null)
      fn(fresh)
        .then((d) => alive.current && setData(d))
        .catch((e) => alive.current && setError(e instanceof Error ? e.message : String(e)))
        .finally(() => alive.current && setLoading(false))
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    deps,
  )
  useEffect(() => {
    alive.current = true
    run(false)
    return () => {
      alive.current = false
    }
  }, [run])
  return { data, error, loading, reload: run }
}

export function useCopy(): [boolean, (text: string) => void] {
  const [copied, setCopied] = useState(false)
  const copy = (text: string) => {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }
  return [copied, copy]
}
