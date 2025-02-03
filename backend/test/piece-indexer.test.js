import { createPgPool, migrateWithPgClient } from '@filecoin-station/deal-observer-db'
import { before, beforeEach, it, describe, after } from 'node:test'
import { rawActorEventTestData } from './test_data/rawActorEvent.js'
import { chainHeadTestData } from './test_data/chainHead.js'
import { parse } from '@ipld/dag-json'
import { loadDeals, observeBuiltinActorEvents, storeActiveDeals } from '../lib/deal-observer.js'
import assert from 'assert'
import { minerPeerIds } from './test_data/minerInfo.js'
import { payloadCIDs } from './test_data/payloadCIDs.js'
import { checkCacheForRetrievablePayloads, indexPieces } from '../lib/piece-indexer.js'
import NodeCache from 'node-cache'
import { getMinerPeerId } from '../lib/rpc-service/service.js'
import { ActiveDealDbEntry } from '@filecoin-station/deal-observer-db/lib/types.js'
import { Value } from '@sinclair/typebox/value'

describe('deal-observer-backend piece indexer', () => {
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
      await observeBuiltinActorEvents(blockHeight, pgPool, makeRpcRequest)
    }
    assert.strictEqual(
      (await pgPool.query('SELECT * FROM active_deals')).rows.length,
      336
    )
  })

  it('piece indexer loop function fetches deals where there exists no payload yet and updates the database entry', async (t) => {
    const getDealPayloadCidCalls = []
    const payloadsCache = new NodeCache()
    const getDealPayloadCid = async (providerId, pieceCid) => {
      getDealPayloadCidCalls.push({ providerId, pieceCid })
      const payloadCid = payloadCIDs.get(JSON.stringify({ minerId: providerId, pieceCid }))
      return payloadCid?.payloadCid
    }

    assert.strictEqual(
      (await pgPool.query('SELECT * FROM active_deals WHERE payload_cid IS NULL')).rows.length,
      336
    )
    await indexPieces(makeRpcRequest, getDealPayloadCid, pgPool, 10000, payloadsCache)
    assert.strictEqual(getDealPayloadCidCalls.length, 336)
    assert.strictEqual(
      (await pgPool.query('SELECT * FROM active_deals WHERE payload_cid IS NULL')).rows.length,
      85 // Not all deals have a payload CID in the test data
    )
  })

  it('piece indexer checks cache for missing pyloads', async (t) => {
    const getDealPayloadCidCalls = []
    const payloadsCache = new NodeCache()
    const now = Date.now()
    const getDealPayloadCid = async (providerId, pieceCid) => {
      getDealPayloadCidCalls.push({ providerId, pieceCid })
      return payloadCIDs.get(JSON.stringify({ minerId: providerId, pieceCid }))?.payloadCid
    }

    await indexPieces(makeRpcRequest, getDealPayloadCid, pgPool, 10000, payloadsCache, now)
    const dealsWithNoPayloadCid = await loadDeals(pgPool, 'SELECT * FROM active_deals WHERE payload_cid IS NULL')
    const numDealsCached = payloadsCache.keys().length
    assert.strictEqual(dealsWithNoPayloadCid.length, numDealsCached)
    // Make sure that each one of the deals that has no payload is cached
    for (const deal of dealsWithNoPayloadCid) {
      const minerPeerId = await getMinerPeerId(deal.miner_id, makeRpcRequest)
      assert.deepStrictEqual(payloadsCache.get(JSON.stringify({ minerPeerId, pieceCid: deal.piece_cid })), { retriesLeft: 4, lastRetry: now })
    }
  })

  it('piece indexer cache retries fetching payloads correctly', async (t) => {
    const cache = new NodeCache()
    const payloadCid = 'PAYLOAD_CID'
    let returnPayload = false
    let payloadsCalled = 0
    const getDealPayloadCid = async () => {
      payloadsCalled++
      return returnPayload ? payloadCid : null
    }
    const minerPeerId = 'MINER_PEER_ID'
    const pieceCid = 'PIECE_CID'
    const now = Date.now()
    const deal = Value.Parse(ActiveDealDbEntry, {
      miner_id: 1,
      piece_cid: pieceCid,
      client_id: 1,
      activated_at_epoch: 1,
      piece_size: 1000,
      term_start_epoch: 1,
      term_min: 1,
      term_max: 1,
      sector_id: 1,
      payload_cid: undefined,
      payload_unretrievable: undefined
    })
    cache.set(JSON.stringify({ minerPeerId, pieceCid }), { retriesLeft: 2, lastRetry: now })
    checkCacheForRetrievablePayloads(minerPeerId, deal, getDealPayloadCid, cache, now)
    // Payloads should not be fetched as the last retry was less than 8 hours ago
    assert.strictEqual(payloadsCalled, 0)
    cache.set(JSON.stringify({ minerPeerId, pieceCid }), { retriesLeft: 2, lastRetry: now - 9 * 60 * 60 * 1000 })
    await checkCacheForRetrievablePayloads(minerPeerId, deal, getDealPayloadCid, cache, now)
    // Payloads should be fetched now as the last retry was more than 8 hours ago
    assert.strictEqual(payloadsCalled, 1)
    // After fetching the payload, the cache should be updated with the new retries left and last retry time
    assert.deepEqual(cache.get(JSON.stringify({ minerPeerId, pieceCid })), { retriesLeft: 1, lastRetry: now })

    // If we try again and there is only one retry left, the cache should delete the payload entry and deal should be marked to have an unretrievable paylod
    cache.set(JSON.stringify({ minerPeerId, pieceCid }), { retriesLeft: 1, lastRetry: now - 9 * 60 * 60 * 1000 })
    await checkCacheForRetrievablePayloads(minerPeerId, deal, getDealPayloadCid, cache, now)
    assert.strictEqual(payloadsCalled, 2)
    assert.strictEqual(cache.get(JSON.stringify({ minerPeerId, pieceCid })), undefined)
    assert.strictEqual(deal.payload_unretrievable, true)
    assert.strictEqual(deal.payload_cid, null)

    // If we set the payload to be retrievable the entry should be marked to not be unretrievable and it should be remove from the cache
    cache.set(JSON.stringify({ minerPeerId, pieceCid }), { retriesLeft: 2, lastRetry: now - 9 * 60 * 60 * 1000 })
    returnPayload = true
    await checkCacheForRetrievablePayloads(minerPeerId, deal, getDealPayloadCid, cache, now)
    assert.strictEqual(payloadsCalled, 3)
    assert.strictEqual(deal.payload_unretrievable, false)
    assert.strictEqual(deal.payload_cid, payloadCid)
    assert.strictEqual(cache.get(JSON.stringify({ minerPeerId, pieceCid })), undefined)
  })

  it('piece indexer updates deals that were set to be retrievable or not retrievable', async (t) => {
    const cache = new NodeCache()
    const payloadCid = 'PAYLOAD_CID'
    let returnPayload = false
    let payloadsCalled = 0
    const minerPeerId = 'MINER_PEER_ID'
    const getDealPayloadCid = async () => {
      payloadsCalled++
      return returnPayload ? payloadCid : null
    }
    const fetchMinerId = async () => {
      return { PeerId: minerPeerId }
    }
    const pieceCid = 'PIECE_CID'
    const now = Date.now()
    const deal = Value.Parse(ActiveDealDbEntry, {
      miner_id: 1,
      piece_cid: pieceCid,
      client_id: 1,
      activated_at_epoch: 1,
      piece_size: 1000,
      term_start_epoch: 1,
      term_min: 1,
      term_max: 1,
      sector_id: 1,
      payload_cid: undefined,
      payload_unretrievable: undefined
    })
    await pgPool.query('DELETE FROM active_deals')
    await storeActiveDeals([deal], pgPool)
    assert.deepStrictEqual((await loadDeals(pgPool, 'SELECT * FROM active_deals'))[0], deal)
    await indexPieces(fetchMinerId, getDealPayloadCid, pgPool, 10000, cache, now)
    assert.strictEqual(payloadsCalled, 1)
    assert.deepStrictEqual(cache.get(JSON.stringify({ minerPeerId, pieceCid })), { retriesLeft: 4, lastRetry: now })

    cache.set(JSON.stringify({ minerPeerId, pieceCid }), { retriesLeft: 1, lastRetry: now - 9 * 60 * 60 * 1000 })
    await indexPieces(fetchMinerId, getDealPayloadCid, pgPool, 10000, cache, now)
    assert.strictEqual(payloadsCalled, 2)
    deal.payload_unretrievable = true
    assert.deepStrictEqual((await loadDeals(pgPool, 'SELECT * FROM active_deals WHERE payload_unretrievable = TRUE'))[0], deal)

    await pgPool.query('DELETE FROM active_deals')
    await storeActiveDeals([deal], pgPool)
    cache.set(JSON.stringify({ minerPeerId, pieceCid }), { retriesLeft: 1, lastRetry: now - 9 * 60 * 60 * 1000 })
    returnPayload = true
    await indexPieces(fetchMinerId, getDealPayloadCid, pgPool, 10000, cache, now)
    assert.strictEqual(payloadsCalled, 3)
    deal.payload_unretrievable = false
    deal.payload_cid = payloadCid
    assert.deepStrictEqual((await loadDeals(pgPool, 'SELECT * FROM active_deals WHERE payload_unretrievable = FALSE'))[0], deal)
  })
})
