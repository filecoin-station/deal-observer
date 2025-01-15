import { after, before, beforeEach, describe, it } from 'node:test'
import { createPgPool, migrateWithPgClient } from '@filecoin-station/deal-observer-db'
import fs from 'fs'
import path from 'path'
import { Transformer } from '../lib/lotus/transform.js'
import assert from 'assert'
import { fileURLToPath } from 'url'

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
    })
  })

  describe('test the transformation of events returned by the lotus api to typed events', () => {
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
            const parsedContent = JSON.parse(content)
            const key = path.basename(file, '.json')
            testData[key] = parsedContent
          }
        })
      })
    })

    it('transformer can correctly transform claim event json objects', async () => {
      const transformer = await (new Transformer().build())
      const claimEvent = testData.claimEvent
      const transformedClaimEvent = transformer.transform('ClaimEvent', claimEvent)
      assert.deepStrictEqual(transformedClaimEvent, testData.typedClaimEvent)
    })
  })
})
