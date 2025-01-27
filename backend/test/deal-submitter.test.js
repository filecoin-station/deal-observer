import assert from 'node:assert'
import { after, before, describe, it } from 'node:test'
import { createPgPool, migrateWithPgClient } from '@filecoin-station/deal-observer-db'
import { submitEligibleDeals } from '../lib/deal-submitter.js'
import { dateToEpoch } from '../lib/epoch.js'

describe('deal-submitter', () => {
  let pgPool

  before(async () => {
    pgPool = await createPgPool()
    await migrateWithPgClient(pgPool)

    pgPool.query('DELETE FROM active_deals')
  })

  after(async () => {
    await pgPool.end()
  })

  describe('submitEligibleDeals', () => {
    it('submits eligible deals to the spark api', async () => {
      const now = new Date()
      const endsAt = new Date(now.getTime() + 1000)
      await givenActiveDeal(pgPool, { createdAt: now, startsAt: now, expiresAt: endsAt })

      await submitEligibleDeals(pgPool, 'http://localhost:3000', 'token')
      const { rows } = await pgPool.query('SELECT * FROM active_deals WHERE submitted_at IS NOT NULL')

      assert(rows.length === 0)
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

/**
 * Calculate term start, term min, and term max from startsAt and expiresAt
 * @param {Date} startsAt
 * @param {Date} expiresAt
 */
const calculateTerms = (startsAt, expiresAt) => {
  const termStart = dateToEpoch(startsAt)
  const termEnd = dateToEpoch(expiresAt)

  return { termStart, termMin: termEnd, termMax: termEnd }
}
