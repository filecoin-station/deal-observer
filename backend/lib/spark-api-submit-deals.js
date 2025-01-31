/** @import {PgPool, Queryable} from '@filecoin-station/deal-observer-db' */
import Cursor from 'pg-cursor'

/**
 * Finds deals that haven't been submitted to the Spark API yet and submits them.
 *
 * @param {PgPool} pgPool
 * @param {number} batchSize
 * @param {(eligibleDeals: Array) => Promise<void>} submitDeals
 */
export const findAndSubmitUnsubmittedDeals = async (pgPool, batchSize, submitDeals) => {
  console.debug(`Finding and submitting deals using batchSize: ${batchSize}`)
  for await (const unsubmittedDeals of findUnsubmittedDeals(pgPool, batchSize)) {
    console.debug(`Found ${unsubmittedDeals.length} unsubmitted deals`)
    try {
      const formattedDeals = unsubmittedDeals.map(deal => {
        return formatDealForSparkApi(deal)
      })
      await submitDeals(formattedDeals)
      console.debug(`Successfully submitted ${formattedDeals.length} deals`)
      await markDealsAsSubmitted(pgPool, unsubmittedDeals)
    } catch (e) {
      console.error('Failed to submit deals:', e)
    }
  }
}

/**
 * Finds deals that haven't been submitted to spark api.
 * For deals to be submitted they must
 * - have not been submitted yet
 * - were created more than 2 days ago
 * - have payload cid
 * - have not yet expired
 *
 * @param {PgPool} pgPool
 * @param {number} batchSize
 * @returns {AsyncGenerator<Array>}
 */
const findUnsubmittedDeals = async function * (pgPool, batchSize) {
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
 * Format unsubmitted deals to format expected by spark api.
 *
 * @param {object} deal
 * @returns {object}
*/
const formatDealForSparkApi = (deal) => {
  return {
    minerId: deal.miner_id,
    clientId: deal.client_id,
    pieceCid: deal.piece_cid,
    pieceSize: deal.piece_size.toString(),
    payloadCid: deal.payload_cid,
    expiresAt: deal.expires_at
  }
}

/**
 * Mark deals as submitted.
 *
 * @param {Queryable} pgPool
 * @param {Array} eligibleDeals
 */
const markDealsAsSubmitted = async (pgPool, eligibleDeals) => {
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
 * Submits deals to a spark api.
 *
 * @param {string} sparkApiBaseURL
 * @param {string} sparkApiToken
 * @param {Array} deals
 * @returns {Promise<void>}
 */
export const submitDealsToSparkApi = async (sparkApiBaseURL, sparkApiToken, deals) => {
  console.debug(`Submitting ${deals.length} deals to Spark API`)
  const response = await fetch(`${sparkApiBaseURL}/eligible-deals-batch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sparkApiToken}`
    },
    body: JSON.stringify(deals)
  })

  if (!response.ok) {
    throw new Error(`Failed to submit deals: ${response.statusText}`)
  }
}
