/** @import {Queryable} from '@filecoin-station/deal-observer-db' */
/** @import { BlockEvent } from './rpc-service/data-types.js' */
/** @import { Static } from '@sinclair/typebox' */

import assert from 'node:assert'
import { getActorEvents, getActorEventsFilter } from './rpc-service/service.js'
import { ActiveDealDbEntry } from '@filecoin-station/deal-observer-db/lib/types.js'
import { Value } from '@sinclair/typebox/value'
import { fetchPayloadCid, pixRequest } from './pix-service/service.js'
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
  assert(activeDeals !== undefined, `No ${eventType} events found in block ${blockHeight}`)
  console.log(`Observed ${activeDeals.length} ${eventType} events in block ${blockHeight}`)
  const dbEntries = activeDeals.map(blockEvent => convertBlockEventTyActiveDealDbEntry(blockEvent))
  await storeActiveDeals(dbEntries, pgPool)
}

export async function updatePayloadCid (pgPool, makeRpcRequest, activeDeal, pixRequest) {
  const payloadCid = await fetchPayloadCid(activeDeal.miner_id, activeDeal.piece_cid, makeRpcRequest, pixRequest)
  activeDeal.payload = payloadCid
  await storeActiveDeals([activeDeal], pgPool)
}
