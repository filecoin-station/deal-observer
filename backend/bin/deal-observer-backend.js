import { createPgPool } from '@filecoin-station/deal-observer-db'
import * as Sentry from '@sentry/node'
import { ethers } from 'ethers'
import timers from 'node:timers/promises'
import slug from 'slug'
import { RPC_URL, rpcHeaders } from '../lib/config.js'
import '../lib/instrument.js'
import {
  DealObserver
} from '../lib/deal-observer.js'
import { createInflux } from '../lib/telemetry.js'
import assert from 'node:assert'

const { INFLUXDB_TOKEN } = process.env
//assert(INFLUXDB_TOKEN, 'INFLUXDB_TOKEN required')
const LOOP_BACK_INTERVAL = 10 * 1000
// Filecoin will need some epochs to reach finality.
// We do not want to fetch deals that are newer than the current chain head - 940 epochs.
const finalityEpochs = 940
const pgPool = await createPgPool()

const fetchRequest = new ethers.FetchRequest(RPC_URL)
fetchRequest.setHeader('Authorization', rpcHeaders.Authorization || '')
const NAME = 'Built-in actor events'
const { recordTelemetry } = createInflux(INFLUXDB_TOKEN)

const dealObserverLoop = async (dealObserver) => {
  while (true) {
    const start = Date.now()
    try {
      // If the store is empty we set the lastEpochStore to 0 and start fetching from the current chain head
      const currentChainHead = await dealObserver.getChainHead()
      const currentFinalizedChainHead = currentChainHead.Height - finalityEpochs
      const lastEpochStored = await dealObserver.fetchDealWithHighestActivatedEpoch().height ?? currentFinalizedChainHead - 1
      if (lastEpochStored < currentFinalizedChainHead) {
        // TODO: The free plan does not allow for fetching epochs older than 2000 blocks. We need to account for that.
        for (const epoch of Array.from({ length: currentFinalizedChainHead - lastEpochStored + 1 }, (_, i) => i + lastEpochStored)) {
          await dealObserver.observeBuiltinActorEvents(epoch)
        }
      }
    } catch (e) {
      console.error(e)
      Sentry.captureException(e)
    }
    const dt = Date.now() - start
    console.log(`Loop ${NAME}" took ${dt}ms`)

    // Remove once influx db is enabled 
    if (INFLUXDB_TOKEN){
      recordTelemetry(`loop_${slug(NAME, '_')}`, point => {
        point.intField('interval_ms', LOOP_BACK_INTERVAL)
        point.intField('duration_ms', dt)
      })
    }
    if (dt < LOOP_BACK_INTERVAL) {
      await timers.setTimeout(LOOP_BACK_INTERVAL - dt)
    }
  }
}

Promise.all([
  dealObserverLoop(
    new DealObserver(pgPool)
  )
])

