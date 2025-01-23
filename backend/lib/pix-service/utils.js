import { base64pad } from "multiformats/bases/base64"

const encodeInBase64 = (data) => {
    return base64pad.baseEncode(data)
  }
  

  export { encodeInBase64 }