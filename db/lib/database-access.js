import { ActiveDealDbEntry } from "./types.js"
/** @import {Queryable} from '@filecoin-station/deal-observer-db' */
/** @import { Static } from '@sinclair/typebox' */
import { Value } from '@sinclair/typebox/value'

/**
 * @param {Static <typeof ActiveDealDbEntry>[] } activeDeals
 * @param {import("../typings.js").Queryable} pgPool
 * @returns {Promise<void>}
 * */
export async function storeActiveDeals (activeDeals, pgPool) {
    const startInserting = Date.now()
    try {
      // Insert deals in a batch
      const insertQuery = `
          INSERT INTO active_deals (
            activated_at_epoch,
            miner_id,
            client_id,
            piece_cid,
            piece_size,
            term_start_epoch,
            term_min,
            term_max,
            sector_id,
            payload_cid
          )
          VALUES (
            unnest($1::int[]),
            unnest($2::int[]), 
            unnest($3::int[]), 
            unnest($4::text[]), 
            unnest($5::bigint[]), 
            unnest($6::int[]), 
            unnest($7::int[]), 
            unnest($8::int[]), 
            unnest($9::bigint[]),
            unnest($10::text[])
          )
          ON CONFLICT (
            activated_at_epoch,
            miner_id,
            client_id,
            piece_cid,
            piece_size,
            term_start_epoch,
            term_min,
            term_max,
            sector_id) DO UPDATE SET
          payload_cid = EXCLUDED.payload_cid
        `
      await pgPool.query(insertQuery, [
        activeDeals.map(deal => deal.activated_at_epoch),
        activeDeals.map(deal => deal.miner_id),
        activeDeals.map(deal => deal.client_id),
        activeDeals.map(deal => deal.piece_cid),
        activeDeals.map(deal => deal.piece_size),
        activeDeals.map(deal => deal.term_start_epoch),
        activeDeals.map(deal => deal.term_min),
        activeDeals.map(deal => deal.term_max),
        activeDeals.map(deal => deal.sector_id),
        activeDeals.map(deal => deal.payload_cid)
      ])
  
      // Commit the transaction if all inserts are successful
      console.log(`Inserting ${activeDeals.length} deals took ${Date.now() - startInserting}ms`)
    } catch (error) {
      // If any error occurs, roll back the transaction
      // TODO: Add sentry entry for this error
      // https://github.com/filecoin-station/deal-observer/issues/28
      console.error('Error inserting deals:', error.message)
    }
  }
  
  /**
   * @param {Queryable} pgPool
   * @param {string} query
   * @returns {Promise<Array<ActiveDealDbEntry>>}
   */
  async function loadDeals (pgPool, query) {
    const result = (await pgPool.query(query)).rows.map(deal => {
      // SQL used null, typebox needs undefined for null values
      Object.keys(deal).forEach(key => {
        if (deal[key] === null) {
          deal[key] = undefined
        }
      })
      return Value.Parse(ActiveDealDbEntry, deal)
    }
    )
    return result
  }

  /**
 * @param {Queryable} pgPool
 * @returns {Promise<ActiveDealDbEntry | undefined>}
 */
export async function fetchDealWithHighestActivatedEpoch (pgPool) {
    const query = 'SELECT * FROM active_deals ORDER BY activated_at_epoch DESC LIMIT 1'
    const result = await loadDeals(pgPool, query)
    return result.length > 0 ? result[0] : undefined
  }
  
  /**
   * @param {Queryable} pgPool
   * @returns {Promise<ActiveDealDbEntry | undefined>}
   */
  export async function fetchDealWithLowestActivatedEpoch (pgPool) {
    const query = 'SELECT * FROM active_deals ORDER BY activated_at_epoch ASC LIMIT 1'
    const result = await loadDeals(pgPool, query)
    return result.length > 0 ? result[0] : undefined
  }
  
  /**
   * @param {Queryable} pgPool
   * @param {number} fromBlockHeight
   * @returns {Promise<ActiveDealDbEntry>}
   */
  export async function fetchNextDealWithNoPayloadCid (pgPool, fromBlockHeight) {
    const query = `SELECT * FROM active_deals WHERE payload_cid IS NULL AND activated_at_epoch >= ${fromBlockHeight} ORDER BY activated_at_epoch ASC LIMIT 1`
    const result = await loadDeals(pgPool, query)
    return result.length > 0 ? result[0] : undefined
  }
  