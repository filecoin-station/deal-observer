import assert from 'node:assert'
import { after, before, beforeEach, describe, it } from 'node:test'
import { createPgPool, migrateWithPgClient } from '@filecoin-station/deal-observer-db'
import { fetchDealWithHighestActivatedEpoch, storeActiveDeals } from '../lib/deal-observer.js'
import { ActiveDealDbEntry } from '@filecoin-station/deal-observer-db/lib/types.js'
import { Value } from '@sinclair/typebox/value'
import { BlockEvent } from '../lib/rpc-service/data-types.js'

describe('deal-observer-backend', () => {
  let pgPool
  before(async () => {
    pgPool = await createPgPool()
    await migrateWithPgClient(pgPool)
  })

  after(async () => {
    await pgPool.query('DELETE FROM active_deals')
    await pgPool.end()
  })

  beforeEach(async () => {
    await pgPool.query('DELETE FROM active_deals')
  })

  it('adds new FIL+ deals from built-in actor events to storage', async () => {
    const eventData = {
      id: 1,
      provider: 2,
      client: 3,
      pieceCid: 'baga6ea4seaqc4z4432snwkztsadyx2rhoa6rx3wpfzu26365wvcwlb2wyhb5yfi',
      pieceSize: 4n,
      termStart: 5,
      termMin: 12340,
      termMax: 12340,
      sector: 6n,
      payload_cid: undefined // not present in event data
    }
    const event = Value.Parse(BlockEvent, { height: 1, event: eventData, emitter: 'f06' })

    // @ts-ignore
    await storeActiveDeals([event], pgPool)
    const result = await pgPool.query('SELECT * FROM active_deals')
    const expectedData = {
      activated_at_epoch: event.height,
      miner_id: eventData.provider,
      client_id: eventData.client,
      piece_cid: eventData.pieceCid,
      piece_size: eventData.pieceSize,
      term_start_epoch: eventData.termStart,
      term_min: eventData.termMin,
      term_max: eventData.termMax,
      sector_id: eventData.sector,
      payload_cid: undefined
    }
    const actualData = result.rows.map((record) => {
      record.payload_cid = undefined
      return Value.Parse(ActiveDealDbEntry, record)
    })
    assert.deepStrictEqual(actualData, [expectedData])
  })
  it('check retrieval of last stored deal', async () => {
    const eventData = {
      id: 1,
      provider: 2,
      client: 3,
      pieceCid: 'baga6ea4seaqc4z4432snwkztsadyx2rhoa6rx3wpfzu26365wvcwlb2wyhb5yfi',
      pieceSize: 4n,
      termStart: 5,
      termMin: 12340,
      termMax: 12340,
      sector: 6n,
      payload_cid: undefined
    }
    const event = Value.Parse(BlockEvent, { height: 1, event: eventData, emitter: 'f06' })

    // @ts-ignore
    await storeActiveDeals([event], pgPool)
    const expected = Value.Parse(ActiveDealDbEntry, (await pgPool.query('SELECT * FROM active_deals')).rows.map(deal => {
      deal.payload_cid = undefined
      return deal
    })[0])
    const actual = await fetchDealWithHighestActivatedEpoch(pgPool)
    assert.deepStrictEqual(expected, actual)
  })
})
