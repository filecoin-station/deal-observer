import { create } from '@ipld/schema/typed.js'
import { schemaDmt } from './builtin-actor-events-schemas.js'
import { base64pad } from 'multiformats/bases/base64'
import { encode as cborEncode, decode as cborDecode } from '@ipld/dag-cbor'

class IpldSchema {
  // A transformer which takes in a json object and returns a typed ClaimEvent object
  #claimEventSchema
  #rawActorEventSchema

  async build() {
    // TODO: Catch and log errors
    this.#claimEventSchema = this.#createType('ClaimEvent')
    this.#rawActorEventSchema = this.#createType('RawActorEvent')
    return this
  }

  #createType(name) {
    // TODO: Catch and log errors
    return create(schemaDmt, name)
  }

  applyType(typeName, data) {
    switch (typeName.toLowerCase()) {
      case 'claimevent':
        // TODO: Catch and log errors
        return this.#claimEventSchema.toTyped(data)
      case 'rawactorevent':
        // TODO: Catch and log errors
        return this.#rawActorEventSchema.toTyped(data)
      default:
        console.log(`Unknown type ${typeName}`)
    }
  }
}

export {
  IpldSchema
}
