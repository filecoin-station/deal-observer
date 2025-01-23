import { request } from 'undici'
import { PIECE_INDEXER_URL } from '../config.js'
import { parse } from '@ipld/dag-json'
import { CID as CIDF } from 'multiformats'
import { getMinerPeerId, rpcRequest } from '../rpc-service/service.js'

/** @import {CID} from'multiformats' */

/**
 * @param {string} providerId // Base 64 encoded provider ID
 * @param {string} pieceCid
  * @returns {Promise<object>}
  */
export const pixRequestFn = async (providerId, pieceCid) => {
  const url = PIECE_INDEXER_URL + '/samples/' + providerId + '/' + pieceCid
  const response = await request(url, {
    method: 'GET',
    headers: { 'content-type': 'application/json' }
  })
  return response.body.json()
}

/**
* @param {number} providerId
* @param {CID} pieceCid
* @returns {Promise<object>}
*/
export async function fetchPayloadCid (providerId, pieceCid, rpcRequestFn) {
  const minerPeerId = await getMinerPeerId(providerId, rpcRequestFn)
  const cid = pieceCid.toString()
  const payloadCid = await pixRequestFn(minerPeerId, cid)
  return payloadCid
}

const providerId = 3254061
const pieceCid = CIDF.parse('bafy2bzaceckgd3fyg4sdtmpul54jxcoqjygxlclde53qagvsb4wo6ggmnyhyc')
await fetchPayloadCid(providerId, pieceCid, rpcRequest)
