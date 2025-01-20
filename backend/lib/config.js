const {
  RPC_URLS = 'https://api.node.glif.io/rpc/v0,https://api.zondax.ch/fil/node/mainnet/rpc/v1',
  GLIF_TOKEN
} = process.env

const rpcUrls = RPC_URLS.split(',')
const RPC_URL = rpcUrls[Math.floor(Math.random() * rpcUrls.length)]
console.log(`Selected JSON-RPC endpoint ${RPC_URL}`)

const rpcHeaders = {}
if (RPC_URL.includes('glif')) {
  rpcHeaders.Authorization = `Bearer ${GLIF_TOKEN}`
}

export {
  RPC_URL,
  rpcHeaders
}
