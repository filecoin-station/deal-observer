/** @import {Queryable} from '@filecoin-station/deal-observer-db' */

import assert from 'node:assert'
import { getActorEvents, getActorEventsFilter } from './rpc-service/service.js'
import { fetchPayloadCid } from './pix-service/service.js'
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

export async function updatePayloadCid (pgPool, makeRpcRequest, activeDeals, pixRequest) {
  const updatedDeals = []
  for (const deal of activeDeals) {
    const payloadCid = await fetchPayloadCid(deal.miner_id, deal.piece_cid, makeRpcRequest, pixRequest)
    deal.payload_cid = payloadCid
    updatedDeals.push(deal)
  }
  await storeActiveDeals(updatedDeals, pgPool)
}
