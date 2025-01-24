import { after, before, describe, it } from 'node:test'

import { createPgPool, migrateWithPgClient } from '../../db/index.js'
import { createApp } from '../lib/app.js'
import { assertResponseStatus } from './test-helpers.js'

const { DATABASE_URL = 'postgres://localhost:5432/spark_deal_observer' } = process.env

describe('HTTP request handler', () => {
  /** @type {import('@filecoin-station/deal-observer-db').PgPool} */
  let pgPool
  /** @type {import('fastify').FastifyInstance} */
  let app
  /** @type {string} */
  let baseUrl

  before(async () => {
    pgPool = await createPgPool()
    await migrateWithPgClient(pgPool)
    await pgPool.end()

    app = createApp({
      DATABASE_URL,
      logger: {
        level: process.env.DEBUG === '*' || process.env.DEBUG?.includes('test')
          ? 'debug'
          : 'error'
      }
    })

    baseUrl = await app.listen()
  })

  after(async () => {
    await app.close()
  })

  /* TODO: database reset
  beforeEach(async () => {
    await pgPools.evaluate.query('DELETE FROM retrieval_stats')
  })
  */

  it('returns 200 for GET /', async () => {
    const res = await fetch(new URL('/', baseUrl))
    await assertResponseStatus(res, 200)
  })

  it('returns 404 for unknown routes', async () => {
    const res = await fetch(new URL('/unknown-path', baseUrl))
    await assertResponseStatus(res, 404)
  })

  it('returns 404 when the path starts with double slash', async () => {
    const res = await fetch(`${baseUrl}//path-not-found`)
    await assertResponseStatus(res, 404)
  })
})
