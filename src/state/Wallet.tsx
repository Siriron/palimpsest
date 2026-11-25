import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { connectedAccounts, onAccountsChanged, requestAccounts } from '../lib/chain'

type WalletCtx = {
  account: string | null
  connecting: boolean
  error: string | null
  connect: () => Promise<string | null>
}

const Ctx = createContext<WalletCtx>({ account: null, connecting: false, error: null, connect: async () => null })
export const useWallet = () => useContext(Ctx)

export function WalletProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Silent reconnect (eth_accounts never prompts) and stay in sync when the wallet switches.
    connectedAccounts().then((a) => a[0] && setAccount(a[0]))
    return onAccountsChanged((a) => setAccount(a[0] ?? null))
  }, [])

  const connect = useCallback(async () => {
    setConnecting(true)
    setError(null)
    try {
      const a = await requestAccounts()
      setAccount(a[0] ?? null)
      return a[0] ?? null
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not connect the wallet.')
      return null
    } finally {
      setConnecting(false)
    }
  }, [])

  const value = useMemo(() => ({ account, connecting, error, connect }), [account, connecting, error, connect])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
