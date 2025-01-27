import { createPgPool } from '@filecoin-station/deal-observer-db'
import * as Sentry from '@sentry/node'
import { ethers } from 'ethers'
import assert from 'node:assert/strict'
import timers from 'node:timers/promises'
import slug from 'slug'
import { RPC_URL, rpcHeaders } from '../lib/config.js'
import '../lib/instrument.js'
import {
  observeBuiltinActorEvents
} from '../lib/deal-observer.js'
import { createInflux } from '../lib/telemetry.js'
import { submitEligibleDeals } from '../lib/deal-submitter.js' 

const { 
  INFLUXDB_TOKEN,
  SPARK_API_BASE_URL,
  DEAL_INGESTER_TOKEN
} = process.env

assert(INFLUXDB_TOKEN, 'INFLUXDB_TOKEN required')
assert(SPARK_API_BASE_URL, 'SPARK_API_BASE_URL required')
assert(DEAL_INGESTER_TOKEN, 'DEAL_INGESTER_TOKEN required')

const pgPool = await createPgPool()

const fetchRequest = new ethers.FetchRequest(RPC_URL)
fetchRequest.setHeader('Authorization', rpcHeaders.Authorization || '')
const provider = new ethers.JsonRpcProvider(fetchRequest, null, { polling: true })

const { recordTelemetry } = createInflux(INFLUXDB_TOKEN)

const loop = async (name, fn, interval) => {
  while (true) {
    const start = Date.now()
    try {
      await fn()
    } catch (e) {
      console.error(e)
      Sentry.captureException(e)
    }
    const dt = Date.now() - start
    console.log(`Loop "${name}" took ${dt}ms`)

    recordTelemetry(`loop_${slug(name, '_')}`, point => {
      point.intField('interval_ms', interval)
      point.intField('duration_ms', dt)
    })

    if (dt < interval) {
      await timers.setTimeout(interval - dt)
    }
  }
}

await Promise.all([
  loop(
    'Built-in actor events',
    () => observeBuiltinActorEvents(pgPool, provider),
    30_000
  ),
  loop(
    'Report eligible deals',
    () => submitEligibleDeals(pgPool, SPARK_API_BASE_URL, DEAL_INGESTER_TOKEN),
    30_000
  )
])
