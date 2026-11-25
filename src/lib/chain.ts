import { createClient } from 'genlayer-js'
import { studionet } from 'genlayer-js/chains'
import { TransactionStatus } from 'genlayer-js/types'
import { CONTRACT_ADDRESS, IS_DEPLOYED, STUDIONET } from '../config/chains'
import type { NoticeRow, NoticeView, Standing } from './types'

type Addr = `0x${string}`
const eth = () => (window as unknown as { ethereum?: any }).ethereum

export class ChainError extends Error {
  kind: 'rate_limit' | 'not_deployed' | 'revert' | 'network'
  constructor(kind: ChainError['kind'], message: string) {
    super(message)
    this.kind = kind
  }
}

export class TimeoutError extends Error {
  txHash: string
  isTimeout = true
  constructor(hash: string) {
    super('Consensus is taking longer than expected. Your transaction was submitted. Check its status on the explorer.')
    this.txHash = hash
  }
}

function classify(err: unknown): ChainError {
  const text = err instanceof Error ? err.message : String(err)
  if (/429|-32429|rate.?limit/i.test(text)) {
    return new ChainError('rate_limit', 'StudioNet is rate-limiting this connection. Wait about a minute, then refresh.')
  }
  const expected = text.match(/\[EXPECTED\]\s*([^"\\\n]+)/)
  if (expected) return new ChainError('revert', expected[1].trim())
  return new ChainError('network', text.length > 240 ? text.slice(0, 240) + '…' : text)
}

const readClient = createClient({ chain: studionet })
const cache = new Map<string, { t: number; v: unknown }>()
const TTL = 15_000

export function clearReadCache() {
  cache.clear()
}

async function readJson<T>(fn: string, args: (string | number | bigint)[] = [], fresh = false): Promise<T> {
  if (!IS_DEPLOYED) throw new ChainError('not_deployed', 'The contract address is not set yet.')
  const key = fn + JSON.stringify(args.map(String))
  const hit = cache.get(key)
  if (!fresh && hit && Date.now() - hit.t < TTL) return hit.v as T
  try {
    const raw = await readClient.readContract({ address: CONTRACT_ADDRESS as Addr, functionName: fn, args })
    const value = JSON.parse(String(raw)) as T
    cache.set(key, { t: Date.now(), v: value })
    return value
  } catch (err) {
    throw classify(err)
  }
}

export const readNotice = (id: number, fresh = false) => readJson<NoticeView>('get_notice', [BigInt(id)], fresh)
export const readNotices = (start: number, limit: number, fresh = false) =>
  readJson<{ total: number; items: NoticeRow[] }>('list_notices', [BigInt(start), BigInt(limit)], fresh)
export const readStanding = (address: string, fresh = false) => readJson<Standing>('get_standing', [address], fresh)
export const readPolicy = () => readJson<Record<string, unknown>>('get_policy')

/** Find a notice by its locked comparison and publisher by scanning pages from the newest. */
export async function findNotice(repo: string, base: string, head: string, publisher: string, fresh = true): Promise<NoticeRow | null> {
  const first = await readNotices(1, 1, fresh)
  let end = first.total
  while (end >= 1) {
    const start = Math.max(1, end - 19)
    const page = await readNotices(start, end - start + 1, fresh)
    for (const row of page.items.slice().reverse()) {
      if (
        row.repository === repo.toLowerCase() &&
        row.base_sha === base.toLowerCase() &&
        row.head_sha === head.toLowerCase() &&
        row.publisher.toLowerCase() === publisher.toLowerCase()
      ) {
        return row
      }
    }
    end = start - 1
  }
  return null
}

// ---------------------------------------------------------------- wallet and writes

export async function ensureChain() {
  const e = eth()
  if (!e) return
  try {
    await e.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: STUDIONET.chainId }] })
  } catch (err: any) {
    if (err && err.code === 4902) {
      await e.request({ method: 'wallet_addEthereumChain', params: [STUDIONET] })
      await e.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: STUDIONET.chainId }] })
    } else if (err && err.code === -32002) {
      await new Promise((r) => setTimeout(r, 3000))
    } else {
      throw err
    }
  }
}

async function writeClient(account: string) {
  // The account is the connected wallet's plain address, never createAccount(address).
  const client: any = createClient({ chain: studionet, account: account as Addr, provider: eth() } as any)
  if (typeof client.connect === 'function') {
    try {
      await client.connect('studionet')
    } catch {
      /* not available on every SDK build */
    }
  }
  return client
}

