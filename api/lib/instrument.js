import * as Sentry from '@sentry/node'
import { nodeProfilingIntegration } from '@sentry/profiling-node'
import fs from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const { SENTRY_ENVIRONMENT = 'development' } = process.env

const pkg = JSON.parse(
  await fs.readFile(
    join(
      dirname(fileURLToPath(import.meta.url)),
      '..',
      'package.json'
    ),
    'utf8'
  )
)

Sentry.init({
  dsn: 'https://9b91c0d2c1a6ff9e257c33dbac877890@o1408530.ingest.us.sentry.io/4508641120681984',
  release: pkg.version,
  environment: SENTRY_ENVIRONMENT,
  integrations: [
    nodeProfilingIntegration()
  ],
  tracesSampleRate: 0.1,
  // Set sampling rate for performance profiling. This is relative to tracesSampleRate.
  profilesSampleRate: 1.0,
  // Ignore Fastify 4xx errors
  // Remove once https://github.com/getsentry/sentry-javascript/pull/13198 lands
  beforeSend (event, { originalException: err }) {
    const isBadRequest =
      typeof err === 'object' &&
      err !== null &&
      'statusCode' in err &&
      typeof err.statusCode === 'number' &&
      err.statusCode < 500
    return isBadRequest ? null : event
  }
})
