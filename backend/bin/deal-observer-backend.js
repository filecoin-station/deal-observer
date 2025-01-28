import { createPgPool } from '@filecoin-station/deal-observer-db'
import '../lib/instrument.js'
import { createInflux } from '../lib/telemetry.js'
import { rpcRequest } from '../lib/rpc-service/service.js'
import assert from 'node:assert'
import { dealObserverLoop } from './loops.js'

const { INFLUXDB_TOKEN } = process.env
if (!INFLUXDB_TOKEN) {
  console.error('INFLUXDB_TOKEN not provided. Telemetry will not be recorded.')
}
// Filecoin will need some epochs to reach finality.
// We do not want to fetch deals that are newer than the current chain head - 940 epochs.
const finalityEpochs = 940
const maxPastEpochs = 1999
assert(finalityEpochs <= maxPastEpochs)
const { recordTelemetry } = createInflux(INFLUXDB_TOKEN)

await dealObserverLoop(
  rpcRequest,
  await createPgPool(),
  {
    finalityEpochs,
    maxPastEpochs,
    recordTelemetry,
    loopName: 'Built-in actor events',
    influxDbToken: INFLUXDB_TOKEN,
    loopInterval: 100_000
  }
)
