import { after, before, beforeEach, describe, it, mock } from 'node:test'
import { createPgPool, migrateWithPgClient } from '@filecoin-station/deal-observer-db'
import { IpldSchema } from '../lib/rpc-service/ipld-schema.js'
import assert from 'assert'
import { claimTestEvent } from './test_data/claimEvent.js'
import { ActorEventFilter, LotusService } from '../lib/rpc-service/service.js'
import { GLIF_RPC } from '../lib/config.js'
import { CID } from 'multiformats'
import { chainHeadTestData } from './test_data/chainHead.js'
import { rawActorEventTestData } from './test_data/rawActorEvent.js'
import { base32 } from 'multiformats/bases/base32'
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
    let claimEvent

    before(() => {
      claimEvent = parseCIDs(claimTestEvent)
    })
    it('transforms a claim event payload to a typed object', async () => {
      const ipldSchema = await (new IpldSchema().build())
      const typedClaimEvent = ipldSchema.applyType('ClaimEvent', claimEvent)
      assert(typedClaimEvent !== undefined, 'typedClaimEvent is undefined')
      assert.deepStrictEqual(typedClaimEvent, claimTestEvent)
    })
  })

  describe('LotusService', () => {
    let lotusService 

    before(async () => {
      const make_rpc_request = async (method,params) => {
        switch (method) {
          case 'Filecoin.ChainHead':
            let result = parseCIDs(chainHeadTestData)
              return parseCIDs(chainHeadTestData)
          case 'Filecoin.GetActorEventsRaw':
            let testData = parseCIDs(rawActorEventTestData)
            let from = params[0].fromHeight
            let to = params[0].toHeight
            return testData.filter(e => e.height >= params[0].fromHeight && e.height <= params[0].toHeight)
          default:
            console.error('Unknown method')
      }
    }

      lotusService = await(new LotusService(make_rpc_request)).build()
    })
    it('test the retrieval of the chainHead', async () => {
      const chainHead = await lotusService.getChainHead()
      assert(chainHead)
      assert.deepStrictEqual(JSON.stringify(chainHead), JSON.stringify(chainHeadTestData))
    })

    it('test the retrieval of rawActorEvents', async () => {
      let schema = await (new IpldSchema().build())
      const actorEvents = await lotusService.getActorEvents(new ActorEventFilter(4622129, 4622139, ["claim"]))
      assert(actorEvents)
      actorEvents.forEach(e => {
      assert(e.height >= 4622129 && e.height <= 4622139)
      })
    })
  })
})
