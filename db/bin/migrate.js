import { migrateWithPgClient, createPgPool } from '../index.js'

const pgPool = await createPgPool()
await migrateWithPgClient(pgPool)
