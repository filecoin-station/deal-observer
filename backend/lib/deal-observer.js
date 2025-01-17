/** @import {Queryable} from '@filecoin-station/deal-observer-db' */
/** @import {Provider} from 'ethers' */
import { parse } from '@ipld/dag-json'
import assert from 'node:assert'

import { ActorEventFilter, RpcApiClient } from './rpc-service/service.js'

class DealObserver {
  #pgPool
  #rpcApiClient
  #cache

  constructor (pgPool, chainHead) {
    // TODO: Store events in pgPool
    this.#pgPool = pgPool
    this.#cache = new Map()
    this.#cache.set('lastStoredHeight', null)
  }

  async build () {
    this.#rpcApiClient = await RpcApiClient.create()
    return this
  }

  static async create (pgPool = null, chainHead = null) {
    const observer = new DealObserver(pgPool)
    return await observer.build()
  }

  async getChainHead () {
    return await this.#rpcApiClient.getChainHead()
  }

  async observeBuiltinActorEvents (blockHeight, eventType = 'claim') {
    let activeDeals = await this.#rpcApiClient.getActorEvents(new ActorEventFilter(blockHeight, eventType))
    assert(activeDeals != undefined, `No ${eventType} events found in block ${blockHeight}`)
    await this.storeActiveDeals(activeDeals)
    // Update the last stored height in the cache
    this.#cache.set('lastStoredHeight', activeDeals.length > 0 ? activeDeals[activeDeals.length - 1].height : blockHeight)
  }

  async getLastStoredHeight () {
    const cachedLastStoredHeight = this.#cache.get('lastStoredHeight');
    if (!cachedLastStoredHeight){
      let latestDeal = await this.fetchDealWithHighestActivatedEpoch();
      return latestDeal? latestDeal.height : null;
    }
    return cachedLastStoredHeight
  }

  async fetchDealWithHighestActivatedEpoch(){
    const client = await this.#pgPool.connect();
    const query = "SELECT * FROM active_deals ORDER BY activated_at_epoch DESC LIMIT 1";
    const result = await client.query(query);
    client.release();
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  async storeActiveDeals(activeDeals){
    const client = await this.#pgPool.connect();
    try {
      // Start a transaction
      await client.query('BEGIN');
  
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
          sector,
          payload_cid
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9 ,$10)
      `;
      
      // Loop through the deals array and execute the insert query for each deal
      for (const deal of activeDeals) {        
        await client.query(insertQuery, [
          deal.height,
          deal.event.provider,
          deal.event.client,
          deal.event.pieceCid,
          deal.event.pieceSize,
          deal.event.termStart,
          deal.event.termMin,
          deal.event.termMax,
          deal.event.sector,
          null
        ]);
      }
  
      // Commit the transaction if all inserts are successful
      await client.query('COMMIT');
      console.log('All deals inserted successfully.');
      
    } catch (error) {
      // If any error occurs, roll back the transaction
      await client.query('ROLLBACK');
      console.error('Error inserting deals. Rolling back:', error.message);
    } finally {
      // Release the client back to the pool
      client.release();
    }
  }
  async fetchActiveDealsByKey(searchParams){
    function buildQuery(baseQuery, conditions) {
      const queryParts = [];
      
      // Iterate through conditions and build the WHERE clauses dynamically
      conditions.forEach(({key,value}) => {        
        // Add the condition to the queryParts array
        queryParts.push(`${key} = ${value}`);
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
}

export { DealObserver }