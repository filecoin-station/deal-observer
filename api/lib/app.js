import * as Sentry from '@sentry/node'
import Fastify from 'fastify'
import pg from '@fastify/postgres'

/** @typedef {import('@filecoin-station/deal-observer-db').PgPool} PgPool */

/**
 * @param {object} args
 * @param {string} args.DATABASE_URL
 * @param {Fastify.FastifyLoggerOptions} args.logger
 * @returns
 */
export const createApp = ({
  DATABASE_URL,
  logger
}) => {
  const app = Fastify({ logger })
  app.register(pg, { connectionString: DATABASE_URL })
  Sentry.setupFastifyErrorHandler(app)
  app.get('/', async function handler (request, reply) {
    return 'OK'
  })
  return app
}
