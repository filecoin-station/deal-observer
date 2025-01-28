import { parse } from '@ipld/dag-json'
import { chainHeadTestData } from './test_data/chainHead.js'
import { rawActorEventTestData } from './test_data/rawActorEvent.js'

export const makeRpcRequest = async (method, params) => {
  switch (method) {
    case 'Filecoin.ChainHead':
      return parse(JSON.stringify(chainHeadTestData))
    case 'Filecoin.GetActorEventsRaw':
      return parse(JSON.stringify(rawActorEventTestData)).filter(e => e.height >= params[0].fromHeight && e.height <= params[0].toHeight)
    default:
      console.error('Unknown method')
  }
}
