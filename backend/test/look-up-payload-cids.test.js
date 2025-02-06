import { createPgPool, migrateWithPgClient } from '@filecoin-station/deal-observer-db'
import { before, beforeEach, it, describe, after } from 'node:test'
import { rawActorEventTestData } from './test_data/rawActorEvent.js'
import { chainHeadTestData } from './test_data/chainHead.js'
import { parse } from '@ipld/dag-json'
import { fetchAndStoreActiveDeals } from '../lib/deal-observer.js'
import assert from 'assert'
import { minerPeerIds } from './test_data/minerInfo.js'
import { payloadCIDs } from './test_data/payloadCIDs.js'
import { countStoredActiveDealsWithUnresolvedPayloadCid, lookUpPayloadCids } from '../lib/look-up-payload-cids.js'

describe('deal-observer-backend look up payload CIDs', () => {
  const makeRpcRequest = async (method, params) => {
    switch (method) {
      case 'Filecoin.ChainHead':
        return parse(JSON.stringify(chainHeadTestData))
      case 'Filecoin.GetActorEventsRaw':
        return parse(JSON.stringify(rawActorEventTestData)).filter(e => e.height >= params[0].fromHeight && e.height <= params[0].toHeight)
      case 'Filecoin.StateMinerInfo':
        return minerPeerIds.get(params[0])
      default:
        console.error('Unknown method')
    }
  }
  let pgPool
  before(async () => {
    pgPool = await createPgPool()
    await migrateWithPgClient(pgPool)
  })

  after(async () => {
    await pgPool.end()
  })

  beforeEach(async () => {
    await pgPool.query('DELETE FROM active_deals')
    const startEpoch = 4622129
    for (let blockHeight = startEpoch; blockHeight < startEpoch + 10; blockHeight++) {
      await fetchAndStoreActiveDeals(blockHeight, pgPool, makeRpcRequest)
    }
    assert.strictEqual(
      (await pgPool.query('SELECT * FROM active_deals')).rows.length,
      336
    )
  })

  it('piece indexer loop function fetches deals where there exists no payload yet and updates the database entry', async (t) => {
    const getDealPayloadCidCalls = []
    const getDealPayloadCid = async (providerId, pieceCid) => {
      getDealPayloadCidCalls.push({ providerId, pieceCid })
      const payloadCid = payloadCIDs.get(JSON.stringify({ minerId: providerId, pieceCid }))
      return payloadCid?.payloadCid
    }

    assert.strictEqual(
      (await pgPool.query('SELECT * FROM active_deals WHERE payload_cid IS NULL')).rows.length,
      336
    )
    await lookUpPayloadCids(makeRpcRequest, getDealPayloadCid, pgPool, 10000)
    assert.strictEqual(getDealPayloadCidCalls.length, 336)
    assert.strictEqual(
      (await pgPool.query('SELECT * FROM active_deals WHERE payload_cid IS NULL')).rows.length,
      85 // Not all deals have a payload CID in the test data
    )
  })

  it('piece indexer count number of missing payload CIDs', async () => {
    let missingPayloadCids = await countStoredActiveDealsWithUnresolvedPayloadCid(pgPool)
    assert.strictEqual(missingPayloadCids, 336n)
    const getDealPayloadCidCalls = []
    const getDealPayloadCid = async (providerId, pieceCid) => {
      getDealPayloadCidCalls.push({ providerId, pieceCid })
      const payloadCid = payloadCIDs.get(JSON.stringify({ minerId: providerId, pieceCid }))
      return payloadCid?.payloadCid
    }

    await lookUpPayloadCids(makeRpcRequest, getDealPayloadCid, pgPool, 10000)
    missingPayloadCids = await countStoredActiveDealsWithUnresolvedPayloadCid(pgPool)
    assert.strictEqual(missingPayloadCids, 85n)
  })
})
