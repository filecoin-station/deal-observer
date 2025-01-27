import assert from 'node:assert'
import { describe, it } from 'node:test'
import { dateToEpoch } from '../lib/epoch.js'

describe('epoch', () => {
  describe('dateToEpoch', () => {
    it('converts a date to an epoch', () => {
      const date = new Date('2024-12-10 07:13:30')
      const epoch = dateToEpoch(date)

      assert.strictEqual(epoch, 4516827)
    })
  })
})