export type Phase = 'wallet' | 'submitted' | 'accepted' | 'finalized' | 'failed' | 'undetermined' | 'timeout' | 'rate_limited'

export type TxUpdate = {
  phase: Phase
  hash?: string
  status?: string
  exec?: string
  message?: string
}

/** The one place that decides what "success" means: ACCEPTED or FINALIZED and FINISHED_WITH_RETURN. */
export function judgeReceipt(receipt: any): TxUpdate {
  const status: string = String(receipt?.statusName ?? receipt?.status ?? '')
  const exec: string = String(receipt?.txExecutionResultName ?? '')
  if (status === 'UNDETERMINED' || status === 'LEADER_TIMEOUT' || status === 'VALIDATORS_TIMEOUT' || status === 'CANCELED') {
    return {
      phase: 'undetermined',
      status,
      exec,
      message: 'Validators did not reach agreement on this judgement. Nothing was written. You can try again.',
    }
  }
  if (exec && exec !== 'FINISHED_WITH_RETURN') {
    return {
      phase: 'failed',
      status,
      exec,
      message: 'The contract rejected this action. No state changed. Open the transaction on the explorer for the reason.',
    }
  }
  if (status === 'FINALIZED') return { phase: 'finalized', status, exec }
  return {
    phase: 'accepted',
    status,
    exec,
    message: 'Accepted by validators. Provisional and appealable until finalized.',
  }
}

export async function sendWrite(
  account: string,
  fn: string,
  args: (string | number | bigint)[],
  onUpdate: (u: TxUpdate) => void,
): Promise<TxUpdate> {
  if (!IS_DEPLOYED) throw new ChainError('not_deployed', 'The contract address is not set yet.')
  onUpdate({ phase: 'wallet', message: 'Confirm in your wallet.' })
  let hash = ''
  try {
    await ensureChain()
    const client = await writeClient(account)
    hash = (await client.writeContract({ address: CONTRACT_ADDRESS as Addr, functionName: fn, args, value: BigInt(0) })) as string
    onUpdate({ phase: 'submitted', hash, message: 'Submitted. Consensus on a judgement can take several minutes.' })
    const receipt = await client.waitForTransactionReceipt({
      hash,
      status: TransactionStatus.ACCEPTED,
      retries: 120,
      interval: 4000,
    })
    clearReadCache()
    const done = { ...judgeReceipt(receipt), hash }
    onUpdate(done)
    return done
  } catch (err) {
    if (hash) {
      const text = err instanceof Error ? err.message : String(err)
      if (/429|-32429|rate.?limit/i.test(text)) {
        const u: TxUpdate = { phase: 'rate_limited', hash, message: 'StudioNet is rate-limiting this connection. The transaction may still complete. Check the explorer.' }
        onUpdate(u)
        return u
      }
      const t = new TimeoutError(hash)
      const u: TxUpdate = { phase: 'timeout', hash, message: t.message }
      onUpdate(u)
      return u
    }
    const c = classify(err)
    const text = err instanceof Error ? err.message : String(err)
    const rejected = /reject|denied|cancel/i.test(text)
    const u: TxUpdate = {
      phase: c.kind === 'rate_limit' ? 'rate_limited' : 'failed',
      message: rejected ? 'The request was rejected in the wallet.' : c.message,
    }
    onUpdate(u)
    return u
  }
}

/** One-shot finality check for a transaction the user already sent. */
export async function checkFinality(hash: string): Promise<string> {
  try {
    const tx: any = await (readClient as any).getTransaction({ hash })
    return String(tx?.statusName ?? tx?.status ?? 'UNKNOWN')
  } catch (err) {
    throw classify(err)
  }
}

export async function connectedAccounts(): Promise<string[]> {
  const e = eth()
  if (!e) return []
  try {
    return (await e.request({ method: 'eth_accounts' })) as string[]
  } catch {
    return []
  }
}
export async function requestAccounts(): Promise<string[]> {
  const e = eth()
  if (!e) throw new Error('No wallet found. Install a browser wallet such as MetaMask.')
  return (await e.request({ method: 'eth_requestAccounts' })) as string[]
}
export function onAccountsChanged(handler: (a: string[]) => void): () => void {
  const e = eth()
  if (!e || !e.on) return () => {}
  e.on('accountsChanged', handler)
  return () => e.removeListener && e.removeListener('accountsChanged', handler)
}
