import { createPgPool, migrateWithPgClient } from '@filecoin-station/deal-observer-db'
import { dealObserverLoop } from '../lib/deal-observer-loop.js'
import { before, beforeEach, it, describe, after } from 'node:test'
import { rawActorEventTestData } from './test_data/rawActorEvent.js'
import { chainHeadTestData } from './test_data/chainHead.js'
import { parse } from '@ipld/dag-json'

describe('dealObserverLoop', () => {
  let pgPool
  const makeRpcRequest = async (method, params) => {
    switch (method) {
      case 'Filecoin.ChainHead':
        return parse(JSON.stringify(chainHeadTestData))
      case 'Filecoin.GetActorEventsRaw':
        return parse(JSON.stringify(rawActorEventTestData)).filter(e => e.height >= params[0].fromHeight && e.height <= params[0].toHeight)
      default:
        throw new Error(`Unsupported RPC API method: "${method}"`)
    }
  }
  before(async () => {
    pgPool = await createPgPool()
    await migrateWithPgClient(pgPool)
  })

  after(async () => {
    await pgPool.end()
  })

  beforeEach(async () => {
    await pgPool.query('DELETE FROM active_deals')
  })

  it('then deal observer loop fetches new active deals and stores them in storage', async (t) => {
    const controller = new AbortController()
    const { signal } = controller
    const waitForDealCount = async (targetCount) => {
      while (true) {
        const { rows } = (await pgPool.query('SELECT COUNT(*) FROM active_deals'))
        console.log('Current deal count:', rows[0].count)
        if (parseInt(rows[0].count) === targetCount) break
      }
      controller.abort()
    }
    const failOnTimeout = async () => { await setTimeout(() => { if (!signal.aborted) { throw new Error('Test timed out') } }, 2000) }
    await Promise.all([failOnTimeout(), waitForDealCount(360),
      dealObserverLoop(
        makeRpcRequest,
        pgPool,
        undefined,
        undefined,
        // The testdata has a total amount of 11 blocks
        11,
        0,
        100,
        undefined,
        signal
      )])
  })
})
