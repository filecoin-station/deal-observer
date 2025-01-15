import { EVENT_TYPES, GLIF_RPC } from '../config.js'
import { base64pad } from 'multiformats/bases/base64'
import { encode as cborEncode, decode as cborDecode } from '@ipld/dag-cbor'
import { decode as jsonDecode, encode as jsonEncode } from '@ipld/dag-json'
import { request } from 'undici'
import { readFile } from 'node:fs/promises'
import { fromDSL } from '@ipld/schema/from-dsl.js'
import { decodeCborInBase64, encodeCborInBase64, Transformer } from './transform.js'
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
    const { body } = await request(this.#lotusHttpRpcURL, {
      bodyTimeout: 1000 * 60,
      headersTimeout: 1000 * 60,
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: reqBody
    })
    const rawBody = await body.arrayBuffer()
    return jsonDecode(new Uint8Array(rawBody)).result
  }

  /**
     * @param {ActorEventFilter} actorEventFilter
     * Returns actor events filtered by the given actorEventFilter
     * @returns {Promise<object>}
     */
  async getActorEvents (actorEventFilter) {
    // TODO: Handle multiple events, currently we are expecting a single event to exist in the filter
    const rawEvent = (await this.#make_rpc_request('Filecoin.GetActorEventsRaw', [actorEventFilter])).shift()
    const eventEntries = rawEvent.entries

    // The first entry is the event type
    const type = decodeCborInBase64(eventEntries[0].Value)
    const event = {}

    // The first entry is the event type which we do not need for deriving the
    for (const entry of eventEntries.slice(1)) {
      // The key returned by the Lotus API is kebab-case, we convert it to camelCase
      event[entry.Key.replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = decodeCborInBase64(entry.Value)
    }
    let typedEvent
    switch (type) {
      case 'claim':
        typedEvent = this.#transformer.transform('ClaimEvent', event)
        break
      default:
        // TODO: Introduce Logging instead of throwing Errors
        console.error(`Unknown event type ${type}`)
    }
    return { rawEvent, typedEvent }
  }

  async getChainHead () {
    return await this.#make_rpc_request('Filecoin.ChainHead', [])
  }
}

/**
 * @param {number} fromHeight
 * @param {number} toHeight
 * @param {string[]} eventTypes
 */
class ActorEventFilter {
  constructor (fromHeight, toHeight, eventTypes) {
    this.fromHeight = fromHeight
    this.toHeight = toHeight
    this.fields = {
      $type: eventTypes.map(eventTypeString => {
      // string must be encoded as CBOR and then presented as a base64 encoded string
      const eventTypeEncoded = base64pad.baseEncode(cborEncode(eventTypeString))
      // Codec 81 is CBOR and will only give us builtin-actor events, FEVM events are all RAW
      return { Codec: 81, Value: eventTypeEncoded }
    })}
  }
}

export {
  ActorEventFilter,
  LotusService
}
