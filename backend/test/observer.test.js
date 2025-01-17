import assert from 'node:assert'
import { after, before, beforeEach, describe, it } from 'node:test'
import { createPgPool, migrateWithPgClient } from '@filecoin-station/deal-observer-db'
import { IpldSchemaValidator } from '../lib/rpc-service/ipld-schema-validator.js'
import { claimTestEvent } from './test_data/claimEvent.js'
import { ActorEventFilter, RpcApiClient } from '../lib/rpc-service/service.js'
import { chainHeadTestData } from './test_data/chainHead.js'
import { rawActorEventTestData } from './test_data/rawActorEvent.js'
import { parse } from '@ipld/dag-json'

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
      
  })
})

  describe('IPLD Schema Validator', () => {
    let claimEvent

    before(() => {
      claimEvent = parse(JSON.stringify(claimTestEvent))
    })
    it('validates and converts a claim event payload to a typed object', async () => {
      const ipldSchema = await (new IpldSchemaValidator().build())
      const typedClaimEvent = ipldSchema.applyType('ClaimEvent', claimEvent)
      assert(typedClaimEvent !== undefined, 'typedClaimEvent is undefined')
      assert.deepStrictEqual(typedClaimEvent, claimEvent)
    })
  })

  describe('RpcApiClient', () => {
    let rpcApiClient

    before(async () => {
      const makeRpcRequest = async (method, params) => {
        switch (method) {
          case 'Filecoin.ChainHead':
            return parse(JSON.stringify(chainHeadTestData))
          case 'Filecoin.GetActorEventsRaw':
            return parse(JSON.stringify(rawActorEventTestData)).filter(e => e.height >= params[0].fromHeight && e.height <= params[0].toHeight)
          default:
            console.error('Unknown method')
        }
      }

      rpcApiClient = await (new RpcApiClient(makeRpcRequest)).build()
    })
    it('test the retrieval of the chainHead', async () => {
      const chainHead = await rpcApiClient.getChainHead()
      assert(chainHead)
      assert.deepStrictEqual(JSON.stringify(chainHead), JSON.stringify(chainHeadTestData))
    })

    it('test the retrieval of rawActorEvents', async () => {
      const validator = await IpldSchemaValidator.create()
      Array.from({ length: 11 }, (_, i) => 4622129 + i).flatMap(async (blockHeight) => {
        const actorEvents = await rpcApiClient.getActorEvents(new ActorEventFilter(blockHeight, 'claim'))
        assert(actorEvents)
        actorEvents.forEach(e => {
        // Validate type
          assert(validator.applyType('ClaimEvent', {
            id: e.event.id,
            client: e.event.client,
            provider: e.event.provider,
            pieceCid: e.event.pieceCid,
            pieceSize: e.event.pieceSize,
            termMin: e.event.termMin,
            termMax: e.event.termMax,
            termStart: e.event.termStart,
            sector: e.event.sector
          }), `Invalid claim event: ${JSON.stringify(e.event)}`)

          assert(e.height >= 4622129 && e.height <= 4622139)
        })
      }
      )
    })
  })
})
