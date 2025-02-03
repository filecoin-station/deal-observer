import { loadDeals } from './deal-observer.js'
import * as util from 'node:util'
import { getMinerPeerId } from './rpc-service/service.js'
import assert from 'node:assert'

/** @import {Queryable} from '@filecoin-station/deal-observer-db' */
/** @import { Static } from '@sinclair/typebox' */
/** @import { ActiveDealDbEntry } from '@filecoin-station/deal-observer-db/lib/types.js' */
/** @import * as NodeCache from 'node-cache' */

const EIGHT_HOURS_IN_MILLISECONDS = 1000 * 60 * 60 * 8
const MAX_RETRIES = 4

/**
 *
 * @param {function} makeRpcRequest
 * @param {function} getDealPayloadCid
 * @param {Queryable} pgPool
 * @param {number} maxDeals
 * @param {NodeCache} cache
 * @returns {Promise<void>}
 */
export const indexPieces = async (makeRpcRequest, getDealPayloadCid, pgPool, maxDeals, cache, now = Date.now()) => {
  for (const deal of await fetchDealsWithNoPayloadCid(pgPool, maxDeals)) {
    const minerPeerId = await getMinerPeerId(deal.miner_id, makeRpcRequest)
    const cacheKey = JSON.stringify({ minerPeerId, pieceCid: deal.piece_cid })
    if (cache.has(cacheKey)) {
      await checkCacheForRetrievablePayloads(minerPeerId, deal, getDealPayloadCid, cache, now)
    } else {
      deal.payload_cid = await getDealPayloadCid(minerPeerId, deal.piece_cid)
      if (!deal.payload_cid) {
        cache.set(cacheKey, { retriesLeft: MAX_RETRIES, lastRetry: now })
      } else {
        deal.payload_unretrievable = false
      }
    }
    if (deal.payload_cid || deal.payload_unretrievable) {
      await updatePayloadInActiveDeal(pgPool, deal)
    }
  }
}

export async function checkCacheForRetrievablePayloads (minerPeerId, deal, getDealPayloadCid, cache, now) {
  const cacheKey = JSON.stringify({ minerPeerId, pieceCid: deal.piece_cid })
  let { retriesLeft, lastRetry } = cache.get(cacheKey)
  assert(retriesLeft > 0)
  // We retry to fetch a payload if there are retries left and the last retry was more than 8 hours ago
  if (lastRetry <= now - EIGHT_HOURS_IN_MILLISECONDS) {
    deal.payload_cid = await getDealPayloadCid(minerPeerId, deal.pieceCid)
    if (deal.payload_cid) {
      deal.payload_unretrievable = false
      cache.del(cacheKey)
    } else {
      retriesLeft = retriesLeft - 1
      if (retriesLeft === 0) {
        deal.payload_unretrievable = true
        cache.del(cacheKey)
      } else {
        cache.set(cacheKey, { retriesLeft, lastRetry: now })
      }
    }
  }
}

/**
   * @param {Queryable} pgPool
   * @param {number} maxDeals
   * @returns {Promise<Array<Static< typeof ActiveDealDbEntry>>>}
   */
export async function fetchDealsWithNoPayloadCid (pgPool, maxDeals) {
  const query = 'SELECT * FROM active_deals WHERE payload_cid IS NULL AND (payload_unretrievable IS NULL OR  payload_unretrievable = FALSE) ORDER BY activated_at_epoch ASC LIMIT $1'
  return await loadDeals(pgPool, query, [maxDeals])
}

/**
 * @param {Queryable} pgPool
 * @param {Static<typeof ActiveDealDbEntry>} deal
 * @returns { Promise<void>}
 */
async function updatePayloadInActiveDeal (pgPool, deal) {
  const updateQuery = `
    UPDATE active_deals
    SET payload_cid = $1, payload_unretrievable = $2
    WHERE activated_at_epoch = $3 AND miner_id = $4 AND client_id = $5 AND piece_cid = $6 AND piece_size = $7 AND term_start_epoch = $8 AND term_min = $9 AND term_max = $10 AND sector_id = $11
  `
  try {
    await pgPool.query(updateQuery, [
      deal.payload_cid,
      deal.payload_unretrievable,
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
