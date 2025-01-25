import { Type } from '@sinclair/typebox'

const RpcRespone = Type.Object({
  result: Type.String()
})

export {
  RpcRespone
}
