# Diagnostic Logs: operations review regressions

## Instrumentation Phase

Because the report is a code-quality regression set (not a single runtime crash), diagnostics were instrumented as source checkpoints plus baseline runtime verification.

### Source Checkpoints (Instrumentation)

1. **OperationFilters component integrity probe**
   - Query: search for `<script` in `app/components/operation/OperationFilters.vue`.
   - Result: no script block found; template exists and references `props`, `emit`, `open`, `calendarValue`, `activeFilterCount`, etc.
   - Diagnostic meaning: component has template bindings without corresponding script state/emits.

2. **HTTP error propagation probe**
   - Files checked:
     - `server/api/operations/[id]/checklist.get.ts`
     - `server/api/operations/list.get.ts`
   - Result: both catch handlers rewrap with `createError({ statusCode: 500 ... })` without `if (error.statusCode) throw error`.
   - Diagnostic meaning: intentional 4xx H3 errors can be converted to 500.

3. **Lifecycle guard probe for execution mutations**
   - Files checked:
     - `server/api/operations/[id]/tools.put.ts`
     - `server/api/operations/[id]/tasks/[taskId].put.ts`
     - `server/api/operations/[id]/tasks/[taskId]/documentation.post.ts`
     - `server/api/operations/[id]/tasks/[taskId]/documentation/[docId].delete.ts`
   - Result: enrollment checks exist, but no operation status read/guard (`Active`) before mutation.
   - Diagnostic meaning: write endpoints can mutate data outside intended lifecycle stage.

4. **Type contract probe**
   - Type file: `shared/types/operation-execution.ts` -> `OperationTool.operationId` required.
   - API mapping: `server/api/operations/[id]/checklist.get.ts` -> tools payload omits `operationId`.
   - Diagnostic meaning: runtime payload and shared TypeScript contract diverged.

5. **Query-shape probe**
   - File: `server/api/operations.get.ts`.
   - Result: per-operation `Promise.all` for enrollments/tools/tasks creates N+1 profile under larger lists.

## Reproduction / Baseline

### Command Baseline

- `npm run test` -> pass (2 files, 6 tests).
- `npm run build` -> pass.

### Observation

- Current tests do not cover operation filters rendering contract nor operation mutation lifecycle enforcement.
- Build passes despite runtime-behavior regressions, confirming test coverage gap rather than compiler breakage.

## Hypothesis Generation (6)

1. **Partial merge/regression in `OperationFilters.vue`** (High)
   - Evidence: template references script symbols but no `<script>` block remains.

2. **Inconsistent error-handling pattern copied during refactor** (High)
   - Evidence: two endpoints diverge from project standard (`if (error.statusCode) throw error`).

3. **Authz model assumed enrollment implies mutation permission** (High)
   - Evidence: mutation endpoints validate enrollment only, not operation lifecycle state.

4. **Shared type changed without synchronized API mapping update** (Medium)
   - Evidence: `OperationTool` requires `operationId`, API response does not include it.

5. **Performance concern inherited from pre-existing endpoint design** (Medium)
   - Evidence: explicit per-operation relation fetch pattern in `operations.get.ts`.

6. **Insufficient regression tests in operations module** (High)
   - Evidence: baseline tests pass while critical behavior regressions still present.

## Distilled Most Likely Root Causes

1. **Primary root cause: integration regression in operations module refactor** (90% confidence)
   - Missing script/template parity in `OperationFilters.vue` plus contract drift strongly indicates incomplete merge/refactor integration.

2. **Secondary root cause: missing centralized enforcement patterns** (75% confidence)
   - Error propagation and lifecycle checks are implemented per-endpoint manually; pattern drift caused inconsistent behavior.

## Fix Candidate (not implemented yet)

- Restore `OperationFilters` as a complete SFC (script + template) with expected emits/props state.
- Re-throw known H3 errors in the two affected catch blocks.
- Add operation status guard (`Active`) to execution mutation endpoints.
- Align `OperationTool` contract and checklist response (either include `operationId` or make optional).
- Keep N+1 and upload validation as follow-up if user wants strict full remediation in same patch.
