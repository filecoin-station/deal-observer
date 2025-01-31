// Copied from: https://observablehq.com/@protocol/filecoin-epoch-calculator
const FILECOIN_GENESIS_UNIX_EPOCH = 1598306400

/**
 * Calculate the Filecoin epoch for a given Unix timestamp
 * @param {number} unixTimestamp
 * @returns {number}
 */
export const unixToEpoch = (unixTimestamp) => {
  return Math.floor((unixTimestamp - FILECOIN_GENESIS_UNIX_EPOCH) / 30)
}

/**
 * Calculate the Filecoin epoch for a given date
 *
 * @param {Date} date
 * @returns {number}
 */
export const dateToEpoch = (date) => {
  return unixToEpoch(date.getTime() / 1000)
}
