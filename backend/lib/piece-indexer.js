import { storeActiveDeals } from '@filecoin-station/deal-observer-db/lib/database-access.js'
import { fetchPayloadCid } from './pix-service/service.js'

/**
 * @param {import("@filecoin-station/deal-observer-db").Queryable} pgPool
 * @param {function} makeRpcRequest
 * @param {function} pixRequest
 * @returns {Promise<void>}
 */
export async function updatePayloadCids (pgPool, makeRpcRequest, activeDeals, pixRequest) {
  const updatedDeals = []
  for (const deal of activeDeals) {
    const payloadCid = await fetchPayloadCid(deal.miner_id, deal.piece_cid, makeRpcRequest, pixRequest)
    deal.payload_cid = payloadCid
    updatedDeals.push(deal)
  }
  if (updatedDeals.length > 0) {
    await storeActiveDeals(updatedDeals, pgPool)
  }
}
