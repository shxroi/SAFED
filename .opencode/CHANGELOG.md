# OpenCode Change Log

## 2026-02-17

- Created and switched to branch `bug-demoai`.
- Fixed production build blocker by moving client-side user form schema import from `shared/` to `app/schemas/userSchema.ts`.
- Hardened password update validation by converting empty-string password inputs to `undefined` (prevent empty-password hashing).
- Added authorization checks (authenticated IM-only) to users/tools management API routes.
- Hardened delete endpoints to validate IDs and return 404 when target rows do not exist.
- Removed noisy debug logging from users/tools list APIs.
- Updated one operation component import to use type-only shared imports.
- Verified changes with:
  - `npm run test` (pass)
  - `npm run build` (pass; warnings remain for duplicated auto-import symbols)
- Follow-up PR review improvement: aligned `tools/[id].put` ID validation to return `400 Invalid tool ID` for NaN/non-positive values and rethrow known H3 errors before wrapping unknowns as 500.
- Refactored operation execution page to use operation composables (`useOperationDetail`, `useOperationAccess`, `useOperationProgress`) and fixed duplicate rendering of staff+monitor views.
- Refactored operation create page with typed loaders, robust edit-mode checklist mapping, removed debug logs, and unified save flow with toast-based feedback.
- Removed unfinished unused operation component stubs from `app/components/operation/` to avoid dead code and confusion.

## 2026-02-18

- Implemented operation module enhancements on `testing` branch.
- Added operation list filters by type and date, plus reusable filter/query composable for URL-synced state.
- Refactored operation list UI into reusable components: `OperationFilters`, `OperationStats`, and `OperationCard`.
- Added observer monitoring page implementation using the same operation progress view model.
- Hardened operation APIs with explicit authz checks:
  - IM-only for create/edit/delete/status patch/checklist configuration.
  - Staff enrollment checks for operation detail/checklist access.
  - Supervisor-only operation completion.
- Added workflow guards for operation status transitions and completion preconditions (all tasks and tool checks must be filled before completing).
- Updated operation create flow to support explicit `Draft` vs `Active` save intent.
- Introduced shared operation constants and app-level operation UI constants to reduce hardcoded values.
- Integrated Nuxt Image (`@nuxt/image`) and replaced key `<img>` usage with `<NuxtImg>` for optimized image loading.
- Verified changes with:
  - `npm run test` (pass)
  - `npm run build` (pass; existing duplicate auto-import warnings remain)

## 2026-02-19

- Added checklist photo documentation upload feature for operation task execution.
- Added `documentationRequired` field on `operationJobLists` in `server/db/schema.ts` and generated migration `server/db/migrations/0011_white_shotgun.sql`.
- Added new API endpoint `server/api/operations/[id]/tasks/[taskId]/documentation.post.ts`:
  - validates enrolled user access
  - accepts multipart image upload
  - converts image to `.webp` via `sharp`
  - stores files under `public/uploads/operations/{operationId}/joblists/{joblistId}/{timestamp}-{random}.webp`
  - writes metadata to `fielddocumentations`
- Updated checklist retrieval in `server/api/operations/[id]/checklist.get.ts` to return task documentation metadata and `documentationRequired`.
- Updated checklist save in `server/api/operations/[id]/checklist.put.ts` to persist `documentationRequired` from create/edit operation form.
- Updated completion rule in `server/api/operations/[id]/complete.post.ts` to block completion when required task photos are missing.
- Enhanced execution UI in `app/pages/operations/[id]/execute.vue`:
  - upload button per activity
  - small thumbnail previews in task cards
  - full-size modal preview on click
  - Nuxt Image (`NuxtImg`) used for optimized preview/full rendering
- Updated `shared/types/operation-execution.ts` to include documentation type on activities.
- Added `public/uploads/` to `.gitignore` for runtime-generated media files.
- Migration note: `npm run db:migrate` failed due missing historic migration files referenced by journal; restored placeholder files (`0002`, `0003`, `0006`, `0007`) to keep sequence integrity. Build migration flow (`nuxt:hub`) now reports migrations up to date.
- Verified changes with:
  - `npm run test` (pass)
  - `npm run build` (pass)

## 2026-02-19 (Phase 2 - Mobile Photo Flow)

