import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { checkFinality, sendWrite, type TxUpdate } from '../lib/chain'
import { useWallet } from './Wallet'

export type TxEntry = TxUpdate & { id: number; label: string; at: number }

type TxCtx = {
  current: TxEntry | null
  busy: boolean
  send: (label: string, fn: string, args: (string | number | bigint)[], onLog?: (e: TxEntry) => void) => Promise<TxUpdate>
  dismiss: () => void
  finality: (hash: string) => Promise<string>
}

const Ctx = createContext<TxCtx>({
  current: null,
  busy: false,
  send: async () => ({ phase: 'failed' }),
  dismiss: () => {},
  finality: async () => 'UNKNOWN',
})
export const useTx = () => useContext(Ctx)

let counter = 0

export function TxProvider({ children }: { children: ReactNode }) {
  const { account, connect } = useWallet()
  const [current, setCurrent] = useState<TxEntry | null>(null)
  const [busy, setBusy] = useState(false)

  const send = useCallback(
    async (label: string, fn: string, args: (string | number | bigint)[], onLog?: (e: TxEntry) => void) => {
      if (busy) return { phase: 'failed', message: 'Another transaction is still in flight.' } as TxUpdate
      let who = account
      if (!who) who = await connect()
      if (!who) return { phase: 'failed', message: 'Connect a wallet first.' } as TxUpdate
      const id = ++counter
      setBusy(true)
      const apply = (u: TxUpdate) => {
        const entry: TxEntry = { ...u, id, label, at: Date.now() }
        setCurrent(entry)
        return entry
      }
      try {
        const last = await sendWrite(who, fn, args, (u) => apply(u))
        const entry = apply(last)
        onLog?.(entry)
        return last
      } finally {
        setBusy(false)
      }
    },
    [account, busy, connect],
  )

  const value = useMemo(
    () => ({ current, busy, send, dismiss: () => setCurrent(null), finality: checkFinality }),
    [current, busy, send],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
