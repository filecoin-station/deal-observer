import { Type } from '@sinclair/typebox'
const ActiveDealDbEntry = Type.Object({
  activated_at_epoch: Type.Number(),
  miner_id: Type.Number(),
  client_id: Type.Number(),
  piece_cid: Type.String(),
  piece_size: Type.BigInt(),
  term_start_epoch: Type.Number(),
  term_min: Type.Number(),
  term_max: Type.Number(),
  sector_id: Type.BigInt()
})

export { ActiveDealDbEntry }
