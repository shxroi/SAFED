# Bug Context: fielddocumentations singleton IN query failure

## User Report

- **Error**: `Failed query: select "id", "joblistid", "filepath", "filename", "filesize", "timestamp" from "fielddocumentations" where "fielddocumentations"."joblistid" in ($1) params: 67`
- **Area**: operation execution checklist fetch
- **Impact**: operation execute/checklist load can fail when task list is small/singleton.

## Architecture Context

- `fielddocumentations.joblistId` references `operationjoblists.id`.
- Query path in backend:
  1. fetch operation tasks (`operationjoblists`)
  2. map activity IDs
  3. fetch docs from `fielddocumentations`
- Primary affected endpoint: `server/api/operations/[id]/checklist.get.ts`.
- Same query pattern appears in:
  - `server/api/operations/[id]/complete.post.ts`
  - `server/api/operations/[id].delete.ts`

## Distilled Cause

1. **Most likely**: singleton `inArray(...)` generated `IN ($1)` edge path for runtime/driver combination.
2. **Secondary**: runtime schema inconsistency can amplify query failure visibility, but code pattern is the stable fix target.

## Scope

- Backend-only bugfix.
- No DB migration needed.
