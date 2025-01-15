import { create } from '@ipld/schema/typed.js'
import { schemaDmt } from './builtin-actor-events-schemas.js'

class Transformer {
  // A transformer which takes in a json object and returns a typed ClaimEvent object
  #claimEventTransformer

  async build () {
    // TODO: Catch and log errors
    this.#claimEventTransformer = this.#createTransformer('ClaimEvent')
    return this
  }

  #createTransformer (name) {
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
