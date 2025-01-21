import { Type } from '@sinclair/typebox'
const ActiveDealDbEntry = Type.Object({
    activated_at_epoch: Type.Number(),
    miner: Type.Number(),
    client: Type.Number(),
    piece_cid: Type.String(),
    piece_size: Type.BigInt(),
    term_start_epoch: Type.Number(),
    term_min: Type.Number(),
    term_max: Type.Number(),
    sector: Type.BigInt(),
    payload_cid: Type.Null()
})

export{ ActiveDealDbEntry }