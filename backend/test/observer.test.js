import { after, before, beforeEach, describe, it } from 'node:test'
import { createPgPool, migrateWithPgClient } from '@filecoin-station/deal-observer-db'
import { IpldSchemaValidator } from '../lib/rpc-service/ipld-schema-validator.js'
import assert from 'assert'
import { claimTestEvent } from './test_data/claimEvent.js'
import { ActorEventFilter, RpcService } from '../lib/rpc-service/service.js'
import { chainHeadTestData } from './test_data/chainHead.js'
import { rawActorEventTestData } from './test_data/rawActorEvent.js'
import { parseCIDs } from './utils.js'

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
    beforeEach(async () => {
      // TODO: reset DB
      // await pgPool.query('DELETE FROM daily_reward_transfers')
    })

    // TODO - remove this placeholder and implement proper tests
    it('adds new FIL+ deals from built-in actor events', async () => {
    })
  })

  describe('IPLD Schema Validator', () => {
    let claimEvent

    before(() => {
      claimEvent = parseCIDs(claimTestEvent)
    })
    it('validates and converts a claim event payload to a typed object', async () => {
      const ipldSchema = await (new IpldSchemaValidator().build())
      const typedClaimEvent = ipldSchema.applyType('ClaimEvent', claimEvent)
      assert(typedClaimEvent !== undefined, 'typedClaimEvent is undefined')
      assert.deepStrictEqual(typedClaimEvent, claimTestEvent)
    })
  })

  describe('RpcService', () => {
    let rpcService

    before(async () => {
      const makeRpcRequest = async (method, params) => {
        switch (method) {
          case 'Filecoin.ChainHead':
            return parseCIDs(chainHeadTestData)
          case 'Filecoin.GetActorEventsRaw':
            return parseCIDs(rawActorEventTestData).filter(e => e.height >= params[0].fromHeight && e.height <= params[0].toHeight)
          default:
            console.error('Unknown method')
        }
      }

      rpcService = await (new RpcService(makeRpcRequest)).build()
    })
    it('test the retrieval of the chainHead', async () => {
      const chainHead = await rpcService.getChainHead()
      assert(chainHead)
      assert.deepStrictEqual(JSON.stringify(chainHead), JSON.stringify(chainHeadTestData))
    })

    it('test the retrieval of rawActorEvents', async () => {
      const actorEvents = await rpcService.getActorEvents(new ActorEventFilter(4622129, 4622139, ['claim']))
      assert(actorEvents)
      actorEvents.forEach(e => {
        assert(e.height >= 4622129 && e.height <= 4622139)
      })
    })
  })
})
