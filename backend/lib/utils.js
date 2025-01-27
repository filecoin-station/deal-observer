/** @import { BlockEvent } from './rpc-service/data-types.js' */
import { ActiveDealDbEntry } from '@filecoin-station/deal-observer-db/lib/types.js'
import { Value } from '@sinclair/typebox/value'
/** @import { Static } from '@sinclair/typebox' */

/**
 *
 * @param {Static <typeof BlockEvent>} blockEvent
 * @returns { Static < typeof ActiveDealDbEntry> }
 */
export function convertBlockEventTyActiveDealDbEntry (blockEvent) {
  return Value.Parse(ActiveDealDbEntry, {
    activated_at_epoch: blockEvent.height,
    miner_id: blockEvent.event.provider,
    client_id: blockEvent.event.client,
    piece_cid: blockEvent.event.pieceCid,
    piece_size: blockEvent.event.pieceSize,
    term_start_epoch: blockEvent.event.termStart,
    term_min: blockEvent.event.termMin,
    term_max: blockEvent.event.termMax,
    sector_id: blockEvent.event.sector,
    payload_cid: undefined
  })
}

/**
 * Fetch a URL with exponential backoff
 * @param {function} request - The request function to call
 * @param {number} maxRetries - The maximum number of retries
 * @param {number} initialDelay - The initial delay in milliseconds
 * @returns {Promise<object>}
 */
export async function fetchWithExponentialBackoff (request, maxRetries = 5, initialDelay = 5000) {
  let attempt = 0
  let delay = initialDelay

  while (attempt < maxRetries) {
    try {
      const response = await request()
      if (!response.ok) {
        throw new Error(`Fetch failed - HTTP ${response.status}: ${response.text()}`)
      }
      return await response.json()
    } catch (error) {
      attempt++
      if (attempt >= maxRetries) {
        console.error(`Failed after ${maxRetries} attempts:`, error.message)
        throw error
      }

      console.warn(`Attempt ${attempt} failed. Retrying in ${delay} ms...`)
      await new Promise((resolve) => setTimeout(resolve, delay))
      delay = delay * 2
    }
  }
}
