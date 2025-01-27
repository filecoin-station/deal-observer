import assert from 'node:assert'
import { describe, it } from 'node:test'
import { dateToEpoch, unixToEpoch } from '../lib/epoch.js'

describe('epoch', () => {
  it('converts a date to an epoch', () => {
    const date = new Date('2024-12-10 07:13:30')
    const epoch = dateToEpoch(date)

    assert.strictEqual(epoch, 4516827)
  })

  it('converts a unix timestamp to an epoch', () => {
    const epoch = unixToEpoch(1733811210)

    assert.strictEqual(epoch, 4516827)
  })
})
