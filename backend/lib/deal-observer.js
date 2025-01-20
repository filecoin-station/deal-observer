/** @import {Queryable} from '@filecoin-station/deal-observer-db' */
/** @import {Provider} from 'ethers' */
import assert from 'node:assert'

import { ActorEventFilter, RpcApiClient } from './rpc-service/service.js'
const NUM_CACHED_DEALS = 1000

class DealObserver {
  #pgPool
  #rpcApiClient
  #cache

  constructor (pgPool) {
    // TODO: Store events in pgPool
    this.#pgPool = pgPool
    this.#cache = new Map()
    this.#cache.set('activeDeals', new Set())
  }

  async build () {
    this.#rpcApiClient = await RpcApiClient.create()
    return this
  }

  static async create (pgPool = null) {
    const observer = new DealObserver(pgPool)
    return await observer.build()
  }

  async getChainHead () {
    return await this.#rpcApiClient.getChainHead()
  }

  async observeBuiltinActorEvents (blockHeight, eventType = 'claim') {
    const activeDeals = await this.#rpcApiClient.getActorEvents(new ActorEventFilter(blockHeight, eventType))
    assert(activeDeals !== undefined, `No ${eventType} events found in block ${blockHeight}`)
    console.log(`Observed ${activeDeals.size} ${eventType} events in block ${blockHeight}`)
    await this.storeActiveDeals(activeDeals)
  }

  async fetchDealWithHighestActivatedEpoch () {
    // The cache always contains the latest active deals that were fetched. If the cache is not empty, return the last stored deal.
    if (this.#cache.get('activeDeals').size > 0) {
      const lastStoredDeal = [...this.#cache.get('activeDeals')].sort((a, b) => a.height - b.height).slice(-1)
      return lastStoredDeal
    }

    const client = await this.#pgPool.connect()
    const query = 'SELECT * FROM active_deals ORDER BY activated_at_epoch DESC LIMIT 1'
    const result = await client.query(query)
    client.release()
    return result.rows.length > 0 ? result.rows[0] : null
  }

  async storeActiveDeals (activeDeals) {
    console.log(`Storing ${activeDeals.length} active deals in the cache.`)
    this.#cache.set('activeDeals', new Set([...this.#cache.get('activeDeals'), ...activeDeals]))
    console.log(`Cached active deals: ${Array.from(this.#cache.get('activeDeals')).length}`)
    
    if (this.#cache.get('activeDeals').size >= NUM_CACHED_DEALS) {
      const client = await this.#pgPool.connect()
      try {
      // Start a transaction
        await client.query('BEGIN')

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
      `

        // Loop through the deals array and execute the insert query for each deal
        for (const deal of this.#cache.get('activeDeals')) {
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
          ])
        }

        // Commit the transaction if all inserts are successful
        await client.query('COMMIT')
        console.log(`Stored ${this.#cache.get('activeDeals').size} active deals in the database. Resetting cache`)
        this.#cache.set('activeDeals', new Set())
      } catch (error) {
      // If any error occurs, roll back the transaction
        await client.query('ROLLBACK')
        console.error('Error inserting deals. Rolling back:', error.message)
      } finally {
      // Release the client back to the pool
        client.release()
      }
    }
  }
}

export { DealObserver }
