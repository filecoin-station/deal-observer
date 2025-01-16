import { create } from '@ipld/schema/typed.js'
import { schemaDmt } from './builtin-actor-events-schemas.js'
import { base64pad } from 'multiformats/bases/base64'
import { encode as cborEncode, decode as cborDecode } from '@ipld/dag-cbor'

class Transformer {
  // A transformer which takes in a json object and returns a typed ClaimEvent object
  #claimEventTransformer
  #rawActorEventTransformer

  async build () {
    // TODO: Catch and log errors
    this.#claimEventTransformer = this.#createTransformer('ClaimEvent')
    this.#rawActorEventTransformer = this.#createTransformer('RawActorEvent')
    return this
  }

  #createTransformer (name) {
    // TODO: Catch and log errors
    return create(schemaDmt, name)
  }

  transform (typeName, data) {
    switch (typeName.toLowerCase()) {
      case 'claimevent':
        // TODO: Catch and log errors
        return this.#claimEventTransformer.toTyped(data)
      case 'rawactorevent':
        // TODO: Catch and log errors
        return this.#rawActorEventTransformer.toTyped(data)
      default:
        console.log(`Unknown type ${typeName}`)
    }
  }
}

const decodeCborInBase64 = (data) => {
  return cborDecode(base64pad.baseDecode(data))
}

const encodeCborInBase64 = (data) => {
  return base64pad.baseEncode(cborEncode(data))
}

export {
  decodeCborInBase64,
  encodeCborInBase64,
  Transformer
}
