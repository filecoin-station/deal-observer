import { readFile } from 'node:fs/promises'
import { fromDSL } from '@ipld/schema/from-dsl.js'
import { create } from '@ipld/schema/typed.js'
import { base64pad } from 'multiformats/bases/base64'
import { encode as cborEncode, decode as cborDecode } from '@ipld/dag-cbor'

class Transformer {
  // A transformer which takes in a json object and returns a typed ClaimEvent object
  #claimEventTransformer
  #rawActorEventTransformer

  async build () {
    const schemaPath = new URL('../lotus/builtin-actor-events-schemas.ipldsch', import.meta.url)
    // TODO: Catch and log errors
    const schemaDsl = await readFile(schemaPath, 'utf8')
    // TODO: Catch and log errors
    const schemaDmt = fromDSL(schemaDsl)

    // TODO: Catch and log errors
    this.#claimEventTransformer = this.#createTransformer(schemaDmt, 'ClaimEvent')
    this.#rawActorEventTransformer = this.#createTransformer(schemaDmt, 'RawActorEvent')
    return this
  }

  #createTransformer (schemaDmt, name) {
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
