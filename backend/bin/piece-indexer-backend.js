import { createPgPool } from '@filecoin-station/deal-observer-db'
import '../lib/instrument.js'
import { createInflux } from '../lib/telemetry.js'
import { rpcRequest } from '../lib/rpc-service/service.js'
import { pixRequest } from '../lib/pix-service/service.js'
import { pieceIndexerLoop } from './loops.js'

const { INFLUXDB_TOKEN } = process.env
if (!INFLUXDB_TOKEN) {
  console.error('INFLUXDB_TOKEN was not provided. Please set the INFLUXDB_TOKEN environment variable.')
}
const { recordTelemetry } = createInflux(INFLUXDB_TOKEN)

await pieceIndexerLoop(
  rpcRequest,
  pixRequest,
  await createPgPool(),
  {
    loopInterval: 10 * 1000,
    recordTelemetry,
    loopName: 'Piece Indexer',
    influxToken: INFLUXDB_TOKEN,
    queryLimit: 100000
  }
)
