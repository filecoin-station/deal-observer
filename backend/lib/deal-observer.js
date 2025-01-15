/** @import {Queryable} from '@filecoin-station/deal-observer-db' */
/** @import {Provider} from 'ethers' */

import { EVENT_TYPES, GLIF_RPC } from './config.js'
import { ActorEventFilter, LotusService } from './lotus/service.js'

class DealObserver {
  #pgPool
  #lotusService
  #rpcProviderURL
  #cache

  constructor (pgPool = null, rpcProviderURL = GLIF_RPC, chainHead = null) {
    // TODO: Store events in pgPool
    this.#pgPool = pgPool
    this.#rpcProviderURL = rpcProviderURL
    this.#cache = new Map()
    this.#cache.set('chainHead', chainHead)
  }

  async build () {
    this.#lotusService = await (new LotusService(this.#rpcProviderURL)).build()
    if (!this.#cache.get('chainHead')) {
      const chainHead = await this.#lotusService.getChainHead()
      this.#cache.set('chainHead', chainHead)
    }
    return this
  }

  async observeBuiltinActorEvents (fromHeight = this.#cache.get('chainHead').Height, toHeight = this.#cache.get('chainHead').Height, eventTypes = EVENT_TYPES) {
    return this.#lotusService.getActorEvents(new ActorEventFilter(fromHeight, toHeight, eventTypes))
  }
}

export {
  DealObserver
}

(new DealObserver()).build().then((dealObserver) => {
  dealObserver.observeBuiltinActorEvents(4620803,4620803).then((events) => { console.log(events) })
})
