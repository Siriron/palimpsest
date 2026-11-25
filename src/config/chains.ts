// The only place the deployed contract address lives. After deploying contracts/palimpsest.py
// to StudioNet, paste the address between the quotes. Empty means "not deployed yet" and the app
// shows setup instructions instead of failing silently.
export const CONTRACT_ADDRESS = ''

export const IS_DEPLOYED = /^0x[0-9a-fA-F]{40}$/.test(CONTRACT_ADDRESS)

export const STUDIONET = {
  chainId: '0xF22F', // 61999
  chainName: 'GenLayer StudioNet',
  rpcUrls: ['https://studio.genlayer.com/api'],
  nativeCurrency: { name: 'GEN', symbol: 'GEN', decimals: 18 },
  blockExplorerUrls: ['https://explorer-studio.genlayer.com'],
}

export const EXPLORER = 'https://explorer-studio.genlayer.com'
export const explorerTx = (hash: string) => `${EXPLORER}/transactions/${hash}`
export const explorerAddress = (addr: string) => `${EXPLORER}/address/${addr}`

// Public demo documents used by the in-app guide (fictional policies, three commits).
export const DEMO_REPO = 'siriron/palimpsest-demo-docs'
export const DEMO_C1 = 'c81e5c554f0de118d5f08ccbf754efcc8073f245'
export const DEMO_C2 = '207f1838a67ece860f6093b2c88a5d8054f131ea'
export const DEMO_C3 = 'f12acad3a188caaf116681c0fdea1314ca4976b3'
