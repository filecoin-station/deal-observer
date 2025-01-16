import { create } from '@ipld/schema/typed.js'
import { schemaDmt } from './builtin-actor-events-schemas.js'
import { base64pad } from 'multiformats/bases/base64'
import { encode as cborEncode, decode as cborDecode } from '@ipld/dag-cbor'

const decodeCborInBase64 = (data) => {
    return cborDecode(base64pad.baseDecode(data))
  }
  
  const encodeCborInBase64 = (data) => {
    return base64pad.baseEncode(cborEncode(data))
  }
  
  const rawEventEntriesToEvent = (rawEventEntries) => {
    const entries = rawEventEntries.entries
      // Each event is defined by a list of even entries which will will transform into a typed event
      const event = {}
      // TODO handle if there is no type entry
      let eventType
      for (const entry of entries) {
        // The key returned by the Lotus API is kebab-case, we convert it to camelCase
        const key = entry.Key.replace(/-([a-z])/g, (_, c) => c.toUpperCase())
        const value = decodeCborInBase64(entry.Value)
        // In each entry exists an event type declaration which we need to extract
        if (key === '$type') {
          eventType = value.concat('event')
          // The type entry is not part of the event itself
          continue
        }
        event[key] = value
      }
      return {event, eventType}
    }

  export    {
    decodeCborInBase64,
    encodeCborInBase64,
    rawEventEntriesToEvent
  }