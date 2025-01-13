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
