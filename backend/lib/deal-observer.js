/** @import {Queryable} from '@filecoin-station/deal-observer-db' */
/** @import { BlockEvent } from './rpc-service/data-types.js' */
import assert from 'node:assert'
import { getActorEvents, getActorEventsFilter } from './rpc-service/service.js'
import { ActiveDealDbEntry } from '@filecoin-station/deal-observer-db/lib/types.js'
import { Value } from '@sinclair/typebox/value'
import { fromJSON, toJSON } from 'multiformats/cid'

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
  let g = JSON.stringify(activeDeals)
  await storeActiveDeals(activeDeals, pgPool)
}

/**
 * @param {Queryable} pgPool
 * @returns {Promise<ActiveDealDbEntry | null>}
 */
export async function fetchDealWithHighestActivatedEpoch (pgPool) {
  const query = 'SELECT * FROM active_deals ORDER BY activated_at_epoch DESC LIMIT 1'
  const result = (await pgPool.query(query)).rows.map((row) => {
    const parsedRow = Value.Parse(ActiveDealDbEntry, row)
    parsedRow.piece_cid = fromJSON(JSON.parse(parsedRow.piece_cid))
    return parsedRow
  })
  return result.length > 0 ? result[0] : null
}

export async function fetchDealsWithNoPayloadCid (pgPool) {
  const query = 'SELECT * FROM active_deals WHERE payload_cid IS NULL'
  return await parseDeals(pgPool, query)
}

/**
 * @param {Array<BlockEvent>} activeDeals
 * @param {Queryable} pgPool
 * @returns {Promise<void>}
 * */
export async function storeActiveDeals (activeDeals, pgPool) {
  const transformedDeals = activeDeals.map((deal) => (
    {
      activated_at_epoch: deal.height,
      miner_id: deal.event.provider,
      client_id: deal.event.client,
      piece_cid: toJSON(deal.event.pieceCid),
      piece_size: deal.event.pieceSize,
      term_start_epoch: deal.event.termStart,
      term_min: deal.event.termMin,
      term_max: deal.event.termMax,
      sector_id: deal.event.sector,
      payload_cid: null
    }))

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

    // Commit the transaction if all inserts are successful
    console.log(`Inserting ${activeDeals.length} deals took ${Date.now() - startInserting}ms`)
  } catch (error) {
    // If any error occurs, roll back the transaction
    console.error('Error inserting deals:', error.message)
  }
}

/**
 * @param { string } query 
 * @param { Queryable } pgPool 
 * @returns { Promise<ActiveDealDbEntry> }
 */
async function parseDeals(pgPool, query) {
  const result = (await pgPool.query(query)).rows.map((row) => {
    const parsedRow = Value.Parse(ActiveDealDbEntry, row)
    parsedRow.piece_cid = fromJSON(JSON.parse(parsedRow.piece_cid))
    return parsedRow
  })
  return result
}