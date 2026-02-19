# Diagnostic Logs: fielddocumentations singleton IN query

## Diagnostic Instrumentation Phase

Planned temporary instrumentation points:

- `server/api/operations/[id]/checklist.get.ts`
  - log `operationId`, activity ID count, and sanitized ID list before docs query
  - log error cause metadata in catch path

Because this failure was directly mapped to a deterministic query branch and confirmed by static trace to the exact line, permanent code-level defensive handling was applied and verified with test/build.

## Static Reproduction Trace

### Endpoint

`server/api/operations/[id]/checklist.get.ts`

### Previous query behavior

- `activityIds = [67]`
- docs query used `inArray(fieldDocumentations.joblistId, activityIds)`
- generated SQL form: `... where joblistid in ($1)` with `$1 = 67`

### Observed failure signature

- Exact same as user report:
  - `Failed query ... from "fielddocumentations" ... in ($1) params: 67`

## Validation Result

Applied defensive query branching:

- one ID -> `eq(joblistId, id)`
- many IDs -> `inArray(joblistId, ids)`
- zero IDs -> skip query

Post-fix verification:

- `npm run test` passed
- `npm run build` passed
