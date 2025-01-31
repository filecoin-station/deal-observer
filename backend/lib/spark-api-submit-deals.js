/** @import {PgPool, Queryable} from '@filecoin-station/deal-observer-db' */
import Cursor from 'pg-cursor'
import * as Sentry from '@sentry/node'

/**
 * Finds deals that haven't been submitted to the Spark API yet and submits them.
 *
 * @param {PgPool} pgPool
 * @param {number} batchSize
 * @param {(eligibleDeals: Array) => Promise<void>} submitDeals
 */
export const findAndSubmitUnsubmittedDeals = async (pgPool, batchSize, submitDeals) => {
  console.debug(`Finding and submitting deals using batchSize: ${batchSize}`)
  for await (const deals of findUnsubmittedDeals(pgPool, batchSize)) {
    console.debug(`Found ${deals.length} unsubmitted deals`)
    try {
      await submitDeals(deals)
      console.debug(`Successfully submitted ${deals.length} deals`)
      await markDealsAsSubmitted(pgPool, deals)
    } catch (e) {
      console.error('Failed to submit deals:', e)
      Sentry.captureException(e)
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

  while (true) {
    const rows = await cursor.read(batchSize)
    if (rows.length === 0) break
    yield rows
  }

  client.release()
}

/**
 * Mark deals as submitted.
 *
 * @param {Queryable} pgPool
 * @param {Array} eligibleDeals
 */
const markDealsAsSubmitted = async (pgPool, eligibleDeals) => {
  await pgPool.query(`
    UPDATE active_deals ad
    SET submitted_at = NOW()
    FROM (
      SELECT
        unnest($1::INT[]) AS miner_id,
        unnest($2::INT[]) AS client_id,
        unnest($3::TEXT[]) AS piece_cid,
        unnest($4::BIGINT[]) AS piece_size
    ) AS t
    WHERE ad.miner_id = t.miner_id 
      AND ad.client_id = t.client_id 
      AND ad.piece_cid = t.piece_cid 
      AND ad.piece_size = t.piece_size
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
    body: JSON.stringify(deals.map(deal => ({
      minerId: deal.miner_id,
      clientId: deal.client_id,
      pieceCid: deal.piece_cid,
      pieceSize: deal.piece_size.toString(),
      payloadCid: deal.payload_cid,
      expiresAt: deal.expires_at
    })))
  })

  if (!response.ok) {
    throw new Error(
      `Failed to submit deals (status ${response.status}): ${await response.text().catch(() => null)}`
    )
  }
}
