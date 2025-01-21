import '../lib/instrument.js'
import express from 'express'
import { once } from 'node:events'
import { createHandler } from '../lib/handler.js'
import { createPgPool } from '@filecoin-station/deal-observer-db'
import { DealObserver } from '../../backend/lib/deal-observer.js'
import { Worker } from 'worker_threads';

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

const dealObserver = await DealObserver.create(pgPool)
const server = express()
console.log('Starting the http server on host %j port %s', HOST, PORT)
server.get('/', (req, res) => {
  res.send('OK')
})
server.get('/active-deals', async (req, res) => {
  console.log(`Received parameter: ${JSON.stringify(req.query)}`)
  if (typeof req.query.blockHeight === 'number' && req.query.blockHeight > 0) {
    res.json(await dealObserver.fetchDealByBlockHeight(parseInt(req.query.blockHeight)))
  }
  else if (typeof req.query.fromBlockHeight === 'number' && req.query.fromBlockHeight < 0 &&typeof req.query.toBlockHeight === 'number' && req.query.toBlockHeight > 0) {
    res.json(await dealObserver.fetchDealByBlockHeight(parseInt(req.query.fromBlockHeight), parseInt(req.query.toBlockHeight)))
  }
  else{
    res.json(await dealObserver.fetchDealWithHighestActivatedEpoch(false))
  }  
})
server.listen(PORT, () => {
  console.log(`Server running at http://${HOST}:${PORT}/`)
})
