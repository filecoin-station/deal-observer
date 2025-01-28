const {
  RPC_URLS = 'https://api.node.glif.io/rpc/v0',
  // TODO: Enable API once token is added to the environment
  // https://api.zondax.ch/fil/node/mainnet/rpc/v1',
  GLIF_TOKEN,
  ZONDAX_TOKEN
} = process.env

const rpcUrls = RPC_URLS.split(',')
const RPC_URL = rpcUrls[Math.floor(Math.random() * rpcUrls.length)]
console.log(`Selected JSON-RPC endpoint ${RPC_URL}`)

const rpcHeaders = {}
if (RPC_URL.includes('glif')) {
  rpcHeaders.Authorization = `Bearer ${GLIF_TOKEN}`
  console.log('Configured GLIF Token for JSON-RPC endpoint')
} else if (RPC_URL.includes('zondax')) {
  rpcHeaders.Authorization = `Bearer ${ZONDAX_TOKEN}`
  console.log('Configured Zondax Token for JSON-RPC endpoint')
}

export {
  RPC_URL,
  rpcHeaders
}
