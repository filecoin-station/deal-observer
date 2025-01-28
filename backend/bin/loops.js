import { fetchDealWithHighestActivatedEpoch, fetchDealWithLowestActivatedEpoch, fetchDealsWithNoPayloadCid } from '@filecoin-station/deal-observer-db/lib/database-access.js'
import { observeBuiltinActorEvents } from '../lib/deal-observer.js'
import { getChainHead } from '../lib/rpc-service/service.js'
import slug from 'slug'
import timers from 'node:timers/promises'
import * as Sentry from '@sentry/node'
import { updatePayloadCids } from '../lib/piece-indexer.js'

export const pieceIndexerLoop = async (rpcRequest, pixRequest, pgPool, options) => {
  const LOOP_NAME = 'Piece Indexer'
  let dealWithLowestActivatedEpoch
  let processingBlockHeight
  while (true) {
    const start = Date.now()
    try {
      if (processingBlockHeight === undefined) {
        dealWithLowestActivatedEpoch = (await fetchDealWithLowestActivatedEpoch(pgPool))
        processingBlockHeight = dealWithLowestActivatedEpoch ? dealWithLowestActivatedEpoch.activated_at_epoch : undefined
        if (processingBlockHeight === undefined) {
          console.log('No deals found in database, waiting for observer loop to insert active deals.')
        }
      } else {
        const dealsWithMissingPayloadCid = await fetchDealsWithNoPayloadCid(pgPool, processingBlockHeight, options.queryLimit)
        if (dealsWithMissingPayloadCid === null) {
          console.log('No deals with missing payload CID found')
        } else {
          console.log(`Found ${dealsWithMissingPayloadCid.length} deals with missing payload CID`)
          await updatePayloadCids(pgPool, rpcRequest, dealsWithMissingPayloadCid, pixRequest)
          processingBlockHeight = dealsWithMissingPayloadCid[dealsWithMissingPayloadCid.length - 1].activated_at_epoch
        }
      }
    } catch (e) {
      console.error(e)
      Sentry.captureException(e)
    }
    const dt = Date.now() - start
    console.log(`Loop "${LOOP_NAME}" took ${dt}ms`)

    // For local monitoring and debugging, we can omit sending data to InfluxDB
    if (options.influxToken) {
      options.recordTelemetry(`loop_${slug(LOOP_NAME, '_')}`, point => {
        point.intField('interval_ms', options.loopInterval)
        point.intField('duration_ms', dt)
      })
    }
    if (dt < options.loopInterval) {
      await timers.setTimeout(options.loopInterval - dt)
    }
  }
}

export const dealObserverLoop = async (makeRpcRequest, pgPool, options) => {
  while (true) {
    const start = Date.now()
    try {
      const currentChainHead = await getChainHead(makeRpcRequest)
      const currentFinalizedChainHead = currentChainHead.Height - options.finalityEpochs
      // If the storage is empty we start 2000 blocks into the past as that is the furthest we can go with the public glif rpc endpoints.
      const lastInsertedDeal = await fetchDealWithHighestActivatedEpoch(pgPool)
      const lastEpochStored = lastInsertedDeal ? lastInsertedDeal.height : currentChainHead.Height - options.maxPastEpochs
      console.log(`Last epoch stored: ${lastEpochStored}, current chain head: ${currentChainHead.Height}, current finalized chain head: ${currentFinalizedChainHead}`)
      for (let epoch = lastEpochStored + 1; epoch <= currentFinalizedChainHead; epoch++) {
        await observeBuiltinActorEvents(epoch, pgPool, makeRpcRequest)
      }
    } catch (e) {
      console.error(e)
      Sentry.captureException(e)
    }
    const dt = Date.now() - start
    console.log(`Loop "${options.loopName}" took ${dt}ms`)

    if (options.influxToken) {
      options.recordTelemetry(`loop_${slug(options.loopName, '_')}`, point => {
        point.intField('interval_ms', options.loopInterval)
        point.intField('duration_ms', dt)
      })
    }
    if (dt < options.loopInterval) {
      await timers.setTimeout(options.loopInterval - dt)
    }
  }
}
