import { createPgPool, migrateWithPgClient } from '@filecoin-station/deal-observer-db'
import { before, beforeEach, it, describe, after } from 'node:test'
import { rawActorEventTestData } from './test_data/rawActorEvent.js'
import { chainHeadTestData } from './test_data/chainHead.js'
import { parse } from '@ipld/dag-json'
import { observeBuiltinActorEvents } from '../lib/deal-observer.js'
import assert from 'assert'
import { minerPeerIds } from './test_data/minerInfo.js'
import { payloadCIDs } from './test_data/payloadCIDs.js'
import { indexPieces } from '../lib/piece-indexer.js'

/** @import {PgPool} from '@filecoin-station/deal-observer-db' */
/** @import {MakeRpcRequest, GetDealPayloadCid} from '../lib/typings.js' */

describe('deal-observer-backend piece indexer', () => {
  /** @type {MakeRpcRequest} */
  const makeRpcRequest = async (method, params) => {
    switch (method) {
      case 'Filecoin.ChainHead':
        return parse(JSON.stringify(chainHeadTestData))
      case 'Filecoin.GetActorEventsRaw': {
        assert(typeof params[0] === 'object' && params[0], 'params[0] must be an object')
        const filter = /** @type {{fromHeight: number; toHeight: number}} */(params[0])
        assert(typeof filter.fromHeight === 'number', 'filter.fromHeight must be a number')
        assert(typeof filter.toHeight === 'number', 'filter.toHeight must be a number')
        return parse(JSON.stringify(rawActorEventTestData)).filter((/** @type {{ height: number; }} */ e) => e.height >= filter.fromHeight && e.height <= filter.toHeight)
      }
      case 'Filecoin.StateMinerInfo':
        assert(typeof params[0] === 'string', 'params[0] must be a string')
        return minerPeerIds.get(params[0])
      default:
        console.error('Unknown method')
    }
  }
  /**
   * @type {PgPool}
   */
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
    /** @type {GetDealPayloadCid} */
    const getDealPayloadCid = async (providerId, pieceCid) => {
      getDealPayloadCidCalls.push({ providerId, pieceCid })
      const payloadCid = payloadCIDs.get(JSON.stringify({ minerId: providerId, pieceCid }))
      return payloadCid?.payloadCid ?? null
    }

    assert.strictEqual(
      (await pgPool.query('SELECT * FROM active_deals WHERE payload_cid IS NULL')).rows.length,
      336
    )
    await indexPieces(makeRpcRequest, getDealPayloadCid, pgPool, 10000)
    assert.strictEqual(getDealPayloadCidCalls.length, 336)
    assert.strictEqual(
      (await pgPool.query('SELECT * FROM active_deals WHERE payload_cid IS NULL')).rows.length,
      85 // Not all deals have a payload CID in the test data
    )
  })
})
