/** @import {PgPool, Queryable} from '@filecoin-station/deal-observer-db' */
import Cursor from 'pg-cursor'

/**
 * Find deals that are eligible to be submitted to spark api and submits them.
 *
 * @param {PgPool} pgPool
 * @param {string} sparkApiBaseURL
 * @param {string} dealIngestionAccessToken
 * @param {number} batchSize
 * @param {(sparkApiBaseURL: string, dealIngestionAccessToken: string, eligibleDeals: Array) => Promise<void>} submitEligibleDealsFn
 */
export const findAndSubmitEligibleDeals = async (pgPool, sparkApiBaseURL, dealIngestionAccessToken, batchSize, submitEligibleDealsFn) => {
  for await (const eligibleDeals of findEligibleDeals(pgPool, batchSize)) {
    const formattedEligibleDeals = formatEligibleDeals(eligibleDeals)
    await submitEligibleDealsFn(sparkApiBaseURL, dealIngestionAccessToken, formattedEligibleDeals)
    await markEligibleDealsSubmitted(pgPool, eligibleDeals)
  }
}

/**
 * Find deals that are eligible to be submitted to spark api.
 * Eligible deals are those that
 * - have not been submitted yet
 * - were created more than 2 days ago
 * - have payload cid
 * - have not yet expired
 *
 * @param {PgPool} pgPool
 * @param {number} batchSize
 * @returns {AsyncGenerator<Array>}
 */
const findEligibleDeals = async function * (pgPool, batchSize) {
  const client = await pgPool.connect()
  const cursor = client.query(new Cursor(`
    WITH two_days_ago AS (
        SELECT (NOW() - INTERVAL '2 days')::TIMESTAMP AS ts
    )
    SELECT
        miner_id,
        client_id,
        piece_cid,
        piece_size,
        payload_cid,
        epoch_to_timestamp(term_start_epoch + term_min) AS expires_at
    FROM
        active_deals
    WHERE
        submitted_at IS NULL
        AND payload_cid IS NOT NULL
        AND activated_at_epoch < timestamp_to_epoch((SELECT ts FROM two_days_ago))
        AND epoch_to_timestamp(term_start_epoch + term_min) > NOW()`
  ))

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
    WHERE miner_id = ANY($1) AND client_id = ANY($2) AND piece_cid = ANY($3) AND piece_size = ANY($4)
  `, [
    eligibleDeals.map(deal => deal.miner_id),
    eligibleDeals.map(deal => deal.client_id),
    eligibleDeals.map(deal => deal.piece_cid),
    eligibleDeals.map(deal => deal.piece_size)
  ])
}

/**
 * Submits eligible deals to a spark api.
 *
 * @param {string} sparkApiBaseURL
 * @param {string} dealIngestionAccessToken
 * @param {Array} eligibleDeals
 * @returns {Promise<void>}
 */
export const submitEligibleDeals = async (sparkApiBaseURL, dealIngestionAccessToken, eligibleDeals) => {
  await fetch(`${sparkApiBaseURL}/eligible-deals-batch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${dealIngestionAccessToken}`
    },
    body: JSON.stringify(eligibleDeals)
  })
}
