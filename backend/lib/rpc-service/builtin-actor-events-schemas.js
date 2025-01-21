import { fromDSL } from '@ipld/schema/from-dsl.js'
// TODO: Catch and log errors
const schemaDmt = fromDSL(`
type ClaimEvent struct {
  id Int
  client Int
  provider Int
  pieceCid &Any 
  pieceSize Int 
  termMin Int 
  termMax Int 
  termStart Int 
  sector Int 
} 

# | flags             | key             | value                         |
# | ----------------- | --------------- | ----------------------------- |
# | Index Key + Value | "$type"         | "claim-updated" (string)      |
# | Index Key + Value | "id"            | <CLAIM_ID> (int)              |
# | Index Key + Value | "client"        | <CLIENT_ACTOR_ID> (int)       |
# | Index Key + Value | "provider"      | <SP_ACTOR_ID> (int)           |
# | Index Key + Value | "piece-cid"     | <PIECE_CID> (cid)             |
# | Index Key         | "piece-size"    | <PIECE_SIZE> (int)            |
# | Index Key         | "term-min"      | <TERM_MINIMUM> (int)          |
# | Index Key         | "term-max"      | <TERM_MAXIMUM> (int)          |
# | Index Key         | "term-start"    | <TERM_START> (int)            |
# | Index Key + Value | "sector"        | <SECTOR_ID> (int)             |

type Entry struct {
    Codec Int
    Flags Int
    Key String
    Value String
}

type RawActorEvent struct {
    emitter String
    entries [Entry]
    height Int
    reverted Bool
    msgCid &Any
    tipsetKey [&Any]
}`)

export { schemaDmt }
