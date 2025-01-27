import * as Sentry from '@sentry/node'
import Fastify from 'fastify'
import pg from '@fastify/postgres'

/**
 * @param {object} args
 * @param {string} args.databaseUrl
 * @param {Fastify.FastifyLoggerOptions} args.logger
 * @returns
 */
export const createApp = ({
  databaseUrl,
  logger
}) => {
  const app = Fastify({ logger })
  Sentry.setupFastifyErrorHandler(app)
  app.register(pg, { connectionString: databaseUrl })
  app.get('/', async function handler (request, reply) {
    return 'OK'
  })
  return app
}
