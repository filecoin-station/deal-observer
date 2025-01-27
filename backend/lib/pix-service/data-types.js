import { Type } from '@sinclair/typebox'

const PixResponse = Type.Object({
  samples: Type.Array(Type.String())
})

export {
  PixResponse
}
