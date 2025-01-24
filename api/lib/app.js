import * as Sentry from '@sentry/node'
import Fastify from 'fastify'

/** @typedef {import('@filecoin-station/deal-observer-db').PgPool} PgPool */

/**
 * @param {object} args
 * @param {PgPool} args.pgPool
 * @param {Fastify.FastifyLoggerOptions} args.logger
 * @returns
 */
export const createApp = ({
  pgPool,
  logger
}) => {
  const app = Fastify({ logger })
  Sentry.setupFastifyErrorHandler(app)
  app.get('/', async function handler (request, reply) {
    return 'OK'
  })
  return app
}
