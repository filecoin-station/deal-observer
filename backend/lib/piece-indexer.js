import { fetchPayloadCid } from './pix-service/service.js'
import { parseDeals, storeActiveDeals } from './deal-observer.js'

/** @import {Queryable} from '@filecoin-station/deal-observer-db' */
/** @import { Static } from '@sinclair/typebox' */
/** @import { ActiveDealDbEntry } from '@filecoin-station/deal-observer-db/lib/types.js' */

/**
 * @param {import("@filecoin-station/deal-observer-db").Queryable} pgPool
 * @param {function} makeRpcRequest
 * @param {function} pixRequest
 * @returns {Promise<void>}
 */
export async function updatePayloadCids(pgPool, makeRpcRequest, activeDeals, pixRequest) {
    const updatedDeals = []
    for (const deal of activeDeals) {
        const payloadCid = await fetchPayloadCid(deal.miner_id, deal.piece_cid, makeRpcRequest, pixRequest)
        deal.payload_cid = payloadCid
        updatedDeals.push(deal)
    }
    await storeActiveDeals(updatedDeals, pgPool)
}

/**
 *
 * @param {function} rpcRequest
 * @param {function} pixRequest
 * @param {Queryable} pgPool
 * @param {number} queryLimit
 * @returns {Promise<void>}
 */
export const pieceIndexerLoopFunction = async (rpcRequest, pixRequest, pgPool, queryLimit) => {
    // TODO: handle payloads which cannot be retrieved from the piece CID indexer
    const dealsWithMissingPayloadCid = await fetchDealsWithNoPayloadCid(pgPool, queryLimit)
    if (dealsWithMissingPayloadCid !== null && dealsWithMissingPayloadCid) {
        await updatePayloadCids(pgPool, rpcRequest, dealsWithMissingPayloadCid, pixRequest)
    }
}

/**
   * @param {Queryable} pgPool
   * @param {number} limit
   * @returns {Promise<Array<Static< typeof ActiveDealDbEntry>>>}
   */
export async function fetchDealsWithNoPayloadCid(pgPool, limit) {
    const query = `SELECT * FROM active_deals WHERE payload_cid IS NULL ORDER BY activated_at_epoch ASC LIMIT ${limit}`
    const result = await parseDeals(pgPool, query)
    return result
}
