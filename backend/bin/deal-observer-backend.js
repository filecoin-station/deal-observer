/** @import {PgPool} from '@filecoin-station/deal-observer-db' */
import assert from 'node:assert'
import { createPgPool } from '@filecoin-station/deal-observer-db'
import * as Sentry from '@sentry/node'
import timers from 'node:timers/promises'
import '../lib/instrument.js'
import { createInflux } from '../lib/telemetry.js'
import { rpcRequest } from '../lib/rpc-service/service.js'
import { fetchDealWithHighestActivatedEpoch, countStoredActiveDeals, observeBuiltinActorEvents } from '../lib/deal-observer.js'
import { countStoredActiveDealsWithPayloadState, countStoredActiveDealsWithUnresolvedPayloadCid, resolvePayloadCids } from '../lib/resolve-payload-cids.js'
import { findAndSubmitUnsubmittedDeals, submitDealsToSparkApi } from '../lib/spark-api-submit-deals.js'
import { payloadCidRequest } from '../lib/piece-indexer-service.js'
/** @import {Queryable} from '@filecoin-station/deal-observer-db' */

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

const LOOP_INTERVAL = 10 * 1000

// Filecoin will need some epochs to reach finality.
// We do not want to fetch deals that are newer than the current chain head - 940 epochs.
const finalityEpochs = 940
// The free tier of the glif rpc endpoint only allows us to go back 2000 blocks.
const maxPastEpochs = 1999
assert(finalityEpochs <= maxPastEpochs)

const pgPool = await createPgPool()
const { recordTelemetry } = createInflux(INFLUXDB_TOKEN)

const observeActorEventsLoop = async (makeRpcRequest, pgPool) => {
  while (true) {
    const start = Date.now()
    try {
      await observeBuiltinActorEvents(pgPool, makeRpcRequest, maxPastEpochs, finalityEpochs)
      const newLastInsertedDeal = await fetchDealWithHighestActivatedEpoch(pgPool)
      const numberOfStoredDeals = await countStoredActiveDeals(pgPool)
      if (INFLUXDB_TOKEN) {
        recordTelemetry('observed_deals_stats', point => {
          point.intField('last_searched_epoch', newLastInsertedDeal.activated_at_epoch)
          point.intField('number_of_stored_active_deals', numberOfStoredDeals)
        })
      }
    } catch (e) {
      console.error(e)
      Sentry.captureException(e)
    }
    const dt = Date.now() - start
    console.log(`Loop "Observe built-in actor events" took ${dt}ms`)

    if (INFLUXDB_TOKEN) {
      recordTelemetry('loop_builtin_actor_events', point => {
        point.intField('interval_ms', LOOP_INTERVAL)
        point.intField('duration_ms', dt)
      })
    }
    if (dt < LOOP_INTERVAL) {
      await timers.setTimeout(LOOP_INTERVAL - dt)
    }
  }
}

/**
 * Periodically fetches unsubmitted deals from the database and submits them to Spark API.
 *
 * @param {PgPool} pgPool
 * @param {object} args
 * @param {string} args.sparkApiBaseUrl
 * @param {string} args.sparkApiToken
 * @param {number} args.sparkApiSubmitDealsBatchSize
 */
const sparkApiSubmitDealsLoop = async (pgPool, { sparkApiBaseUrl, sparkApiToken, sparkApiSubmitDealsBatchSize }) => {
  while (true) {
    const start = Date.now()
    try {
      const { submitted, ingested, skipped } = await findAndSubmitUnsubmittedDeals(
        pgPool,
        sparkApiSubmitDealsBatchSize,
        deals => submitDealsToSparkApi(sparkApiBaseUrl, sparkApiToken, deals)
      )

      if (INFLUXDB_TOKEN) {
        recordTelemetry('submitted_deals_stats', point => {
          point.intField('submitted_deals', submitted)
          point.intField('ingested_deals', ingested)
          point.intField('skipped_deals', skipped)
        })
      }
    } catch (e) {
      console.error(e)
      Sentry.captureException(e)
    }
    const dt = Date.now() - start
    console.log(`Loop "Submit deals to spark-api" took ${dt}ms`)

    if (INFLUXDB_TOKEN) {
      recordTelemetry('loop_submit_deals_to_sparkapi', point => {
        point.intField('interval_ms', LOOP_INTERVAL)
        point.intField('duration_ms', dt)
      })
    }
    if (dt < LOOP_INTERVAL) {
      await timers.setTimeout(LOOP_INTERVAL - dt)
    }
  }
}

export const resolvePayloadCidsLoop = async (makeRpcRequest, makePayloadCidRequest, pgPool) => {
  while (true) {
    const start = Date.now()
    // Maximum number of deals to resolve payload CIDs for in one loop iteration
    const maxDeals = 1000
    try {
      const numOfPayloadCidsResolved = await resolvePayloadCids(makeRpcRequest, makePayloadCidRequest, pgPool, maxDeals)
      const totalNumOfUnresolvedPayloadCids = await countStoredActiveDealsWithUnresolvedPayloadCid(pgPool)
      const totalNumOfResolvedPayloadCidStates = await countStoredActiveDealsWithPayloadState(pgPool, 'PAYLOAD_CID_RESOLVED')
      const totalNumOfUnresolvedPayloadCidStates = await countStoredActiveDealsWithPayloadState(pgPool, 'PAYLOAD_CID_UNRESOLVED')
      const totalNumOfTerminallyUnretrievablePayloadCidStates = await countStoredActiveDealsWithPayloadState(pgPool, 'PAYLOAD_CID_TERMINALLY_UNRETRIEVABLE')
      const totalNumOfNotYetQueriedPayloadCidStates = await countStoredActiveDealsWithPayloadState(pgPool, 'PAYLOAD_CID_NOT_QUERIED_YET')
      if (INFLUXDB_TOKEN) {
        recordTelemetry('resolve_payload_cids_stats', point => {
          point.intField('total_unresolved_payload_cids', totalNumOfUnresolvedPayloadCids)
          point.intField('payload_cid_state_unresolved', totalNumOfUnresolvedPayloadCidStates)
          point.intField('payload_cid_state_resolved', totalNumOfResolvedPayloadCidStates)
          point.intField('payload_cid_state_terminally_unretrievable', totalNumOfTerminallyUnretrievablePayloadCidStates)
          point.intField('payload_cid_state_not_yet_queried', totalNumOfNotYetQueriedPayloadCidStates)
          point.intField('payload_cids_resolved', numOfPayloadCidsResolved)
        })
      }
    } catch (e) {
      console.error(e)
      Sentry.captureException(e)
    }
    const dt = Date.now() - start
    console.log(`Loop "Look up payload CIDs" took ${dt}ms`)

    // For local monitoring and debugging, we can omit sending data to InfluxDB
    if (INFLUXDB_TOKEN) {
      recordTelemetry('loop_resolve_payload_cids', point => {
        point.intField('interval_ms', LOOP_INTERVAL)
        point.intField('duration_ms', dt)
      })
    }
    if (dt < LOOP_INTERVAL) {
      await timers.setTimeout(LOOP_INTERVAL - dt)
    }
  }
}

await Promise.all([
  resolvePayloadCidsLoop(rpcRequest, payloadCidRequest, pgPool),
  observeActorEventsLoop(rpcRequest, pgPool),
  sparkApiSubmitDealsLoop(pgPool, {
    sparkApiBaseUrl: SPARK_API_BASE_URL,
    sparkApiToken: SPARK_API_TOKEN,
    sparkApiSubmitDealsBatchSize: Number(SPARK_API_SUBMIT_DEALS_BATCH_SIZE)
  })
])
