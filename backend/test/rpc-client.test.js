import assert from 'node:assert'
import { describe, it } from 'node:test'
import { chainHeadTestData } from './test_data/chainHead.js'
import { rawActorEventTestData } from './test_data/rawActorEvent.js'
import { parse } from '@ipld/dag-json'
import { getActorEvents, getActorEventsFilter, getChainHead, getMinderInfoParameters, rpcRequest } from '../lib/rpc-service/service.js'
import { ClaimEvent } from '../lib/rpc-service/data-types.js'
import { Value } from '@sinclair/typebox/value'
import { minerPeerIds } from './test_data/minerInfo.js'
import { payloadCIDs } from './test_data/payloadCIDs.js'

describe('RpcApiClient', () => {
  const makeRpcRequest = async (method, params) => {
    switch (method) {
      case 'Filecoin.ChainHead':
        return parse(JSON.stringify(chainHeadTestData))
      case 'Filecoin.GetActorEventsRaw':
        return parse(JSON.stringify(rawActorEventTestData)).filter(e => e.height >= params[0].fromHeight && e.height <= params[0].toHeight)
      case 'Filecoin.StateMinerInfo':
        const result = minerPeerIds.get(params[0])
        return result
      default:
        console.error('Unknown method')
    }
  }

  const makepixRequest = async (providerId, pieceCid) => {
    const payloadCid = payloadCIDs.get(JSON.stringify({ minerId: '12D3KooWFAcH5f2JW56APsYttGksxsUV8CnVYeg4zFBtp22zyDhz', pieceCid: 'baga6ea4seaqepbqg7dxrdphrvusy3pmc5lelcczwwi5nydduyog655wgnby4ijq' }))
    return payloadCid
  }

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

  for (let blockHeight = 4622129; blockHeight < 4622129 + 11; blockHeight++) {
    it('retrieves minderInfos and payloadCids', async () => {
      const actorEvents = await getActorEvents(getActorEventsFilter(blockHeight, 'claim'), makeRpcRequest)
      for (let i = 0; i < actorEvents.length; i++) {
        const e = actorEvents[i]
        const parsedEvent = Value.Parse(ClaimEvent, e.event)
        const params = getMinderInfoParameters(parsedEvent.provider)
        const res = await makeRpcRequest('Filecoin.StateMinerInfo', params)

        assert(res)
        assert(res.PeerId)
        // TODO: Validate payloadCID
        // Currently the fetching of payload CIDs is limited to the data stored by the piece Indexer which does not store all combinations of Peer ID and piece CID required. 
      }
    })
  }
})
