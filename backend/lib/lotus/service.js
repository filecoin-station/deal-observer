import { EVENT_TYPES, GLIF_RPC } from '../config.js'
import { base64pad } from 'multiformats/bases/base64'
import { encode as cborEncode } from '@ipld/dag-cbor'
import { decode as jsonDecode } from '@ipld/dag-json'
import { request } from 'undici'
import { decodeCborInBase64, Transformer } from './transform.js'
import fs from 'fs'
let counter = 0

/*
 A class to interact with the Lotus HTTP RPC API.
*/
class LotusService {
  #lotusHttpRpcURL
  #transformer

  /**
     * @param {string} lotusHttpRpcURL
     */
  constructor (lotusHttpRpcURL) {
    this.#lotusHttpRpcURL = lotusHttpRpcURL
  }

  async build () {
    this.#transformer = await (new Transformer()).build()
    return this
  }
  async #make_rpc_request (method, params) {
    const reqBody = JSON.stringify({ method, params, id: 1, jsonrpc: '2.0' })
    const response = await request(this.#lotusHttpRpcURL, {
      bodyTimeout: 1000 * 60,
      headersTimeout: 1000 * 60,
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: reqBody
    })
    return jsonDecode(new Uint8Array(await response.body.arrayBuffer())).result
  }

  /**
     * @param {ActorEventFilter} actorEventFilter
     * Returns actor events filtered by the given actorEventFilter
     * @returns {Promise<object>}
     */
  async getActorEvents (actorEventFilter) {
    // TODO: Handle multiple events, currently we are expecting a single event to exist in the filter
    const rawEvents = (await this.#make_rpc_request('Filecoin.GetActorEventsRaw', [actorEventFilter]))
    const typedRawEventEntries = rawEvents.map((rawEvent) => this.#transformer.transform(
      'RawActorEvent', rawEvent
    ))
    // An emitted event contains the height at which it was emitted, the emitter and the event itself
    const emittedEvents = new Set()
    for (const typedEventEntries of typedRawEventEntries) {
      const entries = typedEventEntries.entries
      // Each event is defined by a list of even entries which will will transform into a typed event
      const event = {}
      // TODO handle if there is no type entry
      let eventType
      for (const entry of entries) {
        // The key returned by the Lotus API is kebab-case, we convert it to camelCase
        const key = entry.Key.replace(/-([a-z])/g, (_, c) => c.toUpperCase())
        const value = decodeCborInBase64(entry.Value)
        // In each entry exists an event type declaration which we need to extract
        if (key === '$type') {
          eventType = value.concat('event')
          // The type entry is not part of the event itself
          continue
        }
        event[key] = value
      }
      const typedEvent = this.#transformer.transform(eventType, event)
      emittedEvents.add(
        {
          height: typedEventEntries.height,
          emitter: typedEventEntries.emitter,
          event: typedEvent
        })
    }
    return emittedEvents
  }

  async getChainHead () {
    return await this.#make_rpc_request('Filecoin.ChainHead', [])
  }
}

class ActorEventFilter {
  /**
   * @param {number} fromHeight
   * @param {number} toHeight
   * @param {string[]} eventTypes
   */
  constructor (fromHeight, toHeight, eventTypes) {
    this.fromHeight = fromHeight
    this.toHeight = toHeight
    this.fields = {
      $type: eventTypes.map(eventTypeString => {
      // string must be encoded as CBOR and then presented as a base64 encoded string
        const eventTypeEncoded = base64pad.baseEncode(cborEncode(eventTypeString))
        // Codec 81 is CBOR and will only give us builtin-actor events, FEVM events are all RAW
        return { Codec: 81, Value: eventTypeEncoded }
      })
    }
  }
}

export {
  ActorEventFilter,
  LotusService
}
