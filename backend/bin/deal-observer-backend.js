import { createPgPool } from '@filecoin-station/deal-observer-db'
import * as Sentry from '@sentry/node'
import { ethers } from 'ethers'
import assert from 'node:assert/strict'
import timers from 'node:timers/promises'
import slug from 'slug'
import { RPC_URL, rpcHeaders } from '../lib/config.js'
import '../lib/instrument.js'
import {
  DealObserver
} from '../lib/deal-observer.js'
import { createInflux } from '../lib/telemetry.js'

//const { INFLUXDB_TOKEN } = process.env
//assert(INFLUXDB_TOKEN, 'INFLUXDB_TOKEN required')

const pgPool = await createPgPool()
// Filecoin will need some epochs to reach finality. 
// We do not want to fetch deals that are newer than the current chain head - 900 epochs.
const finalityEpochs = 900

const fetchRequest = new ethers.FetchRequest(RPC_URL)
fetchRequest.setHeader('Authorization', rpcHeaders.Authorization || '')
// const provider = new ethers.JsonRpcProvider(fetchRequest, null, { polling: true })

// const { recordTelemetry } = createInflux(INFLUXDB_TOKEN)

const loop = async (dealObserver, name, interval) => {
  while (true) {
    const start = Date.now()
    try {
      // If the store is empty we set the lastEpochStore to 0 and start fetching from the current chain head
      let currentChainHead = await dealObserver.getChainHead()
      let currentFinalizedChainHead = currentChainHead.Height - finalityEpochs
      let lastEpochStored = await dealObserver.getLastStoredHeight() ?? currentFinalizedChainHead - 1 
      if (lastEpochStored < currentFinalizedChainHead) {
        // TODO: The free plan does not allow for fetching epochs older than 2000 blocks. We need to account for that. 
        // TODO: Since we call each epoch individually and the db write is not the bottleneck we can parallelize this process
        for (const epoch of Array.from({ length: currentFinalizedChainHead - lastEpochStored + 1 }, (_, i) => i + lastEpochStored)){
          await dealObserver.observeBuiltinActorEvents(epoch)
        }
      }
      lastEpochStored = await dealObserver.getLastStoredHeight()
      // The storage should now be up to date with the last epoch stored
      assert(lastEpochStored == currentFinalizedChainHead, 'Last stored height should not be less than current finalized chain head')
    } catch (e) {
      console.error(e)
      Sentry.captureException(e)
    }
    const dt = Date.now() - start
    console.log(`Loop ${name}" took ${dt}ms`)

    // recordTelemetry(`loop_${slug(name, '_')}`, point => {
    //   point.intField('interval_ms', interval)
    //   point.intField('duration_ms', dt)
    // })

    if (dt < interval) {
      await timers.setTimeout(interval - dt)
    }
  }
}

await Promise.all([
  DealObserver.create(pgPool).then(async (dealObserver) =>
    await loop(
      dealObserver,
      'Built-in actor events',
      30_000
    )
  )
])
