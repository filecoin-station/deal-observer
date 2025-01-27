import { Value } from '@sinclair/typebox/value'
import { PIECE_INDEXER_URL } from '../config.js'
import { getMinerPeerId, rpcRequest } from '../rpc-service/service.js'
import { PixResponse } from './data-types.js'

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
  const minerPeerId = await getMinerPeerId(providerId, rpcRequest)
  console.log(`Fetching payload CID for miner ${providerId} and piece ${pieceCid}`)
  const payloadCid = await pixRequest(minerPeerId, pieceCid)
  console.log(`Payload CID for miner ${providerId} and piece ${pieceCid} is ${payloadCid}`)
  return payloadCid
}
