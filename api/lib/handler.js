import * as Sentry from '@sentry/node'
import { status } from 'http-responders'

/** @typedef {import('@filecoin-station/deal-observer-db').PgPool} PgPool */

/**
 * @param {object} args
 * @param {PgPool} args.pgPool
 * @param {import('./typings.d.ts').Logger} args.logger
 * @returns
 */
export const createHandler = ({
  pgPool,
  logger
}) => {
  return (req, res) => {
    const start = Date.now()
    logger.request(`${req.method} ${req.url} ...`)
    handler(req, res, pgPool)
      .catch(err => errorHandler(res, err, logger))
      .then(() => {
        logger.request(`${req.method} ${req.url} ${res.statusCode} (${Date.now() - start}ms)`)
      })
  }
}

/**
 * @param {import('node:http').IncomingMessage} req
 * @param {import('node:http').ServerResponse} res
 * @param {PgPool} pgPool
 */
const handler = async (req, res, pgPool) => {
  // Caveat! `new URL('//foo', 'http://127.0.0.1')` would produce "http://foo/" - not what we want!
  const { pathname /*, searchParams */ } = new URL(`http://127.0.0.1${req.url}`)
  const segs = pathname.split('/').filter(Boolean)
  const url = `/${segs.join('/')}`

  // TODO: implement the request handler
  if (req.method === 'GET' && url === '/') {
    // health check - required by Grafana datasources
    res.end('OK')
  } else {
    status(res, 404)
  }
}

const errorHandler = (res, err, logger) => {
  if (err instanceof SyntaxError) {
    res.statusCode = 400
    res.end('Invalid JSON Body')
  } else if (err.statusCode) {
    res.statusCode = err.statusCode
    res.end(err.message)
  } else {
    logger.error(err)
    status(res, 500)
  }

  if (res.statusCode >= 500) {
    Sentry.captureException(err)
  }
}
