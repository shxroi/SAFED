# Resolution: operations review regressions

## Summary

Applied the agreed **Critical + Important** remediation scope from review findings.

## Fixes Implemented

### 1) Restored `OperationFilters` functional component

- **File**: `app/components/operation/OperationFilters.vue`
- Replaced broken partial SFC with complete script+template implementation.
- Restored filter state handling for:
  - `search`
  - `type`
  - `date`
  - `myOnly`
- Preserved create action emit for IM users (`create`).

### 2) Preserve H3 status codes in checklist/list APIs

- **Files**:
  - `server/api/operations/[id]/checklist.get.ts`
  - `server/api/operations/list.get.ts`
- Added explicit `if (error.statusCode) throw error` in catch handlers.
- Prevents `401/403/404/400` from being converted to `500`.

### 3) Enforce operation lifecycle guard on execution mutation endpoints

- **Files**:
  - `server/api/operations/[id]/tools.put.ts`
  - `server/api/operations/[id]/tasks/[taskId].put.ts`
  - `server/api/operations/[id]/tasks/[taskId]/documentation.post.ts`
  - `server/api/operations/[id]/tasks/[taskId]/documentation/[docId].delete.ts`
- Added operation lookup + status check in each endpoint.
- Mutation now blocked unless operation exists and `status === "Active"`.

### 4) Align checklist response with `OperationTool` contract

- **File**: `server/api/operations/[id]/checklist.get.ts`
- Added `operationId` to tools payload mapping.
- Resolves mismatch against `shared/types/operation-execution.ts` (`OperationTool.operationId`).

### 5) Execution page refactor and layout unification

- **File**: `app/pages/operations/[id]/execute.vue`
- Reduced page size/complexity by extracting reusable checklist building blocks and moving documentation state helpers into a dedicated composable.
- Added reusable components:
  - `app/components/operation/checklist/ToolsChecklistPanel.vue`
  - `app/components/operation/checklist/OperationActivityCard.vue`
- Added composable:
  - `app/composables/operation/useExecutionDocumentation.ts`
- Reused the same tools/activity card UI for editable mobile flow and read-only desktop monitor flow to keep tools/jobdesk layout consistent.

### 6) Tools checklist save behavior update

- Tools checklist now uses a single Save action for all tools in the panel (no per-tool Save button).
- Request payload remains one batch update to `/api/operations/[id]/tools`.

## Verification

- `npm run test` -> pass
- `npm run build` -> pass

## Deferred (not part of requested scope)

- N+1 reduction in `server/api/operations.get.ts`
- More specific image decode error mapping for invalid image bytes in documentation upload endpoint
