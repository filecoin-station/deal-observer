/** @import {Queryable} from '@filecoin-station/deal-observer-db' */
/** @import {Provider} from 'ethers' */

import { EVENT_TYPES } from './config.js'
import { ActorEventFilter, RpcService } from './rpc-service/service.js'

class DealObserver {
  #pgPool
  #rpcService
  #cache

  constructor (pgPool = null, chainHead = null) {
    // TODO: Store events in pgPool
    this.#pgPool = pgPool
    this.#cache = new Map()
    this.#cache.set('chainHead', chainHead)
  }

  async build () {
    this.#rpcService = await (new RpcService()).build()
    if (!this.#cache.get('chainHead')) {
      const chainHead = await this.#rpcService.getChainHead()
      this.#cache.set('chainHead', chainHead)
    }
    return this
  }

  async observeBuiltinActorEvents (fromHeight = this.#cache.get('chainHead').Height, toHeight = this.#cache.get('chainHead').Height, eventTypes = EVENT_TYPES) {
    return this.#rpcService.getActorEvents(new ActorEventFilter(fromHeight, toHeight, eventTypes))
  }
}

export {
  DealObserver
}
