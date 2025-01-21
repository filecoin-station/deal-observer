/** @import {Queryable} from '@filecoin-station/deal-observer-db' */
/** @import {Provider} from 'ethers' */
import assert from 'node:assert'
import { parse } from '@ipld/dag-json'
import { ActorEventFilter, RpcApiClient } from './rpc-service/service.js'

class DealObserver {
  #pgPool
  #rpcApiClient

  constructor (pgPool) {
    // TODO: Store events in pgPool
    this.#pgPool = pgPool
    this.#rpcApiClient = new RpcApiClient()
  }

  async getChainHead () {
    return await this.#rpcApiClient.getChainHead()
  }

  async observeBuiltinActorEvents (blockHeight) {
    const eventType = 'claim'
    const activeDeals = await this.#rpcApiClient.getActorEvents(new ActorEventFilter(blockHeight, eventType))
    assert(activeDeals !== undefined, `No ${eventType} events found in block ${blockHeight}`)
    console.log(`Observed ${activeDeals.size} ${eventType} events in block ${blockHeight}`)
    await this.storeActiveDeals(activeDeals)
  }

  async fetchDealWithHighestActivatedEpoch() {
    const query = 'SELECT * FROM active_deals ORDER BY activated_at_epoch DESC LIMIT 1'
    const result = await this.#pgPool.query(query)
    console.log('Fetched deals: %o', result.rows[0])
    return result.rows.length > 0 ? result.rows[0] : null
  }
  
 async fetchDealByBlockHeight (fromHeight, toHeight = fromHeight) {
  assert(typeof fromHeight === 'number', 'fromHeight must be a number')
  assert(typeof toHeight === 'number', 'toHeight must be a number')
  this.#fetchActiveDealsByKeyValue([{key: 'activated_at_epoch',cmp: ">=" ,value: fromHeight},{key: 'activated_at_epoch',cmp: "<=" ,value: toHeight}])
 }

  async #fetchActiveDealsByKeyValue(searchParams){
    function buildQuery(baseQuery, conditions) {
      const queryParts = [];

      // Iterate through conditions and build the WHERE clauses dynamically
      conditions.forEach(({key,value,cmp}) => {        
        // Add the condition to the queryParts array
        queryParts.push(`${key} ${cmp} ${value}`);
      });

      // Combine base query with dynamically built WHERE clause
      const finalQuery = queryParts.length > 0 ? `${baseQuery} ${queryParts.join(' AND ')}` : baseQuery;

      return finalQuery;
    }
    const client = await this.#pgPool.connect();
    const baseQuery = "SELECT * FROM active_deals WHERE";
    const query = buildQuery(baseQuery, searchParams);
    let result = await client.query(query)
    result = parse(result)
    client.release();
    return result
  }

  async storeActiveDeals (activeDeals) {
    let transformedDeals = [...activeDeals].map((deal) => ({
      activated_at_epoch: deal.height,
      miner: deal.event.provider,
      client: deal.event.client,
      piece_cid: deal.event.pieceCid,
      piece_size: deal.event.pieceSize,
      term_start_epoch: deal.event.termStart,
      term_min: deal.event.termMin,
      term_max: deal.event.termMax,
      sector: deal.event.sector,
      payload_cid: null,
    }))
    
      let time0 = Date.now()
      try {
      // Start a transaction
        // Insert deals in a batch
        const insertQuery = `
        INSERT INTO active_deals (
          activated_at_epoch,
          miner,
          client,
          piece_cid,
          piece_size,
          term_start_epoch,
          term_min,
          term_max,
          sector
        )
        VALUES (unnest($1::int[]), unnest($2::int[]), unnest($3::int[]), unnest($4::text[]), unnest($5::bigint[]), unnest($6::int[]), unnest($7::int[]), unnest($8::int[]), unnest($9::bigint[]))
      `
      let time2 = Date.now()
        await this.#pgPool.query(insertQuery, [
          transformedDeals.map(deal => deal.activated_at_epoch),
          transformedDeals.map(deal => deal.miner),
          transformedDeals.map(deal => deal.client),
          transformedDeals.map(deal => deal.piece_cid),
          transformedDeals.map(deal => deal.piece_size),
          transformedDeals.map(deal => deal.term_start_epoch),
          transformedDeals.map(deal => deal.term_min),
          transformedDeals.map(deal => deal.term_max),
          transformedDeals.map(deal => deal.sector),
        ])

        console.log(`Loop of inserting took ${Date.now()-time2}ms`)
        // Commit the transaction if all inserts are successful
        let time1 = Date.now()
        console.log(`Inserting ${activeDeals.size} deals took ${time1-time0}ms`)
      } catch (error) {
      // If any error occurs, roll back the transaction
        console.error('Error inserting deals. Rolling back:', error.message)
      }
    }
  }


export { DealObserver }


