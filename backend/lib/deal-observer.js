/** @import {Queryable} from '@filecoin-station/deal-observer-db' */
/** @import {Provider} from 'ethers' */

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

  async observeBuiltinActorEvents (blockHeight = this.#cache.get('chainHead').Height, eventType = 'claim') {
    return this.#rpcApiClient.getActorEvents(new ActorEventFilter(blockHeight, eventType))
  }
}

export {
  DealObserver
}
