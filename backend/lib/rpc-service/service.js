import { RPC_URL } from '../config.js'
import { base64pad } from 'multiformats/bases/base64'
import { encode as cborEncode } from '@ipld/dag-cbor'
import { decode as jsonDecode } from '@ipld/dag-json'
import { request } from 'undici'
import { IpldSchemaValidator } from './ipld-schema-validator.js'
import { rawEventEntriesToEvent } from './utils.js'

const makeRpcRequest = async (method, params) => {
  const reqBody = JSON.stringify({ method, params, id: 1, jsonrpc: '2.0' })
  const response = await request(RPC_URL, {
    bodyTimeout: 1000 * 60,
    headersTimeout: 1000 * 60,
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: reqBody
  })
  return jsonDecode(new Uint8Array(await response.body.arrayBuffer())).result
}

/*
 A class to interact with.
*/
class RpcApiClient {
  #ipldSchema
  #make_rpc_request

  constructor (rpcRequest) {
    this.#make_rpc_request = rpcRequest
  }

  async build () {
    this.#ipldSchema = await (new IpldSchemaValidator()).build()
    return this
  }

  static async create (rpcRequest = makeRpcRequest) {
    const apiClient = new RpcApiClient(rpcRequest)
    return apiClient.build()
  }

  /**
     * @param {ActorEventFilter} actorEventFilter
     * Returns actor events filtered by the given actorEventFilter
     * @returns {Promise<object>}
     */
  async getActorEvents (actorEventFilter) {
    const rawEvents = (await this.#make_rpc_request('Filecoin.GetActorEventsRaw', [actorEventFilter]))
    if (rawEvents && rawEvents.length === 0) {
      console.log(`No actor events found in the height range ${actorEventFilter.fromHeight} - ${actorEventFilter.toHeight}.`)
      return []
    }
    const typedRawEventEntries = rawEvents.map((rawEvent) => this.#ipldSchema.applyType(
      'RawActorEvent', rawEvent
    ))
    // An emitted event contains the height at which it was emitted, the emitter and the event itself
    const emittedEvents = new Set()
    for (const typedEventEntries of typedRawEventEntries) {
      const { event, eventType } = rawEventEntriesToEvent(typedEventEntries.entries)
      // Verify the returned event matches the expected event schema
      const typedEvent = this.#ipldSchema.applyType(eventType, event)
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
   * @param {number} blockHeight
   * @param {string} eventTypeString
   */
  constructor (blockHeight, eventTypeString) {
    // We only search for events in a single block
    this.fromHeight = blockHeight
    this.toHeight = blockHeight
    this.fields = {
      $type: // string must be encoded as CBOR and then presented as a base64 encoded string
        // Codec 81 is CBOR and will only give us builtin-actor events, FEVM events are all RAW
        [{ Codec: 81, Value: base64pad.baseEncode(cborEncode(eventTypeString)) }]
    }
  }
}

export { RpcApiClient, ActorEventFilter }
