export type MakeRpcRequest = (method: string, params: unknown[]) => Promise<unknown>;
export type GetDealPayloadCid = (providerId:string,pieceCid:string) => Promise<string|null>;
