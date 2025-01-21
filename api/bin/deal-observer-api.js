import '../lib/instrument.js'
import { createApp } from '../lib/app.js'
import { createPgPool } from '@filecoin-station/deal-observer-db'

const {
  PORT = '8080',
  HOST = '127.0.0.1',
  REQUEST_LOGGING = 'true'
} = process.env

const pgPool = await createPgPool()

const app = createApp({
  pgPool,
  logger: ['1', 'true'].includes(REQUEST_LOGGING)
})
console.log('Starting the http server on host %j port %s', HOST, PORT)
console.log(await app.listen({ host: HOST, port: Number(PORT) }))
