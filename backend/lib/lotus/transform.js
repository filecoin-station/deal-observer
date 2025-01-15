import { base64pad } from 'multiformats/bases/base64'
import { encode as cborEncode, decode as cborDecode } from '@ipld/dag-cbor'
import { readFile } from 'node:fs/promises'
import { fromDSL } from '@ipld/schema/from-dsl.js'
import { create } from '@ipld/schema/typed.js'

class Transformer {
  // A transformer which takes in a json object and returns a typed ClaimEvent object
  #claimEventTransformer

  async build () {
    const schemaPath = new URL('../lotus/builtin-actor-events-schemas.ipldsch', import.meta.url)
    const schemaDsl = await readFile(schemaPath, 'utf8')
    const schemaDmt = fromDSL(schemaDsl)
    this.#claimEventTransformer = this.#createTransformer(schemaDmt, 'ClaimEvent')
    return this
  }

  #createTransformer (schemaDmt, name) {
    return create(schemaDmt, name)
  }

  transform (typeName, data) {
    switch (typeName) {
      case 'ClaimEvent':
        return this.#claimEventTransformer.toTyped(data)
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
