import assert from 'node:assert'
import { describe, it } from 'node:test'
import { chainHeadTestData } from './test_data/chainHead.js'
import { parse } from '@ipld/dag-json'
import { getActorEvents, getActorEventsFilter, getChainHead, rpcRequest } from '../lib/rpc-service/service.js'
import { ClaimEvent } from '../lib/rpc-service/data-types.js'
import { Value } from '@sinclair/typebox/value'
import { makeRpcRequest } from './utils.js'

describe('RpcApiClient', () => {
  it('retrieves the chainHead', async () => {
    const chainHead = await getChainHead(makeRpcRequest)
    assert(chainHead)
    const expected = parse(JSON.stringify(chainHeadTestData))
    assert.deepStrictEqual(chainHead, expected)
  })

  for (let blockHeight = 4622129; blockHeight < 4622129 + 11; blockHeight++) {
    it(`retrieves rawActorEvents in block ${blockHeight}`, async () => {
      const actorEvents = await getActorEvents(getActorEventsFilter(blockHeight, 'claim'), makeRpcRequest)
      assert(actorEvents)
      assert(actorEvents.length > 0)
      actorEvents.forEach(e => {
        // Validate type
        const parsedEvent = Value.Parse(ClaimEvent, e.event)
        assert(parsedEvent)
        assert.strictEqual(e.height, blockHeight)
      })
    })
  }
  it('smoketest for testing the real rpc api endpoint', async () => {
    const chainHead = await getChainHead(rpcRequest)
    assert(chainHead)
    const actorEvents = await getActorEvents(getActorEventsFilter(chainHead.Height - 1000, 'claim'), rpcRequest)
    assert(actorEvents)
  })
})
