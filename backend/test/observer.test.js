import { after, before, beforeEach, describe, it } from 'node:test'
import { createPgPool, migrateWithPgClient } from '@filecoin-station/deal-observer-db'

import { observeBuiltinActorEvents } from '../lib/deal-observer.js'
import fs from 'fs'
import path from 'path'
import { Transformer } from '../lib/lotus/transform.js'
import assert from 'assert'
import { fileURLToPath } from 'url'
import { CID } from 'multiformats/cid';

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
      // TODO: reset DB
      // await pgPool.query('DELETE FROM daily_reward_transfers')

      providerMock = {
        getBlockNumber: async () => 2000
      }
    })

    // TODO - remove this placeholder and implement proper tests
    it('adds new FIL+ deals from built-in actor events', async () => {
      await observeBuiltinActorEvents(pgPool, providerMock)
    })
  })

  describe('Transformer', () => {
    const testData = {}
    beforeEach(async () => {
      const __filename = fileURLToPath(import.meta.url)
      const __dirname = path.dirname(__filename)

      const testDataPath = path.join(__dirname, 'test_data')
      // Read all files in the test_data directory
      fs.readdir(testDataPath, (_, files) => {
        files.forEach((file) => {
          if (path.extname(file) === '.json') {
            const filePath = path.join(testDataPath, file)
            const content = fs.readFileSync(filePath, 'utf-8')
            let parsedContent = JSON.parse(content)
            parsedContent.pieceCid = CID.parse(parsedContent.pieceCid['/'])
            const key = path.basename(file, '.json')
            testData[key] = parsedContent
          }
        })
      })
    })

    it('transforms a claim event payload to a typed object', async () => {
      const transformer = await (new Transformer().build())
      const claimEvent = testData.claimEvent
      const transformedClaimEvent = transformer.transform('ClaimEvent', claimEvent)
      assert(transformedClaimEvent !== undefined, 'transformedClaimEvent is undefined')
      assert.deepStrictEqual(transformedClaimEvent, claimEvent)
    })
  })
})
