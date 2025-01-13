import '../lib/instrument.js'
import http from 'node:http'
import { once } from 'node:events'
import { createHandler } from '../lib/handler.js'
import { createPgPool } from '@filecoin-station/deal-observer-db'

const {
  PORT = '8080',
  HOST = '127.0.0.1',
  REQUEST_LOGGING = 'true'
} = process.env

const pgPool = await createPgPool()
const logger = {
  error: console.error,
  info: console.info,
  request: ['1', 'true'].includes(REQUEST_LOGGING) ? console.info : () => {}
}

const handler = createHandler({ pgPool, logger })
const server = http.createServer(handler)
console.log('Starting the http server on host %j port %s', HOST, PORT)
server.listen(Number(PORT), HOST)
await once(server, 'listening')
console.log(`http://${HOST}:${PORT}`)
