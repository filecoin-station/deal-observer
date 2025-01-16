import { after, before, beforeEach, describe, it, mock } from 'node:test'
import { createPgPool, migrateWithPgClient } from '@filecoin-station/deal-observer-db'
import { IpldSchema } from '../lib/rpc-service/ipld-schema.js'
import assert from 'assert'
import { claimTestEvent } from './test_data/claimEvent.js'
import { LotusService } from '../lib/rpc-service/service.js'
import { GLIF_RPC } from '../lib/config.js'
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
    })
  })

  describe('Transformer', () => {
    it('transforms a claim event payload to a typed object', async () => {
      const transformer = await (new IpldSchema().build())
      const transformedClaimEvent = transformer.applyType('ClaimEvent', claimTestEvent)
      assert(transformedClaimEvent !== undefined, 'transformedClaimEvent is undefined')
      assert.deepStrictEqual(transformedClaimEvent, claimTestEvent)
    })
  })

  describe('LotusService', () => {
    let lotusService

    it('test the retrieval of built in actor events', async () => {
    })
  })
})
