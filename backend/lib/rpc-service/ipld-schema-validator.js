import { create } from '@ipld/schema/typed.js'
import { schemaDmt } from './builtin-actor-events-schemas.js'

class IpldSchemaValidator {
  // A validator which takes in a json object and returns a typed ClaimEvent object if the data matches the schema
  #claimEventSchema
  #rawActorEventSchema

  async build () {
    // TODO: Catch and log errors
    this.#claimEventSchema = this.#createType('ClaimEvent')
    this.#rawActorEventSchema = this.#createType('RawActorEvent')
    return this
  }

  static async create () {
    const validator = new IpldSchemaValidator()
    return await validator.build()
  }

  #createType (name) {
    // TODO: Catch and log errors
    return create(schemaDmt, name)
  }

  applyType (typeName, data) {
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
  IpldSchemaValidator
}
