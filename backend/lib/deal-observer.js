/** @import {Queryable} from '@filecoin-station/deal-observer-db' */

import { getActorEvents, getActorEventsFilter } from './rpc-service/service.js'
import { storeActiveDeals } from '@filecoin-station/deal-observer-db/lib/database-access.js'
import { convertBlockEventTyActiveDealDbEntry } from './utils.js'

/**
 * @param {number} blockHeight
 * @param {Queryable} pgPool
 * @param {(method:string,params:object) => object} makeRpcRequest
 * @returns {Promise<void>}
 */
export async function observeBuiltinActorEvents (blockHeight, pgPool, makeRpcRequest) {
  const eventType = 'claim'
  const activeDeals = await getActorEvents(getActorEventsFilter(blockHeight, eventType), makeRpcRequest)
  if (activeDeals.length && activeDeals.length > 0) {
    console.log(`Observed ${activeDeals.length} ${eventType} events in block ${blockHeight}`)
    const dbEntries = activeDeals.map(blockEvent => convertBlockEventTyActiveDealDbEntry(blockEvent))
    await storeActiveDeals(dbEntries, pgPool)
  }
}
