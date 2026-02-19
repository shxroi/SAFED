# Bug Context: operations review regressions

## User Report

- Source: post-implementation code review on commit range `25523e7..36cbbcd`.
- Critical:
  - `app/components/operation/OperationFilters.vue` regression breaks filters UI behavior.
- Important:
  - H3 errors masked as `500` in `server/api/operations/[id]/checklist.get.ts` and `server/api/operations/list.get.ts`.
  - Execution mutation APIs do not enforce operation lifecycle state (`Active`) before write operations.
  - `OperationTool` type contract mismatch vs checklist API payload (`operationId` missing in response).
- Minor:
  - N+1 query pattern in `server/api/operations.get.ts`.
  - Upload endpoint image decode/validation error quality can be improved.

## Architecture Context (from data-model.md)

- `operations.status` drives lifecycle (`Draft`, `Active`, `Complete`, `Cancelled`).
- Execution write paths mutate `operationtools`, `operationjoblists`, and `fielddocumentations`.
- `operationtools` belongs to `operations` and should only be mutated during valid lifecycle stage.
- `fielddocumentations` belongs to `operationjoblists` and is constrained by business rule (max 2 photos per task) in API logic.

## Affected Data Flow

1. UI list/observer pages use `OperationFilters` to emit `update:*` filters.
2. Execute page mutates tools/tasks/docs via `/api/operations/[id]/...` endpoints.
3. Checklist payload is mapped to `OperationTool[]` in `useOperationDetail` composable.

## Cross-Project Memory Check

- Attempted to read `/Users/besi/Code/memory` for similar failures.
- Not accessible in this environment (unsafe FS tools disabled), so no cross-project memory records were loaded.

## Initial Scope Decision

- Treat this as multi-surface regression from one integration commit.
- Diagnose with source-level instrumentation + baseline test/build evidence before applying any fix.
