import assert from 'node:assert'
import { after, before, beforeEach, describe, it, mock } from 'node:test'
import { createPgPool, migrateWithPgClient } from '@filecoin-station/deal-observer-db'
import { calculateTerms, daysAgo, daysFromNow, today } from './test-helpers.js'
import { findAndSubmitEligibleDeals } from '../lib/deal-submitter.js'

describe('deal-submitter', () => {
  let pgPool

  before(async () => {
    pgPool = await createPgPool()
    await migrateWithPgClient(pgPool)
  })

  after(async () => {
    await pgPool.end()
  })

  beforeEach(async () => {
    await pgPool.query('DELETE FROM active_deals')
  })

  describe('deal submitter', () => {
    it('finds and submits eligible deals to the spark api', async () => {
      // This deal is eligible
      await givenActiveDeal(pgPool, { minerId: 1, createdAt: daysAgo(3), startsAt: today(), expiresAt: daysFromNow(10) })
      // This deal is not eligible because it was created less than 2 days ago
      await givenActiveDeal(pgPool, { minerId: 2, createdAt: today(), startsAt: today(), expiresAt: daysFromNow(10) })
      // This deal is not eligible because it has expired
      await givenActiveDeal(pgPool, { minerId: 3, createdAt: daysAgo(10), startsAt: daysAgo(10), expiresAt: daysAgo(5) })

      const mockSubmitEligibleDeals = mock.fn()

      await findAndSubmitEligibleDeals(pgPool, 'http://localhost:8080', 'test', mockSubmitEligibleDeals)
      const { rows } = await pgPool.query('SELECT * FROM active_deals WHERE submitted_at IS NOT NULL')
      assert.strictEqual(rows.length, 1)
      assert.strictEqual(mockSubmitEligibleDeals.mock.calls.length, 1)
    })
  })
})

const givenActiveDeal = async (pgPool, { createdAt, startsAt, expiresAt, activatedAtEpoch = 1, minerId = 2, clientId = 3, pieceCid = 'cidone' }) => {
  const { termStart, termMin, termMax } = calculateTerms(startsAt, expiresAt)
  await pgPool.query(
    `INSERT INTO active_deals 
    (created_at, activated_at_epoch, miner_id, client_id, piece_cid, piece_size, sector_id, term_start_epoch, term_min, term_max)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [createdAt, activatedAtEpoch, minerId, clientId, pieceCid, 1024, 6, termStart, termMin, termMax]
  )
}
