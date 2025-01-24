import { createPgPool } from '@filecoin-station/deal-observer-db'
import * as Sentry from '@sentry/node'
import timers from 'node:timers/promises'
import slug from 'slug'
import '../lib/instrument.js'
import { createInflux } from '../lib/telemetry.js'
import { getChainHead, rpcRequest } from '../lib/rpc-service/service.js'
import { fetchDealWithHighestActivatedEpoch, observeBuiltinActorEvents } from '../lib/deal-observer.js'
import assert from 'node:assert'
import { pixRequest } from '../lib/pix-service/service.js'

const { INFLUXDB_TOKEN } = process.env
if (!INFLUXDB_TOKEN) {
  console.error('INFLUXDB_TOKEN was not provided. Please set the INFLUXDB_TOKEN environment variable.')
}
const LOOP_BACK_INTERVAL = 10 * 1000
const pgPool = await createPgPool()

const LOOP_NAME = 'Piece Indexer'
const { recordTelemetry } = createInflux(INFLUXDB_TOKEN)

const pieceIndexerLoop = async (makeRpcRequest, pgPool) => {
  while (true) {
    const start = Date.now()
    try {
      const lastEpochStored = (await fetchDealWithHighestActivatedEpoch(pgPool)).height
    } catch (e) {
      console.error(e)
      Sentry.captureException(e)
    }
    const dt = Date.now() - start
    console.log(`Loop "${LOOP_NAME}" took ${dt}ms`)

    // For local monitoring and debugging, we can omit sending data to InfluxDB
    if (INFLUXDB_TOKEN) {
      recordTelemetry(`loop_${slug(LOOP_NAME, '_')}`, point => {
        point.intField('interval_ms', LOOP_BACK_INTERVAL)
        point.intField('duration_ms', dt)
      })
    }
    if (dt < LOOP_BACK_INTERVAL) {
      await timers.setTimeout(LOOP_BACK_INTERVAL - dt)
    }
  }
}

await pieceIndexerLoop(
pixRequest,
  pgPool
)