- Updated task documentation UX in `app/pages/operations/[id]/execute.vue` to support mobile-first capture and gallery selection:
  - camera input (`accept="image/*"` + `capture="environment"`)
  - gallery input (`accept="image/*"`)
- Implemented per-task photo staging before save:
  - max 2 photos per task enforced client-side
  - pending photos can be removed before save
  - existing uploaded photos can be marked for deletion and undone before save
  - uploads and deletions are applied only when clicking task `Save`
- Added full-size preview modal with mixed local blob preview (`img`) and persisted image preview (`NuxtImg`).
- Added API endpoint `server/api/operations/[id]/tasks/[taskId]/documentation/[docId].delete.ts` for deleting persisted documentation images.
- Hardened upload API `server/api/operations/[id]/tasks/[taskId]/documentation.post.ts` with server-side max-2 validation.
- Verified changes with:
  - `npm run test` (pass)
  - `npm run build` (pass)

## 2026-02-19 (Phase 3 - Hardening + Tools Source)

- Hardened operation tools update API `server/api/operations/[id]/tools.put.ts`:
  - validates tool status values
  - scopes updates by both `operationTools.id` and `operationId` to prevent cross-operation mutation
  - returns 404 when a tool ID is not part of the requested operation
- Hardened documentation upload API `server/api/operations/[id]/tasks/[taskId]/documentation.post.ts` against race conditions:
  - locks task row (`FOR UPDATE`) during max-photo check + insert
  - keeps max 2 photos per task invariant under concurrent uploads
  - removes written file from disk when DB insert transaction fails
- Hardened draft operation delete API `server/api/operations/[id].delete.ts`:
  - deletes dependent checklist/docs/tools/sections before deleting operation row
  - prevents FK delete failures for populated draft operations
  - deletes related uploaded files from `public/uploads`
- Locked down debug cleanup endpoint `server/api/debug/clean-operations.get.ts`:
  - disabled in production
  - requires authenticated IM role
  - standardized error handling with proper HTTP status
- Updated operation checklist source of truth to use `tools` database IDs:
  - `app/pages/operations/create.vue` now fetches tool options from `/api/tools`
  - checklist tools UI uses dropdown selection from DB-backed tool list
  - checklist payload now sends `toolId` + `quantity` (not free-text names)
  - edit mode maps existing checklist tools using `toolId`
- Updated checklist persistence in `server/api/operations/[id]/checklist.put.ts`:
  - validates operation exists and is `Draft`
  - validates requested `toolId` values exist in master `tools` table
  - merges duplicate tool selections by summing quantity before insert
  - removes name-based auto-create fallback for tools
- Improved execution save behavior in `app/pages/operations/[id]/execute.vue`:
  - after successful doc delete/upload, local staged state is updated immediately to avoid duplicate retries
- Verified changes with:
  - `npm run test` (pass)
  - `npm run build` (pass)

## 2026-02-19 (Code Quality Cleanup - Operations)

- Cleaned operation pages for production readability:
  - removed non-essential template comments from `app/pages/operations/index.vue`, `app/pages/operations/create.vue`, and `app/pages/operations/[id]/execute.vue`
  - replaced placeholder text in execution tool notes (`Type post-condition note`)
  - replaced browser `alert` error path in operation index actions with toast-based feedback
  - reduced repeated date computation in execution header with `operationDaysLeft` computed
- Completed DB-backed tools integration for operation checklist authoring:
  - `app/pages/operations/create.vue` uses `toolId` selection from `/api/tools`
  - removed free-text tool-name checklist payload usage
  - `server/api/operations/[id]/checklist.put.ts` validates operation state + tool IDs and merges duplicate tool selections
- Optimized tools list endpoint `server/api/tools.get.ts`:
  - simplified query construction
  - switched total counting to DB `count()`
  - increased max page limit to 200 for checklist tool selection use case
- Cleaned and stabilized related operation APIs:
  - `server/api/operations/list.get.ts` fixed supervisor query composition and typed session user cast
  - maintained prior hardening for docs upload race safety and scoped tool updates
- Applied formatting with Prettier to all touched operation files and related APIs.
- Verification:
  - `npm run test` (pass)
  - `npm run build` (pass)
  - `npx nuxi typecheck` failed due local `vue-tsc` runtime not finding `typescript/lib/tsc` in npx environment

## 2026-02-19 (Operations Cleanup + Composable Bugfix)

