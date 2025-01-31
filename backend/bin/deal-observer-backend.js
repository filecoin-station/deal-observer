/** @import {PgPool} from '@filecoin-station/deal-observer-db' */
import assert from 'node:assert'
import { createPgPool } from '@filecoin-station/deal-observer-db'
import * as Sentry from '@sentry/node'
import timers from 'node:timers/promises'
import slug from 'slug'
import '../lib/instrument.js'
import { createInflux } from '../lib/telemetry.js'
import { getChainHead, rpcRequest } from '../lib/rpc-service/service.js'
import { fetchDealWithHighestActivatedEpoch, observeBuiltinActorEvents } from '../lib/deal-observer.js'
import { findAndSubmitUnsubmittedDeals, submitDealsToSparkApi } from '../lib/spark-api-deal-submitter.js'

const {
  INFLUXDB_TOKEN,
  SPARK_API_BASE_URL,
  SPARK_API_TOKEN,
  SPARK_API_SUBMIT_DEALS_BATCH_SIZE = 100
} = process.env

if (!INFLUXDB_TOKEN) {
  console.error('INFLUXDB_TOKEN not provided. Telemetry will not be recorded.')
}
assert(SPARK_API_BASE_URL, 'SPARK_API_BASE_URL required')
assert(SPARK_API_TOKEN, 'SPARK_API_TOKEN required')

const OBSERVE_DEALS_LOOP_INTERVAL = 10 * 1000
const SPARK_API_SUBMIT_DEALS_LOOP_INTERVAL = 10 * 1000
// Filecoin will need some epochs to reach finality.
// We do not want to fetch deals that are newer than the current chain head - 940 epochs.
const finalityEpochs = 940
// The free tier of the glif rpc endpoint only allows us to go back 2000 blocks.
const maxPastEpochs = 1999

assert(finalityEpochs <= maxPastEpochs)

const pgPool = await createPgPool()

const OBSERVE_DEALS_LOOP_NAME = 'Built-in actor events'
const SPARK_API_SUBMIT_DEALS_LOOP_NAME = 'Submit deals to spark-api'
const { recordTelemetry } = createInflux(INFLUXDB_TOKEN)

const observeActorEventsLoop = async (makeRpcRequest, pgPool) => {
  while (true) {
    const start = Date.now()
    try {
      const currentChainHead = await getChainHead(makeRpcRequest)
      const lastInsertedDeal = await fetchDealWithHighestActivatedEpoch(pgPool)
      const startEpoch = Math.max(
        currentChainHead.Height - maxPastEpochs,
        (lastInsertedDeal?.activated_at_epoch + 1) || 0
      )
      const endEpoch = currentChainHead.Height - finalityEpochs

      for (let epoch = startEpoch; epoch <= endEpoch; epoch++) {
        await observeBuiltinActorEvents(epoch, pgPool, makeRpcRequest)
      }
    } catch (e) {
      console.error(e)
      Sentry.captureException(e)
    }
    const dt = Date.now() - start
    console.log(`Loop "${OBSERVE_DEALS_LOOP_NAME}" took ${dt}ms`)

    if (INFLUXDB_TOKEN) {
      recordTelemetry(`loop_${slug(OBSERVE_DEALS_LOOP_NAME, '_')}`, point => {
        point.intField('interval_ms', OBSERVE_DEALS_LOOP_INTERVAL)
        point.intField('duration_ms', dt)
      })
    }
    if (dt < OBSERVE_DEALS_LOOP_INTERVAL) {
      await timers.setTimeout(OBSERVE_DEALS_LOOP_INTERVAL - dt)
    }
  }
}

/**
 * Periodically fetches unsubmitted deals from the database and submits them to the Spark API.
 *
 * @param {PgPool} pgPool
 * @param {object} args
 * @param {string} args.sparkApiBaseUrl
 * @param {string} args.sparkApiToken
 * @param {number} args.sparkApiSubmitDealsBatchSize
 */
const sparkApiSubmitDealsLoop = async (pgPool, { sparkApiBaseUrl, sparkApiToken, sparkApiSubmitDealsBatchSize }) => {
  const submitDeals = submitDealsToSparkApi(sparkApiBaseUrl, sparkApiToken)
  while (true) {
    const start = Date.now()
    try {
      await findAndSubmitUnsubmittedDeals(pgPool, sparkApiSubmitDealsBatchSize, submitDeals)
    } catch (e) {
      console.error(e)
      Sentry.captureException(e)
    }
    const dt = Date.now() - start
    console.log(`Loop "${SPARK_API_SUBMIT_DEALS_LOOP_NAME}" took ${dt}ms`)

    if (INFLUXDB_TOKEN) {
      recordTelemetry(`loop_${slug(SPARK_API_SUBMIT_DEALS_LOOP_NAME, '_')}`, point => {
        point.intField('interval_ms', SPARK_API_SUBMIT_DEALS_LOOP_INTERVAL)
        point.intField('duration_ms', dt)
      })
    }
    if (dt < OBSERVE_DEALS_LOOP_INTERVAL) {
      await timers.setTimeout(SPARK_API_SUBMIT_DEALS_LOOP_INTERVAL - dt)
    }
  }
}

await Promise.all([
  observeActorEventsLoop(rpcRequest, pgPool),
  sparkApiSubmitDealsLoop(pgPool, {
    sparkApiBaseUrl: SPARK_API_BASE_URL,
    sparkApiToken: SPARK_API_TOKEN,
    sparkApiSubmitDealsBatchSize: Number(SPARK_API_SUBMIT_DEALS_BATCH_SIZE)
  })
])
