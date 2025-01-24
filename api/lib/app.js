import * as Sentry from '@sentry/node'
import Fastify from 'fastify'
import pg from '@fastify/postgres'

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
  Sentry.setupFastifyErrorHandler(app)
  app.register(pg, { connectionString: DATABASE_URL })
  app.get('/', async function handler (request, reply) {
    return 'OK'
  })
  return app
}
