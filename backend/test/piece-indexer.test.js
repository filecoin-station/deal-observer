import { createPgPool, migrateWithPgClient } from '@filecoin-station/deal-observer-db'
import { before, beforeEach, it, describe, after } from 'node:test'
import { rawActorEventTestData } from './test_data/rawActorEvent.js'
import { chainHeadTestData } from './test_data/chainHead.js'
import { parse } from '@ipld/dag-json'
import { observeBuiltinActorEvents } from '../lib/deal-observer.js'
import assert from 'assert'
import { minerPeerIds } from './test_data/minerInfo.js'
import { payloadCIDs } from './test_data/payloadCIDs.js'
import { pieceIndexerLoopFunction } from '../lib/piece-indexer.js'

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
  const makepixRequest = async (providerId, pieceCid) => {
    const payloadCid = payloadCIDs.get(JSON.stringify({ minerId: providerId, pieceCid }))
    // TODO: handle the case where the payloadCid is not found
    // For now we return a default payloadCid if there is a missing payload CID
    // See https://github.com/filecoin-station/deal-observer/pull/31
    return payloadCid ? payloadCid.payloadCid : 'baga6ea4seaqepbqg7dxrdphrvusy3pmc5lelcczwwi5nydduyog655wgnby4ijq'
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
    for (let blockHeight = 4622129; blockHeight < 4622129 + 11; blockHeight++) {
      await observeBuiltinActorEvents(blockHeight, pgPool, makeRpcRequest)
    }
    const allDeals = await pgPool.query('SELECT * FROM active_deals')
    assert.strictEqual(allDeals.rows.length, 360)
  })

  it('piece indexer loop function fetches deals where there exists not payload yet and updates the database entry', async (t) => {
    assert.strictEqual((await pgPool.query('SELECT * FROM active_deals WHERE payload_cid IS NULL')).rows.length, 360)
    await pieceIndexerLoopFunction(makeRpcRequest, makepixRequest, pgPool, 10000)
    assert.strictEqual((await pgPool.query('SELECT * FROM active_deals WHERE payload_cid IS NULL')).rows.length, 0)
  })
})
