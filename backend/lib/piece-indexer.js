import { loadDeals } from './deal-observer.js'
import * as util from 'node:util'
import { getMinerPeerId } from './rpc-service/service.js'

/** @import {Queryable} from '@filecoin-station/deal-observer-db' */
/** @import { Static } from '@sinclair/typebox' */
/** @import { ActiveDealDbEntry } from '@filecoin-station/deal-observer-db/lib/types.js' */

const THREE_DAYS_IN_MILLISECONDS = 1000 * 60 * 60 * 24 * 3

/**
 *
 * @param {function} makeRpcRequest
 * @param {function} getDealPayloadCid
 * @param {Queryable} pgPool
 * @param {number} maxDeals
 * @returns {Promise<void>}
 */
export const indexPieces = async (makeRpcRequest, getDealPayloadCid, pgPool, maxDeals, now = Date.now()) => {
  for (const deal of await fetchDealsWithNoPayloadCid(pgPool, maxDeals, now - THREE_DAYS_IN_MILLISECONDS)) {
    const minerPeerId = await getMinerPeerId(deal.miner_id, makeRpcRequest)
    deal.payload_cid = await getDealPayloadCid(minerPeerId, deal.piece_cid)
    if (!deal.payload_cid && deal.last_payload_retrieval) {
      deal.payload_unretrievable = true
    }
    deal.last_payload_retrieval = BigInt(now)
    await updatePayloadInActiveDeal(pgPool, deal)
  }
}

/**
   * @param {Queryable} pgPool
   * @param {number} maxDeals
   * @param {number} now
   * @returns {Promise<Array<Static< typeof ActiveDealDbEntry>>>}
   */
export async function fetchDealsWithNoPayloadCid (pgPool, maxDeals, now) {
  const query = 'SELECT * FROM active_deals WHERE payload_cid IS NULL AND payload_unretrievable IS DISTINCT FROM TRUE AND (last_payload_retrieval IS NULL OR last_payload_retrieval < $1) ORDER BY activated_at_epoch ASC LIMIT $2'
  return await loadDeals(pgPool, query, [now, maxDeals])
}

/**
 * @param {Queryable} pgPool
 * @param {Static<typeof ActiveDealDbEntry>} deal
 * @returns { Promise<void>}
 */
async function updatePayloadInActiveDeal (pgPool, deal) {
  const updateQuery = `
    UPDATE active_deals
    SET payload_cid = $1, payload_unretrievable = $2, last_payload_retrieval = $3
    WHERE activated_at_epoch = $4 AND miner_id = $5 AND client_id = $6 AND piece_cid = $7 AND piece_size = $8 AND term_start_epoch = $9 AND term_min = $10 AND term_max = $11 AND sector_id = $12
  `
  try {
    await pgPool.query(updateQuery, [
      deal.payload_cid,
      deal.payload_unretrievable,
      deal.last_payload_retrieval,
      deal.activated_at_epoch,
      deal.miner_id,
      deal.client_id,
      deal.piece_cid,
      deal.piece_size,
      deal.term_start_epoch,
      deal.term_min,
      deal.term_max,
      deal.sector_id
    ])
  } catch (error) {
    throw Error(util.format('Error updating payload of deal: ', deal), { cause: error })
  }
}
