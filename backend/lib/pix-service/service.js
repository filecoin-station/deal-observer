import { Value } from '@sinclair/typebox/value'
import { PIECE_INDEXER_URL } from '../config.js'
import { getMinerPeerId } from '../rpc-service/service.js'
import { PixResponse } from './data-types.js'
import { cacheOptions } from './utils.js'
import pRetry from 'p-retry'
import { LRUCache } from 'lru-cache'

// A cache for miner peer IDs
// It has a maximum of 10000 items and deletes the least recently used items
const minerPeerIdsCache = new LRUCache(cacheOptions)

/**
 * @param {string} providerId
 * @param {string} pieceCid
 * @returns {Promise<string>}
 */
export const pixRequest = async (providerId, pieceCid) => {
  const url = PIECE_INDEXER_URL + '/sample/' + providerId + '/' + pieceCid
  const response = await pRetry(async () => await fetch(url, {
    method: 'GET',
    headers: { 'content-type': 'application/json' }
  }), { retries: 5 })
  return Value.Parse(PixResponse, (await response.json())).samples[0]
}

/**
* @param {number} providerId
* @param {string} pieceCid
* @returns {Promise<string>}
*/
export async function fetchPayloadCid (providerId, pieceCid, rpcRequest, pixRequest) {
  let minerPeerId
  // Check for cached miner peer IDs
  if (minerPeerIdsCache.has(providerId)) {
    minerPeerId = minerPeerIdsCache.get(providerId)
  } else {
    // If the miner peer ID is not cached, fetch it from the rpc service
    minerPeerId = await getMinerPeerId(providerId, rpcRequest)
    minerPeerIdsCache.set(providerId, minerPeerId)
  }
  const payloadCid = await pixRequest(minerPeerId, pieceCid)
  return payloadCid
}
