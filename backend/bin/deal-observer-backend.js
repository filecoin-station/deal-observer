import assert from 'node:assert'
import { createPgPool } from '@filecoin-station/deal-observer-db'
import * as Sentry from '@sentry/node'
import timers from 'node:timers/promises'
import slug from 'slug'
import '../lib/instrument.js'
import { createInflux } from '../lib/telemetry.js'
import { getChainHead, rpcRequest } from '../lib/rpc-service/service.js'
import { fetchDealWithHighestActivatedEpoch, observeBuiltinActorEvents } from '../lib/deal-observer.js'
import { indexPieces } from '../lib/piece-indexer.js'

const { INFLUXDB_TOKEN } = process.env
if (!INFLUXDB_TOKEN) {
  console.error('INFLUXDB_TOKEN not provided. Telemetry will not be recorded.')
}
const LOOP_INTERVAL = 10 * 1000
// Filecoin will need some epochs to reach finality.
// We do not want to fetch deals that are newer than the current chain head - 940 epochs.
const finalityEpochs = 940
const maxPastEpochs = 1999
assert(finalityEpochs <= maxPastEpochs)

const pgPool = await createPgPool()
const queryLimit = 1000
const { recordTelemetry } = createInflux(INFLUXDB_TOKEN)

const dealObserverLoop = async (makeRpcRequest, pgPool) => {
  const LOOP_NAME = 'Built-in actor events'
  while (true) {
    const start = Date.now()
    try {
      const currentChainHead = await getChainHead(makeRpcRequest)
      const currentFinalizedChainHead = currentChainHead.Height - finalityEpochs
      const currentMaxPastEpoch = currentChainHead.Height - maxPastEpochs
      // If the storage is empty we start 2000 blocks into the past as that is the furthest we can go with the public glif rpc endpoints.
      const lastInsertedDeal = await fetchDealWithHighestActivatedEpoch(pgPool)
      let startEpoch = currentFinalizedChainHead
      // The free tier of the glif rpc endpoint only allows us to go back 2000 blocks.
      // We should respect the limit and not go further back than that.
      if (lastInsertedDeal && lastInsertedDeal.activated_at_epoch + 1 >= currentMaxPastEpoch) {
        startEpoch = lastInsertedDeal.activated_at_epoch + 1
      }

      for (let epoch = startEpoch; epoch <= currentFinalizedChainHead; epoch++) {
        await observeBuiltinActorEvents(epoch, pgPool, makeRpcRequest)
      }
    } catch (e) {
      console.error(e)
      Sentry.captureException(e)
    }
    const dt = Date.now() - start
    console.log(`Loop "${LOOP_NAME}" took ${dt}ms`)

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

export const pieceIndexerLoop = async (rpcRequest, pixRequest, pgPool) => {
  const LOOP_NAME = 'Piece Indexer'
  while (true) {
    const start = Date.now()
    try {
      indexPieces(rpcRequest, pixRequest, pgPool, queryLimit)
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

await dealObserverLoop(
  rpcRequest,
  pgPool
)