- Cleaned operation pages (`index`, `create`, `execute`) and operation composables for production-readiness:
  - removed remaining low-value UI placeholders and standardized error handling via typed `getErrorMessage(...)` helpers
  - removed `any` from page-level catch blocks and replaced with `unknown` + safe narrowing
  - improved operation header title fallback in execute page (`vesselName` -> company fallback)
- Fixed composable bug in `app/composables/operation/useOperationAccess.ts`:
  - execution edit mode now requires operation status `Active`
  - `Draft`, `Cancelled`, and `Complete` are now read-only in UI execution flow
  - observer role remains read-only regardless of enrollment
- Hardened filter composable `app/composables/operation/useOperationListFilters.ts`:
  - fixed runtime import issue by replacing `shared/` runtime constant usage with app-local `OPERATION_TYPE_OPTIONS`
  - prevents invalid query `type` values from poisoning selected filter state
- Fixed stale form-state bug in `app/pages/operations/create.vue` while loading an existing operation:
  - tools list now always resets from API response (including empty)
  - sections now reset deterministically (fallback to one empty section when response has none)
  - replaced repeated `find(... as any)` name lookup with typed `staffNameById` map
- Formatting:
  - ran Prettier on all touched operation pages and composables
- Verification:
  - `npm run test` (pass)
  - `npm run build` (pass)
  - `npx nuxi typecheck` still fails in local environment due `vue-tsc` runtime module resolution (`typescript/lib/tsc`)

## 2026-02-19 (Bugfix - fielddocumentations singleton query)

- Diagnosed and fixed operation docs query failure for singleton joblist ID (`IN ($1)` with params like `67`).
- Added architecture and bug documentation:
  - `docs/architecture/data-model.md`
  - `docs/tasks/backend/19-02-2026/field-documentations-in-singleton-query/context.md`
  - `docs/tasks/backend/19-02-2026/field-documentations-in-singleton-query/diagnostic-logs.md`
  - `docs/tasks/backend/19-02-2026/field-documentations-in-singleton-query/resolution.md`
- Implemented singleton-safe ID query branching:
  - `server/api/operations/[id]/checklist.get.ts`
  - `server/api/operations/[id]/complete.post.ts`
  - `server/api/operations/[id].delete.ts`
- Query behavior now:
  - one ID -> `eq(...)`
  - multiple IDs -> `inArray(...)`
  - zero IDs -> skip docs query
- Verified changes with:
  - `npm run test` (pass)
  - `npm run build` (pass)

## 2026-02-19 (Build unblock follow-up)

- Fixed remaining client runtime import from `shared/` in `app/components/operation/OperationFilters.vue` by replacing `OPERATION_STATUSES` value import with local typed constant, eliminating unresolved bundled path issue.
- Confirmed production build now completes successfully after earlier image path fixes in `app/pages/index.vue` and `app/layouts/default.vue`.
- Verification:
  - `npm run build` (pass)

## 2026-02-19 (Review regression remediation)

- Diagnosed code-review regressions and documented evidence in:
  - `docs/tasks/backend/19-02-2026/operations-review-regressions/context.md`
  - `docs/tasks/backend/19-02-2026/operations-review-regressions/diagnostic-logs.md`
  - `docs/tasks/backend/19-02-2026/operations-review-regressions/resolution.md`
- Restored `OperationFilters` as a complete script+template component and re-enabled filter emits for search/type/date/my-only.
- Fixed API error propagation in:
  - `server/api/operations/[id]/checklist.get.ts`
  - `server/api/operations/list.get.ts`
  by rethrowing known H3 errors before wrapping unknown exceptions.
- Added operation lifecycle guards (`Active` required) to execution mutation APIs:
  - `server/api/operations/[id]/tools.put.ts`
  - `server/api/operations/[id]/tasks/[taskId].put.ts`
  - `server/api/operations/[id]/tasks/[taskId]/documentation.post.ts`
  - `server/api/operations/[id]/tasks/[taskId]/documentation/[docId].delete.ts`
- Aligned checklist tools payload with shared `OperationTool` contract by returning `operationId` in `server/api/operations/[id]/checklist.get.ts`.
- Verification:
  - `npm run test` (pass)
  - `npm run build` (pass)

## 2026-02-19 (Execution page refactor + checklist UX alignment)

