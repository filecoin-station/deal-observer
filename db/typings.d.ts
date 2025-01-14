import pg from 'pg'

export type PgPool = pg.Pool

// Copied from import('@types/pg').
export type Queryable = Pick<Pool, 'query'>
