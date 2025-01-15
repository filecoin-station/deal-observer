import { after, before, beforeEach, describe, it } from 'node:test'
import { createPgPool, migrateWithPgClient } from '@filecoin-station/deal-observer-db'
import { observeBuiltinActorEvents } from '../lib/deal-observer.js'
import { Transformer } from '../lib/lotus/transform.js'
import assert from 'assert'
import { claimTestEvent } from './test_data/claimEvent.js'

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
      // TODO: reset DB
      // await pgPool.query('DELETE FROM daily_reward_transfers')

      providerMock = {
        getBlockNumber: async () => 2000
      }
    })

    // TODO - remove this placeholder and implement proper tests
    it('adds new FIL+ deals from built-in actor events', async () => {
      await observeBuiltinActorEvents(pgPool, providerMock)
    })
  })

  describe('Transformer', () => {
    it('transforms a claim event payload to a typed object', async () => {
      const transformer = await (new Transformer().build())
      const transformedClaimEvent = transformer.transform('ClaimEvent', claimTestEvent)
      assert(transformedClaimEvent !== undefined, 'transformedClaimEvent is undefined')
      assert.deepStrictEqual(transformedClaimEvent, claimTestEvent)
    })
  })
})
