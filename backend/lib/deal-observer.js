/** @import {Queryable} from '@filecoin-station/deal-observer-db' */
/** @import {Provider} from 'ethers' */

import { EVENT_TYPES } from './config.js'
import { ActorEventFilter, RpcApiClient } from './rpc-service/service.js'

class DealObserver {
  #pgPool
  #rpcApiClient
  #cache

  constructor (pgPool, chainHead) {
    // TODO: Store events in pgPool
    this.#pgPool = pgPool
    this.#cache = new Map()
    this.#cache.set('chainHead', chainHead)
  }

  async build () {
    this.#rpcApiClient = await (new RpcApiClient()).build()
    if (!this.#cache.get('chainHead')) {
      const chainHead = await this.#rpcApiClient.getChainHead()
      this.#cache.set('chainHead', chainHead)
    }
    return this
  }

  static async create (pgPool = null, chainHead = null) {
    const observer = new DealObserver(pgPool, chainHead)
    return await observer.build()
  }

  async observeBuiltinActorEvents (fromHeight = this.#cache.get('chainHead').Height, toHeight = this.#cache.get('chainHead').Height, eventTypes = EVENT_TYPES) {
    return this.#rpcApiClient.getActorEvents(new ActorEventFilter(fromHeight, toHeight, eventTypes))
  }
}

export {
  DealObserver
}
