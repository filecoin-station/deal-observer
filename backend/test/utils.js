import { CID } from 'multiformats'
import { chainHeadTestData } from './test_data/chainHead.js'
import { rawActorEventTestData } from './test_data/rawActorEvent.js'
import { base32 } from 'multiformats/bases/base32'

// Extracting CIDs from JSON objects for easier testing
const parseCIDs = (jsonObject) => {
  if ( jsonObject instanceof CID){
    return jsonObject
  }
  for (const key in jsonObject) {
    if (key === "/"){
      try {
      let decoded = base32.decode(jsonObject[key])
      return CID.decode(decoded)
    }
      catch (error){
        console.error('Failed to decode CID key value object error', key, jsonObject[key], jsonObject,error)
        continue
      }
    }
    let value = jsonObject[key]
    if (Array.isArray(value)){
      jsonObject[key] = value.map((v) => parseCIDs(v))
    }
    if (typeof value === 'object'){
      jsonObject[key] = parseCIDs(value)
    }
  }
  return jsonObject
}

export { parseCIDs }