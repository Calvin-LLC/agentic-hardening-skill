---
name: tenant-isolation
owner: security
readers: [reliability]
description: Tenant isolation controls for multi-tenant data paths. Maps to A01. Loaded when recon multi_tenant is true.
---

Inherited contract applies. Read `agents/_contract.md` before emitting findings.

Owner: security. Reliability reads this module for races in `TEN-DELETE`; it does not write these units. Findings set `owasp_2025: "A01"`.

A tenant boundary holds only when the server enforces it on every read and write. A tenant id taken from the request body or a client-set header, without checking it against the authenticated principal, enforces nothing.

| Control | Look for | Evidence needed |
|---------|----------|-----------------|
| TEN-QUERY | Queries on tenant-scoped tables with no tenant predicate; ORM `findById` with no tenant scope; admin or background paths that bypass row-level security; tenant id from client input. | The query and where the tenant value comes from. |
| TEN-CACHE | Cache keys, search indexes, or queue topics that omit the tenant id; shared in-process memoization of per-tenant results. | The key construction. |
| TEN-EXPORT | Export, report, and webhook paths that build their result from a query without the tenant scope; presigned URLs for objects under a shared prefix. | The export query and the storage path. |
| TEN-DELETE | Deletion or offboarding that leaves rows, files, caches, search entries, or backups for the tenant; restore paths that can resurrect another tenant's data; delete-then-reuse id races. | The delete routine and the list of stores it touches versus the stores that hold tenant data. |

Rules:

- Quote the missing predicate and name the principal who gains access. No cross-tenant claim without a Source to Sink path.
- Middleware that sets a tenant context is not a per-query check until the data layer reads it.
