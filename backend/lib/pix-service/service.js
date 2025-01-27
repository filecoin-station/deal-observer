import { Value } from '@sinclair/typebox/value'
import { PIECE_INDEXER_URL } from '../config.js'
import { getMinerPeerId } from '../rpc-service/service.js'
import { PixResponse } from './data-types.js'
import { Cache } from './utils.js'

const minerPeerIdsCache = new Cache()

/**
 * @param {string} providerId
 * @param {string} pieceCid
 * @returns {Promise<string>}
 */
export const pixRequest = async (providerId, pieceCid) => {
  const url = PIECE_INDEXER_URL + '/sample/' + providerId + '/' + pieceCid
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'content-type': 'application/json' }
  })
  return Value.Parse(PixResponse, (await response.json())).samples[0]
}

/**
* @param {number} providerId
* @param {string} pieceCid
* @returns {Promise<string>}
*/
export async function fetchPayloadCid (providerId, pieceCid, rpcRequest, pixRequest) {
  let minerPeerId
  if (minerPeerIdsCache.has(providerId)) {
    minerPeerId = minerPeerIdsCache.get(providerId)
  } else {
    minerPeerId = await getMinerPeerId(providerId, rpcRequest)
    minerPeerIdsCache.set(providerId, minerPeerId)
  }
  const payloadCid = await pixRequest(minerPeerId, pieceCid)
  return payloadCid
}
