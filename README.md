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
