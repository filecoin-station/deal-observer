import { dateToEpoch } from '../lib/epoch.js'

/**
 * @param {Date} d
 * @returns {string}
 */
export const getLocalDayAsISOString = (d) => {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0')
  ].join('-')
}

export const today = () => getLocalDayAsISOString(new Date())
export const yesterday = () => getLocalDayAsISOString(new Date(Date.now() - 24 * 60 * 60 * 1000))
export const daysAgo = (n) => getLocalDayAsISOString(new Date(Date.now() - n * 24 * 60 * 60 * 1000))
export const daysFromNow = (n) => getLocalDayAsISOString(new Date(Date.now() + n * 24 * 60 * 60 * 1000))

/**
 * Calculate term start, term min, and term max from startsAt and expiresAt
 * @param {string} startsAt
 * @param {string} expiresAt
 */
export const calculateTerms = (startsAt, expiresAt) => {
  const termStart = dateToEpoch(new Date(startsAt))
  const termEndEpoch = dateToEpoch(new Date(expiresAt))
  const termEnd = termEndEpoch - termStart

  return { termStart, termMin: termEnd, termMax: termEnd }
}