- Refactored `app/pages/operations/[id]/execute.vue` to reduce page complexity and split repeated checklist UI into reusable components.
- Added reusable checklist components:
  - `app/components/operation/checklist/ToolsChecklistPanel.vue`
  - `app/components/operation/checklist/OperationActivityCard.vue`
- Added new documentation-state composable:
  - `app/composables/operation/useExecutionDocumentation.ts`
- Unified tools and jobdesk card layout usage across mobile execution and desktop monitor views by reusing the same component blocks.
- Updated tools checklist save UX to one save action for the whole tools list (not per-tool save).
- Kept operation activity save flow per-activity while preserving staged photo upload/delete behavior.
- Verification:
  - `npm run test` (pass)
  - `npm run build` (pass)

## 2026-02-19 (Upload documentation trigger UX)

- Updated upload UX in `app/components/operation/checklist/OperationActivityCard.vue`:
  - replaced separate Camera/Gallery controls with one `Upload documentation` button below notes
  - button now opens a single file picker (`accept="image/*"`) so mobile users can choose camera capture or gallery from OS chooser
  - kept multi-file selection support and existing max-photo guard behavior
- Verification:
  - `npm run test` (pass)
  - `npm run build` (pass)

## 2026-02-19 (Execution UX polish + typing cleanup)

- Updated task documentation upload interaction in `app/components/operation/checklist/OperationActivityCard.vue`:
  - kept a single `Upload documentation` trigger
  - expanded into explicit mobile options (`Take Photo` and `Choose from Gallery`) before opening file input
  - preserved existing staging behavior and max-photo constraints
- Reduced duplicated presentation logic in `app/components/operation/OperationInfoCard.vue` by reusing formatter helpers from `useOperationFormatters`.
- Fixed missing runtime import in `app/composables/operation/useOperationSave.ts` by importing `ref` from Vue.
- Removed unsafe cast usage in execution header (`app/pages/operations/[id]/execute.vue`) by using typed `user?.username`.
- Added Nuxt auth module augmentation in `app/types/auth.d.ts` for typed session user fields.
- Updated mobile top-bar page title rendering in `app/layouts/default.vue` to show dynamic current page label.
- Verification:
  - `npm run test` (pass)
  - `npm run build` (pass)

## 2026-02-19 (Responsive + accessibility pass)

- Improved responsive behavior across layout and key pages (`index`, `users`, `tools`, `operations`, `observer`, operation create/execute flows):
  - mobile-first stacking, fluid widths, and overflow-safe table wrappers
  - action bars/buttons now adapt to small screens with full-width controls where needed
  - operation create/execute checklists updated for mobile-friendly panel and tab layouts
- Added accessibility upgrades aligned with WCAG 2.1 AA intent:
  - skip links and main-content landmarks in both default and staff layouts
  - stronger keyboard/focus treatment (global `:focus-visible` ring + keyboard activation for clickable cards/section selectors)
  - added ARIA labels/expanded states on key controls (menus, search, filters, action triggers)
  - improved contrast on several informational text treatments
- Improved mobile touch ergonomics:
  - increased control targets for buttons/inputs/select triggers/dropdown items on touch devices
  - mobile navigation drawer in default layout replacing non-functional menu icon
  - safer spacing for frequent actions and filter controls
- Verification:
  - `npm run test` (pass)
  - `npm run build` (pass)

## 2026-02-21 (Manage operation UAT + unit tests)

- Added UAT documentation for end-to-end manage-operation flow:
  - `docs/testing/manage-operation-uat.md`
  - includes coverage for operation creation, tools checklist, jobdesk checklist, status updates, supervisor completion, and observer monitoring.
- Added unit tests for operation-related composables:
  - `test/unit/checklist-builder.spec.ts`
  - `test/unit/operation-progress.spec.ts`
  - `test/unit/operation-access.spec.ts`
- Verification:
  - `corepack pnpm test` (pass)
  - `corepack pnpm type:check` (fails: script missing)
  - `corepack pnpm lint` (fails: script missing)

## 2026-02-22 (Operation execution validation hardening)

- Added client-side save validation in `app/composables/operation/useOperationSave.ts`:
  - tools save now requires both pre and post condition for every tool
  - activity save now requires task condition before submit
- Updated tools checklist note behavior in `app/components/operation/checklist/ToolsChecklistPanel.vue`:
  - pre-note remains conditional for `Not Good`
  - post-note input now appears for both `Good` and `Not Good` post conditions
