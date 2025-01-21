import assert from 'node:assert'
import { describe, it } from 'node:test'
import { chainHeadTestData } from './test_data/chainHead.js'
import { rawActorEventTestData } from './test_data/rawActorEvent.js'
import { parse } from '@ipld/dag-json'
import { getActorEvents, getActorEventsFilter, getChainHead } from '../lib/rpc-service/service.js'
import { ClaimEvent } from '../lib/rpc-service/data-types.js'
import { Value } from '@sinclair/typebox/value'

describe('RpcApiClient', () => {
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

  it('test the retrieval of the chainHead', async () => {
    const chainHead = await getChainHead(makeRpcRequest)
    assert(chainHead)
    const expected = parse(JSON.stringify(chainHeadTestData))
    assert.deepStrictEqual(chainHead, expected)
  })

  it('test the retrieval of rawActorEvents', async () => {
    Array.from({ length: 11 }, (_, i) => 4622129 + i).flatMap(async (blockHeight) => {
      const actorEvents = await getActorEvents(getActorEventsFilter(blockHeight, 'claim'), makeRpcRequest)
      assert(actorEvents)
      assert(actorEvents.length > 0)
      actorEvents.forEach(e => {
        // Validate type
        let parsedEvent = Value.Parse(ClaimEvent, e.event)
        assert(parsedEvent, `Invalid claim event: ${JSON.stringify(e.event)}`)
        assert(e.height >= 4622129 && e.height <= 4622139)
      })
    }
    )
  })
})
