import { fetchDealWithHighestActivatedEpoch, observeBuiltinActorEvents } from './deal-observer.js'
import { getChainHead } from './rpc-service/service.js'
import timers from 'node:timers/promises'
import slug from 'slug'
/** @import {Queryable} from '@filecoin-station/deal-observer-db' */
/** @import {Point} from '@influxdata/influxdb-client' */

/**
 * @param {(method:string,params:object) => object} makeRpcRequest
 * @param {Queryable} pgPool
 * @param {(name: string, fn: (p: Point) => void) => void} recordTelemetry
 * @param {import("@sentry/node")} Sentry
 * @param {number} maxPastEpochs
 * @param {number} finalityEpochs
 * @param {number} loopInterval
 * @param {string | undefined} influxToken
 * @returns {Promise<void>}
 * */
export const dealObserverLoop = async (makeRpcRequest, pgPool, recordTelemetry, Sentry, maxPastEpochs, finalityEpochs, loopInterval, influxToken, signal) => {
  const LOOP_NAME = 'Built-in actor events'

  while (!signal?.aborted) {
    const start = Date.now()
    try {
      const currentChainHead = await getChainHead(makeRpcRequest)
      const currentFinalizedChainHead = currentChainHead.Height - finalityEpochs
      // If the storage is empty we start 2000 blocks into the past as that is the furthest we can go with the public glif rpc endpoints.
      const lastInsertedDeal = await fetchDealWithHighestActivatedEpoch(pgPool)
      const lastEpochStored = lastInsertedDeal ? lastInsertedDeal.activated_at_epoch : currentChainHead.Height - maxPastEpochs
      for (let epoch = lastEpochStored + 1; epoch <= currentFinalizedChainHead; epoch++) {
        await observeBuiltinActorEvents(epoch, pgPool, makeRpcRequest)
      }
    } catch (e) {
      console.error(e)
      Sentry.captureException(e)
    }
    const dt = Date.now() - start
    console.log(`Loop "${LOOP_NAME}" took ${dt}ms`)

    if (influxToken) {
      recordTelemetry(`loop_${slug(LOOP_NAME, '_')}`, point => {
        point.intField('interval_ms', loopInterval)
        point.intField('duration_ms', dt)
      })
    }
    if (dt < loopInterval) {
      await timers.setTimeout(loopInterval - dt)
    }
  }
}
