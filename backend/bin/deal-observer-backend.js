import assert from 'node:assert'
import { createPgPool } from '@filecoin-station/deal-observer-db'
import * as Sentry from '@sentry/node'
import timers from 'node:timers/promises'
import slug from 'slug'
import '../lib/instrument.js'
import { createInflux } from '../lib/telemetry.js'
import { getChainHead, rpcRequest } from '../lib/rpc-service/service.js'
import { fetchDealWithHighestActivatedEpoch, observeBuiltinActorEvents } from '../lib/deal-observer.js'
import { findAndSubmitEligibleDeals, submitEligibleDeals } from '../lib/deal-submitter.js'

const {
  INFLUXDB_TOKEN,
  SPARK_API_BASE_URL,
  DEAL_INGESTER_TOKEN
} = process.env

if (!INFLUXDB_TOKEN) {
  console.error('INFLUXDB_TOKEN not provided. Telemetry will not be recorded.')
}
assert(SPARK_API_BASE_URL, 'SPARK_API_BASE_URL required')
assert(DEAL_INGESTER_TOKEN, 'DEAL_INGESTER_TOKEN required')

const DEAL_OBSERVER_LOOP_INTERVAL = 10 * 1000
const DEAL_SUBMITTER_LOOP_INTERVAL = 10 * 1000
// Filecoin will need some epochs to reach finality.
// We do not want to fetch deals that are newer than the current chain head - 940 epochs.
const finalityEpochs = 940
const maxPastEpochs = 1999

assert(finalityEpochs <= maxPastEpochs)
const pgPool = await createPgPool()

const DEAL_OBSERVER_LOOP_NAME = 'Built-in actor events'
const DEAL_SUBMITTER_LOOP_NAME = 'Deal submission'
const { recordTelemetry } = createInflux(INFLUXDB_TOKEN)

const dealObserverLoop = async (makeRpcRequest, pgPool) => {
  while (true) {
    const start = Date.now()
    try {
      const currentChainHead = await getChainHead(makeRpcRequest)
      const currentFinalizedChainHead = currentChainHead.Height - finalityEpochs
      // If the storage is empty we start 2000 blocks into the past as that is the furthest we can go with the public glif rpc endpoints.
      const lastInsertedDeal = await fetchDealWithHighestActivatedEpoch(pgPool)
      const lastEpochStored = lastInsertedDeal ? lastInsertedDeal.height : currentChainHead.Height - maxPastEpochs
      for (let epoch = lastEpochStored + 1; epoch <= currentFinalizedChainHead; epoch++) {
        await observeBuiltinActorEvents(epoch, pgPool, makeRpcRequest)
      }
    } catch (e) {
      console.error(e)
      Sentry.captureException(e)
    }
    const dt = Date.now() - start
    console.log(`Loop "${DEAL_OBSERVER_LOOP_NAME}" took ${dt}ms`)

    if (INFLUXDB_TOKEN) {
      recordTelemetry(`loop_${slug(DEAL_OBSERVER_LOOP_NAME, '_')}`, point => {
        point.intField('interval_ms', DEAL_OBSERVER_LOOP_INTERVAL)
        point.intField('duration_ms', dt)
      })
    }
    if (dt < DEAL_OBSERVER_LOOP_INTERVAL) {
      await timers.setTimeout(DEAL_OBSERVER_LOOP_INTERVAL - dt)
    }
  }
}

const dealSubmitterLoop = async (pgPool, sparkApiBaseURL, dealIngestionAccessToken) => {
  while (true) {
    const start = Date.now()
    try {
      await findAndSubmitEligibleDeals(pgPool, sparkApiBaseURL, dealIngestionAccessToken, submitEligibleDeals)
    } catch (e) {
      console.error(e)
      Sentry.captureException(e)
    }
    const dt = Date.now() - start
    console.log(`Loop "${DEAL_SUBMITTER_LOOP_NAME}" took ${dt}ms`)

    if (INFLUXDB_TOKEN) {
      recordTelemetry(`loop_${slug(DEAL_SUBMITTER_LOOP_NAME, '_')}`, point => {
        point.intField('interval_ms', DEAL_SUBMITTER_LOOP_INTERVAL)
        point.intField('duration_ms', dt)
      })
    }
    if (dt < DEAL_OBSERVER_LOOP_INTERVAL) {
      await timers.setTimeout(DEAL_SUBMITTER_LOOP_INTERVAL - dt)
    }
  }
}

await Promise.all([
  dealObserverLoop(rpcRequest, pgPool),
  dealSubmitterLoop(pgPool, SPARK_API_BASE_URL, DEAL_INGESTER_TOKEN)
])
