export type MakeRpcRequest = (method: string, params: Array) => Promise<unknown>
export type MakePayloadCidRequest = (minerPeerId:string,payloadCid: string) => Promise<string|null>