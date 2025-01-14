import createDebug from 'debug'
import { once } from 'node:events'
import http from 'node:http'
import { after, before, describe, it } from 'node:test'

import { createPgPool, migrateWithPgClient } from '../../db/index.js'
import { createHandler } from '../lib/handler.js'
import { assertResponseStatus, getPort } from './test-helpers.js'

const debug = createDebug('test')

describe('HTTP request handler', () => {
  /** @type {import('@filecoin-station/deal-observer-db').PgPool} */
  let pgPool
  /** @type {http.Server} */
  let server
  /** @type {string} */
  let baseUrl

  before(async () => {
    pgPool = await createPgPool()
    await migrateWithPgClient(pgPool)

    const handler = createHandler({
      pgPool,
      logger: {
        info: debug,
        error: console.error,
        request: debug
      }
    })

    server = http.createServer(handler)
    server.listen()
    await once(server, 'listening')
    baseUrl = `http://127.0.0.1:${getPort(server)}`
  })

  after(async () => {
    server.closeAllConnections()
    server.close()
    await pgPool.end()
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
