import Cursor from 'pg-cursor'
/** @import {PgPool, Queryable} from '@filecoin-station/deal-observer-db' */

/**
 * @param {PgPool} pgPool
 * @param {string} sparkApiBaseURL
 * @param {string} dealIngesterToken
 */
export const submitEligibleDeals = async (pgPool, sparkApiBaseURL, dealIngesterToken) => {
  const submitURL = `${sparkApiBaseURL}/eligible-deals-batch`
  for await (const eligibleDeals of findEligibleDeals(pgPool, 100)) {
    fetch(submitURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${dealIngesterToken}`
      },
      body: JSON.stringify(eligibleDeals)
    })

    setEligibleDealsSubmitted(pgPool, eligibleDeals)
  }
}


/**
 * @param {PgPool} pgPool
 * @param {number} batchSize
 * @returns {AsyncGenerator<Array>}
 */
async function* findEligibleDeals(pgPool, batchSize) {
  const client = await pgPool.connect();
  const cursor = client.query(new Cursor(`
      SELECT * FROM active_deals
      WHERE submitted_at IS NULL AND created_at < NOW() - INTERVAL '2 days'
      AND epoch_to_timestamp(term_start_epoch + term_min) > NOW()
    `))

  let rows = await cursor.read(batchSize)
  while (rows.length > 0) {
    yield rows

    rows = cursor.read(batchSize)
  }

  client.release()
}


/**
 * @param {Queryable} pgPool
 * @param {Array} eligibleDeals
 */

async function setEligibleDealsSubmitted(pgPool, eligibleDeals) {
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
