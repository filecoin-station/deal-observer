import { createPgPool } from '@filecoin-station/deal-observer-db'
import * as Sentry from '@sentry/node'
import timers from 'node:timers/promises'
import slug from 'slug'
import { RPC_URL, rpcHeaders } from '../lib/config.js'
import '../lib/instrument.js'
import { createInflux } from '../lib/telemetry.js'
import { getChainHead, rpcRequest } from '../lib/rpc-service/service.js'
import { fetchDealWithHighestActivatedEpoch, observeBuiltinActorEvents } from '../lib/deal-observer.js'
import assert from 'node:assert'

const { INFLUXDB_TOKEN } = process.env
if (!INFLUXDB_TOKEN) {
  console.error('INFLUXDB_TOKEN was not provided. Please set the INFLUXDB_TOKEN environment variable.')
}
const LOOP_BACK_INTERVAL = 10 * 1000
// Filecoin will need some epochs to reach finality.
// We do not want to fetch deals that are newer than the current chain head - 940 epochs.
const finalityEpochs = 940
const maxPastEpochs = 1999
assert(finalityEpochs <= maxPastEpochs)
const pgPool = await createPgPool()

const LOOP_NAME = 'Built-in actor events'
const { recordTelemetry } = createInflux(INFLUXDB_TOKEN)

const dealObserverLoop = async (makeRpcRequest, pgPool) => {
  while (true) {
    const start = Date.now()
    try {
      // If the store is empty we set the lastEpochStore to 0 and start fetching from the current chain head
      const currentChainHead = await getChainHead(makeRpcRequest)
      const currentFinalizedChainHead = currentChainHead.Height - finalityEpochs
      // If the storage is empty we start 2000 blocks into the past as that is the furthest we can go with the public glif rpc endpoints.
      const lastEpochStored = (await fetchDealWithHighestActivatedEpoch(pgPool)).height ?? currentChainHead.Height - 1999
      if (lastEpochStored < currentFinalizedChainHead) {
        // TODO: The free plan does not allow for fetching epochs older than 2000 blocks. We need to account for that.
        for (let epoch = lastEpochStored + 1; lastEpochStored <= currentFinalizedChainHead; epoch++) {
          await observeBuiltinActorEvents(epoch, pgPool, makeRpcRequest)
        }
      }
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

Promise.all([
  dealObserverLoop(
    rpcRequest,
    pgPool
  )
])
