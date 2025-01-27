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
  })

  after(async () => {
    await pgPool.end()
  })

  describe('submitEligibleDeals', () => {
    it('submits eligible deals to the spark api', async () => {
      await givenActiveDeal(pgPool, { createdAt: new Date(), startsAt: Date.now(), expiresAt: Date.now() + 1000 })

      await submitEligibleDeals(pgPool, 'http://localhost:3000', 'token')
      const { rows } = await pgPool.query('SELECT * FROM active_deals WHERE submitted_at IS NOT NULL')

      assert(rows.length === 1)
    })
  })
})

const givenActiveDeal = async (pgPool, { createdAt, startsAt, expiresAt, minerId = 'f1test', clientId = 'f0test', payloadCid = 'cidone' }) => {
  const { termStart, termMin, termMax } = calculateTerms(startsAt, expiresAt)
  await pgPool.query(
    `INSERT INTO active_deals (
      miner_id,
      client_id,
      piece_cid,
      piece_size,
      term_start_epoch,
      term_min,
      term_max,
      sector_id,
      created_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [minerId, clientId, payloadCid, 34359738368, termStart, termMin, termMax, 37710, createdAt]
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
