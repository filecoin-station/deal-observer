import { loadDeals } from './deal-observer.js'
import * as util from 'node:util'
import { getMinerPeerId } from './rpc-service/service.js'

/** @import {Queryable} from '@filecoin-station/deal-observer-db' */
/** @import { Static } from '@sinclair/typebox' */
/** @import { ActiveDealDbEntry } from '@filecoin-station/deal-observer-db/lib/types.js' */

/**
 *
 * @param {function} makeRpcRequest
 * @param {function} getDealPayloadCid
 * @param {Queryable} pgPool
 * @param {number} maxDeals
 * @returns {Promise<number>}
 */
export const indexPieces = async (makeRpcRequest, getDealPayloadCid, pgPool, maxDeals) => {
  let missingPayloadCidsResolved = 0
  for (const deal of await fetchDealsWithNoPayloadCid(pgPool, maxDeals)) {
    const minerPeerId = await getMinerPeerId(deal.miner_id, makeRpcRequest)
    const payloadCid = await getDealPayloadCid(minerPeerId, deal.piece_cid)
    if (payloadCid) {
      deal.payload_cid = payloadCid
      await updatePayloadInActiveDeal(pgPool, deal)
      missingPayloadCidsResolved++
    }
  }
  return missingPayloadCidsResolved
}

/**
   * @param {Queryable} pgPool
   * @param {number} maxDeals
   * @returns {Promise<Array<Static< typeof ActiveDealDbEntry>>>}
   */
export async function fetchDealsWithNoPayloadCid (pgPool, maxDeals) {
  const query = 'SELECT * FROM active_deals WHERE payload_cid IS NULL ORDER BY activated_at_epoch ASC LIMIT $1'
  return await loadDeals(pgPool, query, [maxDeals])
}

export async function countStoredActiveDealsWithMissingPayloadCid (pgPool) {
  const query = 'SELECT COUNT(*) FROM active_deals WHERE payload_cid IS NULL'
  const result = await pgPool.query(query)
  return result.rows[0].count
}

/**
 * @param {Queryable} pgPool
 * @param {Static<typeof ActiveDealDbEntry>} deal
 * @returns { Promise<void>}
 */
async function updatePayloadInActiveDeal (pgPool, deal) {
  const updateQuery = `
    UPDATE active_deals
    SET payload_cid = $1
    WHERE activated_at_epoch = $2 AND miner_id = $3 AND client_id = $4 AND piece_cid = $5 AND piece_size = $6 AND term_start_epoch = $7 AND term_min = $8 AND term_max = $9 AND sector_id = $10
  `
  try {
    await pgPool.query(updateQuery, [
      deal.payload_cid,
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
