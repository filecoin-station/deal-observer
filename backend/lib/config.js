const {
  RPC_URLS = 'https://api.node.glif.io/rpc/v0',
  GLIF_TOKEN
} = process.env

const rpcUrls = RPC_URLS.split(',')
const GLIF_RPC = rpcUrls[Math.floor(Math.random() * rpcUrls.length)]
console.log(`Selected JSON-RPC endpoint ${GLIF_RPC}`)

const rpcHeaders = {}
if (GLIF_RPC.includes('glif')) {
  rpcHeaders.Authorization = `Bearer ${GLIF_TOKEN}`
}

// The types of events we want to watch out for
const EVENT_TYPES = ['claim']

export {
  GLIF_RPC,
  rpcHeaders,
  EVENT_TYPES
}
