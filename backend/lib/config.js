const {
  RPC_URLS = 'https://api.node.glif.io/rpc/v0',
  GLIF_TOKEN
} = process.env

const rpcUrls = RPC_URLS.split(',')
const RPC_URL = rpcUrls[Math.floor(Math.random() * rpcUrls.length)]
console.log(`Selected JSON-RPC endpoint ${RPC_URL}`)

const rpcHeaders = {}
if (RPC_URL.includes('glif') && GLIF_TOKEN) {
  rpcHeaders.Authorization = `Bearer ${GLIF_TOKEN}`
  console.info('Using Glif auth token')
}

export {
  RPC_URL,
  rpcHeaders
}
