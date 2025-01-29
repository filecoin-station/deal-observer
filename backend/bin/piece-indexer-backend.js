import { createPgPool } from '@filecoin-station/deal-observer-db'
import '../lib/instrument.js'
import { createInflux } from '../lib/telemetry.js'
import { rpcRequest } from '../lib/rpc-service/service.js'
import { pixRequest } from '../lib/pix-service/service.js'
import * as Sentry from '@sentry/node'
import timers from 'node:timers/promises'
import slug from 'slug'
import { pieceIndexerLoopFunction } from '../lib/piece-indexer.js'

const { INFLUXDB_TOKEN } = process.env
if (!INFLUXDB_TOKEN) {
  console.error('INFLUXDB_TOKEN was not provided. Please set the INFLUXDB_TOKEN environment variable.')
}
const { recordTelemetry } = createInflux(INFLUXDB_TOKEN)
const LOOP_INTERVAL = 10 * 1000
const queryLimit = 1000
const LOOP_NAME = 'Piece Indexer'

export const pieceIndexerLoop = async (rpcRequest, pixRequest, pgPool, queryLimit) => {
  while (true) {
    const start = Date.now()
    try {
      pieceIndexerLoopFunction(rpcRequest, pixRequest, pgPool, queryLimit)
    } catch (e) {
      console.error(e)
      Sentry.captureException(e)
    }
    const dt = Date.now() - start
    console.log(`Loop "${LOOP_NAME}" took ${dt}ms`)

    // For local monitoring and debugging, we can omit sending data to InfluxDB
    if (INFLUXDB_TOKEN) {
      recordTelemetry(`loop_${slug(LOOP_NAME, '_')}`, point => {
        point.intField('interval_ms', LOOP_INTERVAL)
        point.intField('duration_ms', dt)
      })
    }
    if (dt < LOOP_INTERVAL) {
      await timers.setTimeout(LOOP_INTERVAL - dt)
    }
  }
}
await pieceIndexerLoop(
  rpcRequest,
  pixRequest,
  await createPgPool(),
  queryLimit
)
