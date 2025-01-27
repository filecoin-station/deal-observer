import { parse } from '@ipld/dag-json'
import { chainHeadTestData } from './test_data/chainHead.js'
import { rawActorEventTestData } from './test_data/rawActorEvent.js'
import { minerPeerIds } from './test_data/minerInfo.js'
import { payloadCIDs } from './test_data/payloadCIDs.js'

export const makeRpcRequest = async (method, params) => {
  switch (method) {
    case 'Filecoin.ChainHead':
      return parse(JSON.stringify(chainHeadTestData))
    case 'Filecoin.GetActorEventsRaw':
      return parse(JSON.stringify(rawActorEventTestData)).filter(e => e.height >= params[0].fromHeight && e.height <= params[0].toHeight)
    case 'Filecoin.StateMinerInfo':
      return minerPeerIds.get(params[0])
    default:
      console.error('Unknown method')
  }
}

export const makepixRequest = async (providerId, pieceCid) => {
  const payloadCid = payloadCIDs.get(JSON.stringify({ minerId: providerId, pieceCid }))
  // TODO: handle the case where the payloadCid is not found
  return payloadCid ? payloadCid.payloadCid : 'baga6ea4seaqepbqg7dxrdphrvusy3pmc5lelcczwwi5nydduyog655wgnby4ijq'
}
