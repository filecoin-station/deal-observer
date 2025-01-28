/** @import {PgPool, Queryable} from '@filecoin-station/deal-observer-db' */
import Cursor from 'pg-cursor'

/**
 * Find deals that are eligible to be submitted to a spark api and submits them.
 *
 * @param {PgPool} pgPool
 * @param {(eligibleDeals: Array) => Promise<void>} submitEligibleDealsFn
 */
export const findAndSubmitEligibleDeals = async (pgPool, submitEligibleDealsFn) => {
  for await (const eligibleDeals of findEligibleDeals(pgPool, 100)) {
    console.log('Submitting eligible deals:', eligibleDeals)
    const formattedEligibleDeals = formatEligibleDeals(eligibleDeals)
    await submitEligibleDealsFn(formattedEligibleDeals)
    await markEligibleDealsSubmitted(pgPool, eligibleDeals)
  }
}

/**
 * Find deals that are eligible to be submitted to a spark api.
 * Eligible deals are those that have not been submitted yet,
 * were created more than 2 days ago, and have not yet expired.
 *
 * @param {PgPool} pgPool
 * @param {number} batchSize
 * @returns {AsyncGenerator<Array>}
 */
const findEligibleDeals = async function * (pgPool, batchSize) {
  const client = await pgPool.connect()
  const cursor = client.query(new Cursor(`
      SELECT
        miner_id,
        client_id,
        piece_cid,
        piece_size,
        payload_cid,
        epoch_to_timestamp(term_start_epoch + term_min) AS expires_at 
      FROM active_deals
      WHERE submitted_at IS NULL AND created_at < NOW() - INTERVAL '2 days' AND epoch_to_timestamp(term_start_epoch + term_min) > NOW()
    `))

  let rows = await cursor.read(batchSize)
  while (rows.length > 0) {
    yield rows

    rows = await cursor.read(batchSize)
  }

  client.release()
}

/**
 * Format eligible deals to format expected by spark api.
 *
 * @param {Array} deals
 * @returns {Array}
*/
const formatEligibleDeals = (deals) => {
  return deals.map(deal => ({
    minerId: deal.miner_id,
    clientId: deal.client_id,
    pieceCid: deal.piece_cid,
    pieceSize: deal.piece_size.toString(),
    payloadCid: deal.payload_cid,
    expiresAt: deal.expires_at
  }))
}

/**
 * Mark eligible deals as submitted.
 *
 * @param {Queryable} pgPool
 * @param {Array} eligibleDeals
 */
const markEligibleDealsSubmitted = async (pgPool, eligibleDeals) => {
  await pgPool.query(`
    UPDATE active_deals
    SET submitted_at = NOW()
    WHERE miner_id = ANY($1) AND client_id = ANY($2) AND piece_cid = ANY($3)
  `, [
    eligibleDeals.map(deal => deal.miner_id),
    eligibleDeals.map(deal => deal.client_id),
    eligibleDeals.map(deal => deal.piece_cid)
  ])
}

/**
 * Submits eligible deals to a spark api.
 *
 * @param {string} sparkApiBaseURL
 * @param {string} dealIngestionAccessToken
 * @returns {(eligibleDeals: Array) => Promise<void>}
 */
export const submitEligibleDeals = (sparkApiBaseURL, dealIngestionAccessToken) => async (eligibleDeals) => {
  await fetch(`${sparkApiBaseURL}/eligible-deals-batch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${dealIngestionAccessToken}`
    },
    body: JSON.stringify(eligibleDeals)
  })
}
