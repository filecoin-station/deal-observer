import '../lib/instrument.js'
import { createApp } from '../lib/app.js'

const {
  PORT = '8080',
  HOST = '127.0.0.1',
  REQUEST_LOGGING = 'true',
  DATABASE_URL = 'postgres://localhost:5432/spark_deal_observer'
} = process.env

const app = createApp({
  DATABASE_URL,
  logger: {
    level: ['1', 'true'].includes(REQUEST_LOGGING) ? 'info' : 'error'
  }
})
console.log('Starting the http server on host %j port %s', HOST, PORT)
const serverUrl = await app.listen({ host: HOST, port: Number(PORT) })
console.log(serverUrl)
