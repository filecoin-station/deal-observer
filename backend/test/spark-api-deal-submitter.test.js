import assert from 'node:assert'
import { after, before, beforeEach, describe, it, mock } from 'node:test'
import { createPgPool, migrateWithPgClient } from '@filecoin-station/deal-observer-db'
import { calculateActiveDealEpochs, daysAgo, daysFromNow, today } from './test-helpers.js'
import { findAndSubmitUnsubmittedDeals } from '../lib/spark-api-deal-submitter.js'

describe('spark-api-deal-submitter', () => {
  let pgPool
  const sparkApiBaseURL = 'http://localhost:8080'
  const sparkApiToken = 'test'
  const batchSize = 100

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

  describe('spark api deal submitter', () => {
    it('finds and submits eligible deals to the spark api', async () => {
      // This deal is eligible for submission
      await givenActiveDeal(pgPool, { minerId: 0, createdAt: daysAgo(3), startsAt: today(), expiresAt: daysFromNow(10), payloadCid: 'cidone' })
      // This deal is not eligible for submission because it has no payload cid
      await givenActiveDeal(pgPool, { minerId: 1, createdAt: daysAgo(3), startsAt: today(), expiresAt: daysFromNow(10) })
      // This deal is not eligible for submission because it was created less than 2 days ago
      await givenActiveDeal(pgPool, { minerId: 2, createdAt: today(), startsAt: today(), expiresAt: daysFromNow(10), payloadCid: 'cidtwo' })
      // This deal is not eligible for submission because it has expired
      await givenActiveDeal(pgPool, { minerId: 3, createdAt: daysAgo(10), startsAt: daysAgo(10), expiresAt: daysAgo(5), payloadCid: 'cidthree' })

      const mockSubmitEligibleDeals = (_url, _token) => mock.fn()
      const mockSubmit = mockSubmitEligibleDeals(sparkApiBaseURL, sparkApiToken)

      await findAndSubmitUnsubmittedDeals(pgPool, batchSize, mockSubmit)
      const { rows } = await pgPool.query('SELECT * FROM active_deals WHERE submitted_at IS NOT NULL')
      assert.strictEqual(rows.length, 1)
      assert.strictEqual(mockSubmit.mock.calls.length, 1)
    })
  })
})

const givenActiveDeal = async (pgPool, { createdAt, startsAt, expiresAt, minerId = 2, clientId = 3, pieceCid = 'cidone', payloadCid = null }) => {
  const { activatedAtEpoch, termStart, termMin, termMax } = calculateActiveDealEpochs(createdAt, startsAt, expiresAt)
  await pgPool.query(
    `INSERT INTO active_deals 
    (activated_at_epoch, miner_id, client_id, piece_cid, piece_size, sector_id, term_start_epoch, term_min, term_max, payload_cid)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [activatedAtEpoch, minerId, clientId, pieceCid, 1024, 6, termStart, termMin, termMax, payloadCid]
  )
}
