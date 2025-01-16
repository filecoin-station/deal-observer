import assert from 'node:assert'
import { after, before, beforeEach, describe, it } from 'node:test'
import { createPgPool, migrateWithPgClient } from '@filecoin-station/deal-observer-db'

import { observeBuiltinActorEvents } from '../lib/deal-observer.js'

describe('deal-observer-backend', () => {
  let pgPool

  before(async () => {
    pgPool = await createPgPool()
    await migrateWithPgClient(pgPool)
  })

  after(async () => {
    await pgPool.end()
  })

  describe('observeBuiltinActorEvents', () => {
    let providerMock

    beforeEach(async () => {
      await pgPool.query('DELETE FROM active_deals')

      providerMock = {
        getBlockNumber: async () => 2000
      }
    })

    // TODO - remove this placeholder and implement proper tests
    it('adds new FIL+ deals from built-in actor events', async () => {
      // Example client code to add a new deal to the database
      await pgPool.query(`
       INSERT INTO active_deals (
         activated_at_epoch,
         miner,
         client,
         piece_cid,
         piece_size,
         term_start_epoch,
         term_min,
         term_max,
         sector
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        // Data from example event payload posted in
        // https://github.com/space-meridian/roadmap/issues/172#issuecomment-2573450933
        4131302,
        3072985,
        3138382,
        'baga6ea4seaqeaboqmwmwm7i6nr5alwtdi6xy43p6iay2xs7qee5ghyakpwelofy',
        34359738368,
        4131302,
        1051200,
        5256000,
        37710
      ])

      // example code loading active deals
      const { rows: loaded } = await pgPool.query('SELECT * FROM active_deals')
      assert.deepStrictEqual(loaded, [{
        activated_at_epoch: 4131302,
        miner: 3072985,
        client: 3138382,
        piece_cid: 'baga6ea4seaqeaboqmwmwm7i6nr5alwtdi6xy43p6iay2xs7qee5ghyakpwelofy',
        piece_size: 34359738368n,
        term_start_epoch: 4131302,
        term_min: 1051200,
        term_max: 5256000,
        sector: 37710,
        payload_cid: null
      }])

      await observeBuiltinActorEvents(pgPool, providerMock)
    })
  })
})
