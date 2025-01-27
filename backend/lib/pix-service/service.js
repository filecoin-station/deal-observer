import { Value } from '@sinclair/typebox/value'
import { PIECE_INDEXER_URL } from '../config.js'
import { getMinerPeerId, rpcRequest } from '../rpc-service/service.js'
import { RpcRespone } from './data-types.js'

/**
 * @param {string} providerId
 * @param {string} pieceCid
 * @returns {Promise<string>}
 */
export const pixRequest = async (providerId, pieceCid) => {
  const url = PIECE_INDEXER_URL + '/samples/' + providerId + '/' + pieceCid
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'content-type': 'application/json' }
  })
  return Value.Parse(RpcRespone, (await response.json())).result
}

/**
* @param {number} providerId
* @param {string} pieceCid
* @returns {Promise<string>}
*/
export async function fetchPayloadCid (providerId, pieceCid, rpcRequest) {
  const minerPeerId = await getMinerPeerId(providerId, rpcRequest)
  console.log(`Fetching payload CID for miner ${providerId} and piece ${pieceCid}`)
  const payloadCid = await pixRequest(minerPeerId, pieceCid)
  console.log(`Payload CID for miner ${providerId} and piece ${pieceCid} is ${payloadCid}`)
  return payloadCid
}

// const providerId = 3254061
// const pieceCid = CIDF.parse('bafy2bzaceckgd3fyg4sdtmpul54jxcoqjygxlclde53qagvsb4wo6ggmnyhyc')
// await fetchPayloadCid(providerId, pieceCid, rpcRequest)
