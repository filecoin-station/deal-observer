import { Type } from '@sinclair/typebox'
const ClaimEvent = Type.Object({
  id: Type.Number(),
  client: Type.Number(),
  provider: Type.Number(),
  pieceCid: Type.Any(),
  pieceSize: Type.Number(),
  termMin: Type.Number(),
  termMax: Type.Number(),
  termStart: Type.Number(),
  sector: Type.Number()
})

const Entry = Type.Object({
  Codec: Type.Number(),
  Flags: Type.Number(),
  Key: Type.String(),
  Value: Type.String()
})

const RawActorEvent = Type.Object({
  emitter: Type.String(),
  entries: Type.Array(Entry),
  height: Type.Number(),
  reverted: Type.Boolean(),
  msgCid: Type.Any(),
  tipsetKey: Type.Array(Type.Any())
})

const BlockEvent = Type.Object({
  height: Type.Number(),
  emitter: Type.String(),
  event: ClaimEvent
})

export {
  ClaimEvent,
  Entry,
  RawActorEvent,
  BlockEvent
}
