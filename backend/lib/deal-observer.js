/** @import {Queryable} from '@filecoin-station/deal-observer-db' */
/** @import {Provider} from 'ethers' */

import { EVENT_TYPES } from './config.js'
import { ActorEventFilter, EventService } from './rpc-service/service.js'

class DealObserver {
  #pgPool
  #eventService
  #cache

  constructor (pgPool = null, chainHead = null) {
    // TODO: Store events in pgPool
    this.#pgPool = pgPool
    this.#cache = new Map()
    this.#cache.set('chainHead', chainHead)
  }

  async build () {
    this.#eventService = await (new EventService()).build()
    if (!this.#cache.get('chainHead')) {
      const chainHead = await this.#eventService.getChainHead()
      this.#cache.set('chainHead', chainHead)
    }
    return this
  }

  async observeBuiltinActorEvents (fromHeight = this.#cache.get('chainHead').Height, toHeight = this.#cache.get('chainHead').Height, eventTypes = EVENT_TYPES) {
    return this.#eventService.getActorEvents(new ActorEventFilter(fromHeight, toHeight, eventTypes))
  }
}

export {
  DealObserver
}
