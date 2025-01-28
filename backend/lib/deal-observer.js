/** @import {Queryable} from '@filecoin-station/deal-observer-db' */

import assert from 'node:assert'
import { getActorEvents, getActorEventsFilter } from './rpc-service/service.js'
import { storeActiveDeals } from '@filecoin-station/deal-observer-db/lib/database-access.js'

/**
 * @param {number} blockHeight
 * @param {Queryable} pgPool
 * @param {(method:string,params:object) => object} makeRpcRequest
 * @returns {Promise<void>}
 */
export async function observeBuiltinActorEvents (blockHeight, pgPool, makeRpcRequest) {
  const eventType = 'claim'
  const activeDeals = await getActorEvents(getActorEventsFilter(blockHeight, eventType), makeRpcRequest)
  assert(activeDeals !== undefined, `No ${eventType} events found in block ${blockHeight}`)
  console.log(`Observed ${activeDeals.length} ${eventType} events in block ${blockHeight}`)
  await storeActiveDeals(activeDeals, pgPool)
}
