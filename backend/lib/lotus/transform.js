import { readFile } from 'node:fs/promises'
import { fromDSL } from '@ipld/schema/from-dsl.js'
import { create } from '@ipld/schema/typed.js'

class Transformer {
  // A transformer which takes in a json object and returns a typed ClaimEvent object
  #claimEventTransformer

  async build () {
    const schemaPath = new URL('../lotus/builtin-actor-events-schemas.ipldsch', import.meta.url)
    // TODO: Catch and log errors
    const schemaDsl = await readFile(schemaPath, 'utf8')
    // TODO: Catch and log errors
    const schemaDmt = fromDSL(schemaDsl)

    // TODO: Catch and log errors
    this.#claimEventTransformer = this.#createTransformer(schemaDmt, 'ClaimEvent')
    return this
  }

  #createTransformer (schemaDmt, name) {
    // TODO: Catch and log errors
    return create(schemaDmt, name)
  }

  transform (typeName, data) {
    switch (typeName) {
      case 'ClaimEvent':
        // TODO: Catch and log errors
        return this.#claimEventTransformer.toTyped(data)
      default:
        console.log(`Unknown type ${typeName}`)
    }
  }
}

export {
  Transformer
}