- Updated documentation upload UI behavior in `app/components/operation/checklist/OperationActivityCard.vue`:
  - upload controls are shown only when `documentationRequired` is true
- Added guard in `app/pages/operations/[id]/execute.vue` to reject non-required documentation uploads on client side.
- Hardened execution APIs:
  - `server/api/operations/[id]/tools.put.ts` now enforces both tool conditions before update
  - `server/api/operations/[id]/tasks/[taskId].put.ts` now requires task condition status
  - `server/api/operations/[id]/tasks/[taskId]/documentation.post.ts` now rejects uploads when documentation is not required for the task
- Added unit tests in `test/unit/operation-save.spec.ts` for tools/activity validation paths.
- Verification:
  - `corepack pnpm test` (pass)
  - `npm run build` (pass)

## 2026-02-22 (Operation flow adjustments)

- Updated tools execution save flow in `app/composables/operation/useOperationSave.ts`:
  - tools save now requires only `pre` condition
  - `post` condition can remain null and be filled later
- Updated tools execution API validation in `server/api/operations/[id]/tools.put.ts`:
  - `preStatus` required
  - `postStatus` nullable, still validated when provided
- Updated executor badge in `app/components/operation/checklist/OperationActivityCard.vue`:
  - replaced static `CN` with dynamic initials derived from executor name
- Improved documentation upload visibility in `app/components/operation/checklist/OperationActivityCard.vue`:
  - upload action explicitly shown only when documentation is required
  - clear disabled hint shown when documentation is not required
- Refactored manage-operation tools selector in `app/components/operation/create/ToolsEditorPanel.vue` to checkbox multi-select with search and inline quantity controls.
- Wired create page to tool-id based multi-select handlers in `app/pages/operations/create.vue`.
- Updated validation tests in `test/unit/operation-save.spec.ts` for pre-only tools requirement.
- Verification:
  - `corepack pnpm test -- operation-save.spec.ts` (pass)
  - `npm run build` (pass)

## 2026-02-22 (Documentation toggle fix + tools picker UX)

- Fixed operation-create documentation toggle persistence:
  - `app/components/operation/create/SectionEditorPanel.vue`
  - changed switch binding from `v-model:checked` to `v-model:model-value` so `documentationRequired` is saved correctly.
- Updated execution activity card identity badge:
  - `app/components/operation/checklist/OperationActivityCard.vue`
  - static `CN` replaced with initials derived from `executedByName`.
- Updated tools picker UX for create/manage checklist:
  - `app/components/operation/create/ToolsEditorPanel.vue`
  - now uses searchable popover with checkbox multi-select and keeps selected tools visible with inline quantity controls.
- Verification:
  - `corepack pnpm test` (pass)
  - `npm run build` (pass)

## 2026-02-23 (Field report flow + PDF generation)

- Added field report data model in `server/db/schema.ts`:
  - `fieldreports`
  - `fieldreportnotes`
  - `fieldreportnotedocumentations`
- Added migration `server/db/migrations/0012_field_reports.sql` and journal entry update.
- Added report APIs:
  - `server/api/operations/[id]/report.get.ts` for report + selectable documentation retrieval
  - `server/api/operations/[id]/report.post.ts` for supervisor-only generate/regenerate flow
- Added PDF generation utility `server/utils/reportPdf.ts` using `pdf-lib` and persisted PDF output under `public/uploads/operations/{id}/reports/`.
- Added report UI page `app/pages/operations/[id]/report.vue` with:
  - summary/recommendation fields
  - note list
  - multi-image documentation linkage per note
  - preview panel
  - regenerate support
- Updated completion flow in `app/composables/operation/useOperationSave.ts` to route supervisor to report page after finish.
- Updated read-only execute view `app/pages/operations/[id]/execute.vue` to expose `Field Report` and `PDF` actions for IM/Observer visibility.
- Extended operation detail API/type (`server/api/operations/[id].get.ts`, `shared/types/operation.ts`) to expose `reportPdfPath`.
- Added dependency `pdf-lib` in `package.json` (+ lockfile update).
- Verification:
  - `corepack pnpm test` (pass)
  - `npx tsc --noEmit` (pass)
  - `corepack pnpm build` (fails on pre-existing migration issue: `0004_parallel_wallop.sql` relation `operationenroll` does not exist)
