import { createPgPool } from '@filecoin-station/deal-observer-db'
import * as Sentry from '@sentry/node'
import '../lib/instrument.js'
import { createInflux } from '../lib/telemetry.js'
import { rpcRequest } from '../lib/rpc-service/service.js'
import assert from 'node:assert'
import { dealObserverLoop } from '../lib/deal-observer-loop.js'

const { INFLUXDB_TOKEN } = process.env
if (!INFLUXDB_TOKEN) {
  console.error('INFLUXDB_TOKEN not provided. Telemetry will not be recorded.')
}
const LOOP_INTERVAL = 10 * 1000
// Filecoin will need some epochs to reach finality.
// We do not want to fetch deals that are newer than the current chain head - 940 epochs.
const finalityEpochs = 940
const maxPastEpochs = 1999
assert(finalityEpochs <= maxPastEpochs)
const pgPool = await createPgPool()
const { recordTelemetry } = createInflux(INFLUXDB_TOKEN)
const controller = new AbortController()
const { signal } = controller

await dealObserverLoop(
  rpcRequest,
  pgPool,
  recordTelemetry,
  Sentry,
  maxPastEpochs,
  finalityEpochs,
  LOOP_INTERVAL,
  INFLUXDB_TOKEN,
  signal
)
