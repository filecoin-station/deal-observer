import assert, { AssertionError } from 'node:assert'

export const assertResponseStatus = async (res, status) => {
  if (res.status !== status) {
    throw new AssertionError({
      actual: res.status,
      expected: status,
      message: await res.text()
    })
  }
}

/**
 * @param {import('http').Server} server
 */
export const getPort = (server) => {
  const address = server.address()
  assert(typeof address === 'object')
  return address.port
}
