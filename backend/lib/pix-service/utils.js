import { base64pad } from 'multiformats/bases/base64'

const encodeInBase64 = (data) => {
  return base64pad.baseEncode(data)
}

// Standard cache options
const cacheOptions = {
  // Max number of items in the cache
  max: 10000,

  updateAgeOnGet: true,
  updateAgeOnHas: true
}

export { encodeInBase64, cacheOptions }
