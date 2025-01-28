import { Type } from '@sinclair/typebox'

// The response type from the piece indexer api
const PixResponse = Type.Object({
  samples: Type.Array(Type.String())
})

export {
  PixResponse
}
