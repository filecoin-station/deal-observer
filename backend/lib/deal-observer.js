/** @import {Queryable} from '@filecoin-station/deal-observer-db' */
/** @import { BlockEvent } from './rpc-service/data-types.js' */
/** @import { Static } from '@sinclair/typebox' */

import { getActorEvents, getActorEventsFilter } from './rpc-service/service.js'
import { ActiveDealDbEntry } from '@filecoin-station/deal-observer-db/lib/types.js'
import { Value } from '@sinclair/typebox/value'

/**
 * @param {number} blockHeight
 * @param {Queryable} pgPool
 * @param {(method:string,params:object) => object} makeRpcRequest
 * @returns {Promise<void>}
 */
export async function observeBuiltinActorEvents (blockHeight, pgPool, makeRpcRequest) {
  const eventType = 'claim'
  const activeDeals = await getActorEvents(getActorEventsFilter(blockHeight, eventType), makeRpcRequest)
  if (activeDeals.length > 0) {
    console.log(`Observed ${activeDeals.length} ${eventType} events in block ${blockHeight}`)
  }
  await storeActiveDeals(activeDeals, pgPool)
}

/**
 * @param {Queryable} pgPool
 * @returns {Promise<ActiveDealDbEntry | null>}
 */
export async function fetchDealWithHighestActivatedEpoch (pgPool) {
  const query = 'SELECT * FROM active_deals ORDER BY activated_at_epoch DESC LIMIT 1'
  const result = await loadDeals(pgPool, query)
  return result.length > 0 ? result[0] : null
}

/**
 * @param {Static<typeof BlockEvent>[]} activeDeals
 * @param {Queryable} pgPool
 * @returns {Promise<void>}
 * */
export async function storeActiveDeals (activeDeals, pgPool) {
  const transformedDeals = activeDeals.map((deal) => (
    {
      activated_at_epoch: deal.height,
      miner_id: deal.event.provider,
      client_id: deal.event.client,
      piece_cid: deal.event.pieceCid,
      piece_size: deal.event.pieceSize,
      term_start_epoch: deal.event.termStart,
      term_min: deal.event.termMin,
      term_max: deal.event.termMax,
      sector_id: deal.event.sector,
      payload_cid: null
    }))

  try {
    const startInserting = Date.now()
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
          sector_id
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
          unnest($9::bigint[])
        )
      `
    await pgPool.query(insertQuery, [
      transformedDeals.map(deal => deal.activated_at_epoch),
      transformedDeals.map(deal => deal.miner_id),
      transformedDeals.map(deal => deal.client_id),
      transformedDeals.map(deal => deal.piece_cid),
      transformedDeals.map(deal => deal.piece_size),
      transformedDeals.map(deal => deal.term_start_epoch),
      transformedDeals.map(deal => deal.term_min),
      transformedDeals.map(deal => deal.term_max),
      transformedDeals.map(deal => deal.sector_id)
    ])
    if (activeDeals.length > 0) {
      console.log(`Inserted ${activeDeals.length} deals in ${Date.now() - startInserting} ms`)
    }
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
    return Value.Parse(ActiveDealDbEntry, deal)
  }
  )
  return result
}
