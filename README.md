# deal-observer

A near-real-time database of active FIL+ deals

### [api/](./api/)

Public REST API exposing info about FIL+ deals.

### [backend/](./backend/)

Private singleton observing built-in actor events and maintaining the database
of FIL+ deals

### [db/](./db/)

Shared component providing helpers to access the database, including database
schema migration scripts.

## Deployment

All commits pushed to the `main` branch are automatically deployed to Fly.io by
a GitHub Actions workflow.

To deploy the changes manually, run the following command from the **monorepo
root directory**:

```bash
fly deploy -c api/fly.toml
fly deploy -c backend/fly.toml
```

## Testing

To run the tests for this repository you will first need to setup a postgreSQL
database.

You can do this by running a PostgreSQL docker container with the following
command:

```bash
docker run -d --name spark-db \
-e POSTGRES_HOST_AUTH_METHOD=trust \
-e POSTGRES_USER=$USER \
-e POSTGRES_DB=$USER \
-p 5432:5432 \
postgres
```

Afterwards, you need to create the database `spark_deal_observer` by running the
following command:

```bash
psql postgres://$USER@localhost/$USER -c 'CREATE DATABASE spark_deal_observer'
```

Finally, you can run the tests:

```
npm test
```
