import { EVENT_TYPES, GLIF_RPC } from '../config.js'
import { base64pad } from 'multiformats/bases/base64'
import { encode as cborEncode } from '@ipld/dag-cbor'
import { decode as jsonDecode } from '@ipld/dag-json'
import { request } from 'undici'
import fs from 'fs'
import { IpldSchema } from './ipld-schema.js'
import { rawEventEntriesToEvent } from './utils.js'
let counter = 0

const make_rpc_request = async (method, params) => {
  const reqBody = JSON.stringify({ method, params, id: counter++, jsonrpc: '2.0' })
  const response = await request(GLIF_RPC, {
    bodyTimeout: 1000 * 60,
    headersTimeout: 1000 * 60,
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: reqBody
  })
  return jsonDecode(new Uint8Array(await response.body.arrayBuffer())).result
}

/*
 A class to interact with the Lotus HTTP RPC API.
*/
class LotusService {
  #ipldSchema
  #make_rpc_request

  
  constructor(rpc_request = make_rpc_request) {
    this.#make_rpc_request = rpc_request
  }

  async build() {
    this.#ipldSchema = await (new IpldSchema()).build()
    return this
  }

  /**
     * @param {ActorEventFilter} actorEventFilter
     * Returns actor events filtered by the given actorEventFilter
     * @returns {Promise<object>}
     */
  async getActorEvents(actorEventFilter) {
    // TODO: Handle multiple events, currently we are expecting a single event to exist in the filter
    const rawEvents = (await this.#make_rpc_request('Filecoin.GetActorEventsRaw', [actorEventFilter]))
    const typedRawEventEntries = rawEvents.map((rawEvent) => this.#ipldSchema.transform(
      'RawActorEvent', rawEvent
    ))
    // An emitted event contains the height at which it was emitted, the emitter and the event itself
    const emittedEvents = new Set()
    for (const typedEventEntries of typedRawEventEntries) {
      const { event, eventType } = rawEventEntriesToEvent(typedEventEntries.entries)
      // Verify the returned event matches the expected event schema 
      const typedEvent = this.#ipldSchema.transform(eventType, event)
      emittedEvents.add(
        {
          height: typedEventEntries.height,
          emitter: typedEventEntries.emitter,
          event: typedEvent
        })
    }
    return emittedEvents
  }

  async getChainHead() {
    return await this.#make_rpc_request('Filecoin.ChainHead', [])
  }
}

class ActorEventFilter {
  /**
   * @param {number} fromHeight
   * @param {number} toHeight
   * @param {string[]} eventTypes
   */
  constructor(fromHeight, toHeight, eventTypes) {
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
