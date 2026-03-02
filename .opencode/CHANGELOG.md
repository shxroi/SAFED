# OpenCode Change Log

## 2026-03-02 (Mobile sidebar overlay stacking fix)

- Fixed mobile sidebar layering in `app/layouts/default.vue` so navigation drawer always appears in front of page content and sticky header.
- Increased mobile nav overlay stacking order:
  - overlay container `z-[120]`
  - drawer panel `z-[121]`
- Result: mobile sidebar now covers/dims everything consistently when opened.

## 2026-03-01 (Execute header card visual alignment)

- Refined read-only execute header card visuals in `app/pages/operations/[id]/execute.vue` to match compact reference layout:
  - restored dedicated `Report` card container with compact title row and action layout.
  - tightened typography, spacing, and icon/button sizing for the report action panel.
  - compacted operation summary card metadata/progress spacing and progress bar thickness to align with checklist card style.
- Kept previous access behavior intact:
  - supervisor can still open `Field Report` before publish.
  - IM/Observer remain read-only with file-based review/download once report is generated.

## 2026-03-01 (Supervisor report entry UI adjustment)

- Updated read-only execute report card behavior in `app/pages/operations/[id]/execute.vue`:
  - supervisor now sees `Field Report` action (instead of only `Review`) when report PDF is not generated yet.
  - `Field Report` routes supervisor to `/operations/{id}/report` so generation flow remains accessible.
  - IM/Observer keep read-only `Review`/`Download` behavior tied to generated PDF availability.

## 2026-03-01 (Field report publish flow lock)

- Enforced one-time field report publishing flow:
  - `server/api/operations/[id]/report.post.ts` now rejects regenerate attempts with `409` once a report already exists.
  - `server/api/operations/[id]/report.get.ts` now exposes `canGenerate` only when operation is complete, user is supervisor, and no report has been generated yet.
  - `server/api/operations/[id]/report/preview.post.ts` now rejects preview after report has been generated.
- Updated report page behavior in `app/pages/operations/[id]/report.vue`:
  - pre-publish supervisor state keeps editable form + preview + generate.
  - post-publish state is read-only with generated file viewer and `Review` / `Download` actions.
  - non-supervisor/non-generator state without published file now shows report waiting message.
- Updated read-only execute card actions in `app/pages/operations/[id]/execute.vue`:
  - `Review` opens generated report file directly.
  - `Download` downloads generated report file.
  - both remain unavailable until report file exists.

## 2026-03-01 (Read-only execute header layout sync)

- Updated read-only operation execute header layout in `app/pages/operations/[id]/execute.vue` to match checklist grid behavior on web:
  - switched top container to `lg:grid-cols-12` with the same gap pattern as checklist section.
  - left report panel now uses `lg:col-span-3` and summary card uses `lg:col-span-9`.
- Replaced report action labels in read-only view:
  - `Field Report` -> `Review`
  - `PDF` -> `Download`
- Added compact report panel treatment (report row + action buttons) while preserving existing `openReportPage` and `openReportPdf` behavior.

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

## 2026-02-23 (Field report review fixes)

- Updated `server/api/operations/[id]/report.post.ts` to avoid orphan PDFs on DB transaction failure:
  - keeps cleanup path by deleting newly-written PDF when transaction fails
  - deletes previous report PDF after successful regenerate/update
- Aligned generation authorization signal between API and UI:
  - `server/api/operations/[id]/report.get.ts` now computes `canGenerate` using supervisor + complete status
  - `app/pages/operations/[id]/report.vue` now relies on backend `canGenerate` directly
- Verification:
  - `corepack pnpm test` (pass)
  - `npx tsc --noEmit` (pass)

## 2026-02-23 (Berita Acara report template)

- Reworked report form UI in `app/pages/operations/[id]/report.vue` to match operation report template flow:
  - added `Reference Number`, `Serial Number`, `Crew Name`, and `Crew sign required` toggle
  - kept attachment-note blocks with multi-documentation selection
  - retained generate/regenerate and open-preview actions
- Updated report APIs:
  - `server/api/operations/[id]/report.post.ts` now validates and stores template fields and generates PDF from template-oriented payload
  - `server/api/operations/[id]/report.get.ts` now returns template fields + operation context (`location`, `supervisorName`) for prefill/reopen
- Rebuilt PDF renderer in `server/utils/reportPdf.ts`:
  - first page now follows Berita Acara structure and wording
  - lampiran pages render selected documentation images with note captions and auto page breaks
  - signature capture is not stored; only document generation output is produced
- Schema and migration updates:
  - aligned `fieldDocumentations.joblistId` mapping to `joblistid` in `server/db/schema.ts`
  - added `fieldReports` columns for template metadata (`referencenumber`, `serialnumber`, `crewname`, `crewsignrequired`)
  - added migration `server/db/migrations/0013_report_template_fields.sql` and journal entry
- Verification:
  - `npm run test` (pass)
  - `npm run build` (pass)

## 2026-02-23 (Field documentation column compatibility fix)

- Investigated runtime query failure on `fielddocumentations.joblistid` for checklist/report flow.
- Root cause: recent schema mapping changed `fieldDocumentations.joblistId` to `joblistid`, but active DB schema in this environment uses `operationjoblistid`.
- Fixed by restoring ORM mapping in `server/db/schema.ts`:
  - `fieldDocumentations.joblistId` -> `integer("operationjoblistid")`
- Removed invalid compatibility migration attempt and kept migration journal consistent:
  - deleted `server/db/migrations/0014_fix_field_documentations_joblist_column.sql`
  - removed `0014` journal entry from `server/db/migrations/meta/_journal.json`
- Verification:
  - `npm run build` (pass)
  - `npm run test` (pass)

## 2026-02-23 (Report attachment picker popup UX)

- Updated attachment image selection UX in `app/pages/operations/[id]/report.vue`:
  - replaced inline checkbox list with popup gallery picker
  - each attachment note now uses a `Select documentation images` button
  - popup supports multi-select by clicking image cards, with selected-state highlight
  - selected images are shown back in the note card as thumbnail previews with remove action
- Verification:
  - `npm run build` (pass)

## 2026-02-24 (Operation filter UX adjustments)

- Updated filter controls in `app/components/operation/OperationFilters.vue`:
  - reduced filter panel width and calendar footprint (smaller date picker)
  - kept filter scope to Date, Type, and Status
  - changed Type to single-select dropdown with selected type shown as badge in the field
  - changed Status to checkbox-based multi-select
  - removed assignment/my-only filter UI from the panel
- Added status option constants in `app/constants/operation.ts`.
- Updated query state handling in `app/composables/operation/useOperationListFilters.ts`:
  - added `status` URL query sync using comma-separated values
  - removed `my` filter state from UI-driven filter logic
- Updated pages to use new status filter binding and query:
  - `app/pages/operations/index.vue`
  - `app/pages/observer/index.vue`
- Extended operations API filter support in `server/api/operations.get.ts`:
  - added parsing/validation for `status` query
  - applies status conditions when provided
- Verification:
  - `npm run test` (pass)
  - `npm run build` (pass)

## 2026-02-24 (Operation filter multi-type support)

- Updated operation filters to support selecting multiple `Type` values:
  - `app/components/operation/OperationFilters.vue` now uses multi-select type dropdown with removable badges
  - selected types are synced as array state and emitted via `update:types`
- Updated filter state/query sync:
  - `app/composables/operation/useOperationListFilters.ts` now stores `selectedTypes: OperationType[]`
  - URL query `type` now supports comma-separated values (e.g. `type=Installation,Maintenance`)
- Updated page bindings:
  - `app/pages/operations/index.vue`
  - `app/pages/observer/index.vue`
  - both now bind `v-model:types`
- Updated API filtering in `server/api/operations.get.ts`:
  - `type` query now accepts multiple values and filters by OR condition
  - invalid type values return empty result safely
- Verification:
  - `npm run test` (pass)
  - `npm run build` (pass)

## 2026-02-25 (Crew sign toggle enforcement)

- Finalized crew-sign toggle behavior for report generation:
  - if `crewSignRequired` is `false`, `crewName` is normalized to empty before persistence and PDF generation
  - if `crewSignRequired` is `true`, `crewName` is required by API validation
- Updated API validation in `server/api/operations/[id]/report.post.ts`:
  - made `crewName` conditionally required via schema `superRefine`
  - ensured create/update writes use normalized crew name tied to the toggle state
- Updated PDF rendering in `server/utils/reportPdf.ts`:
  - crew signature block and crew name are rendered only when `crewSignRequired` is `true`
  - when crew sign is not required, only vendor sign block is shown and crew name is omitted from document
- Verification:
  - `npm run test` (pass)
  - `npm run build` (pass)

## 2026-02-25 (Responsive confirmation/delete dialog style)

- Updated shared confirmation component `app/components/DeleteConfimDialog.vue` to match the requested two-layout alert design:
  - mobile: stacked full-width actions (`Yes` primary on top, `No` outline below)
  - web: right-aligned horizontal actions (`No` outline then `Yes` primary)
- Switched implementation from generic `Dialog` to `AlertDialog` primitives for consistent confirmation semantics and behavior.
- Kept existing page integrations intact (`operations`, `tools`, `users`, and operation preparation finish confirmation) since they all consume the shared dialog.
- Verification:
  - `npm run test` (pass)
  - `npm run build` (pass)

## 2026-02-25 (Operation create per-button loading state)

- Fixed create-operation save UX so only the clicked save action shows loading text while request is in-flight.
- Added submit source tracking in `app/composables/operation/useOperationSubmit.ts` via `activeSubmitSource` and extended `handleSubmit(...)` to accept a source key.
- Updated `app/pages/operations/create.vue` to pass source per action:
  - form card save -> `form`
  - tools checklist save -> `tools`
  - section save -> `section`
  - footer save draft -> `footer-draft`
  - finish confirmation submit -> `footer-finish`
- Updated create page button rendering to:
  - keep global disable lock while submitting (prevent duplicate submits)
  - show loading label only on active source button
- Updated child props for save button labels:
  - `app/components/operation/create/OperationFormCard.vue`
  - `app/components/operation/create/ToolsEditorPanel.vue`
  - `app/components/operation/create/SectionEditorPanel.vue`
- Verification:
  - `npm run test` (pass)
  - `npm run build` (pass)

## 2026-02-25 (Role-based sidebar + execute footer layout)

- Updated `app/layouts/default.vue` with role-based navigation items:
  - IM: Users Management, Tools Management, Manage Operations
  - STAFF/supervisor accounts: Manage Operations only
  - OBSERVER: Operations (`/observer`) only
- Implemented working mobile hamburger navigation in `app/layouts/default.vue`:
  - added open/close state for mobile drawer
  - added overlay and slide-in menu with same role-based items
  - mobile menu auto-closes on route changes and on logout
- Fixed mobile header interaction in `app/layouts/default.vue` by removing the overlapping absolute title pattern and using inline mobile title, so hamburger remains tappable.
- Fixed supervisor finish footer overlap in `app/pages/operations/[id]/execute.vue`:
  - added desktop sidebar offset (`md:left-64`) so the fixed bottom action bar does not cover sidebar area.
- Verification:
  - `npm run test` (pass)
  - `npm run build` (pass)

## 2026-02-25 (Checklist activity card visual adjustment)

- Updated section checklist module presentation in `app/components/operation/checklist/OperationSectionsChecklist.vue`:
  - each module now wraps its activities in a rounded, bordered section container
  - added module heading label (`module.name` fallback to `Module {n}`)
  - empty-module state now shown in a bordered white placeholder block
- Updated activity card styling in `app/components/operation/checklist/OperationActivityCard.vue`:
  - card base switched to light slate background
  - job description now rendered in a dedicated slate box (`bg-slate-100`) with border
  - editable note textarea now white with border (instead of gray fill)
- Verification:
  - `npm run test` (pass)
  - `npm run build` (pass)

## 2026-02-25 (Activity integrated into section container)

- Refined checklist structure so activity content feels part of the section/module container (not separate standalone cards).
- Updated `app/components/operation/checklist/OperationSectionsChecklist.vue`:
  - wrapped activity list in a shared inner container (`rounded + border + slate background`)
  - added divider lines between activities inside the same module block
- Updated `app/components/operation/checklist/OperationActivityCard.vue`:
  - in editable mode, removed outer card shell (border/background/padding)
  - keeps content blocks only, so layout inherits the surrounding section container
- Verification:
  - `npm run test` (pass)
  - `npm run build` (pass)

## 2026-02-25 (Checklist layout aligned to reference design)

- Further aligned checklist module/activity visuals with provided reference in:
  - `app/components/operation/checklist/OperationSectionsChecklist.vue`
  - `app/components/operation/checklist/OperationActivityCard.vue`
- Section/module refinements:
  - module heading emphasized and activity list grouped in one integrated inner panel
  - cleaner nested background/border hierarchy to avoid separate-card feel
- Activity refinements:
  - job description in slate box
  - condition controls styled as wider green/red action pills
  - note area styled as white bordered field with adjusted height
  - upload button restyled to flat light-slate appearance
  - save button right-aligned with compact width
  - hidden extra helper indicators (`Documentation Required`, max-photos hint, empty-doc warning) for cleaner visual parity
- Verification:
  - `npm run test` (pass)
  - `npm run build` (pass)

## 2026-02-25 (Checklist polish follow-up)

- Final polish pass for execution checklist and layout behavior:
  - `app/pages/operations/[id]/execute.vue`
    - rendered bottom fixed finish bar only for supervisors (prevents empty fixed bar for staff)
    - normalized labels (`Finish Operation`, `Finishing…`)
  - `app/components/operation/checklist/OperationActivityCard.vue`
    - updated note placeholder text to `Type note here…`
    - added visible keyboard focus rings on uploaded/pending image preview buttons
    - removed hidden unused empty-documentation helper block
    - normalized save loading label to `Saving…`
  - `app/components/operation/checklist/OperationSectionsChecklist.vue`
    - adjusted module title sizing for better mobile/desktop balance
  - `app/layouts/default.vue`
    - fixed avatar trigger class typos and hover ring transition styling
- Verification:
  - `npm run test` (pass)
  - `npm run build` (pass; existing duplicate auto-import and sourcemap warnings remain)

## 2026-02-25 (Report image fit: vertical + horizontal)

- Updated report PDF attachment image rendering in `server/utils/reportPdf.ts` so images fill the attachment box in both dimensions.
- Changed image preprocessing pipeline:
  - `sharp` now resizes each attachment to the target box with `fit: "cover"` and centered crop
  - generated image is then drawn exactly to the report box size
- Removed old scale/mask overflow logic from PDF drawing path (no longer needed).
- Verification:
  - `npm run test` (pass)
  - `npm run build` (pass; existing duplicate auto-import/sourcemap warnings remain)

## 2026-02-26 (Report preview iframe + generate download)

- Added new preview-only API endpoint `server/api/operations/[id]/report/preview.post.ts`:
  - validates same report payload contract as generate endpoint
  - enforces complete-operation + supervisor authorization
  - validates selected documentation IDs against operation scope
  - generates PDF bytes without writing DB/file records
  - returns inline `application/pdf` response for client iframe preview
- Updated report page flow in `app/pages/operations/[id]/report.vue`:
  - `Open Preview` now generates PDF from current form state and shows it in an in-page iframe dialog (no new browser tab)
  - preview uses Blob URL lifecycle with cleanup (`URL.revokeObjectURL`) on close/unmount
  - `Generate Report` now persists report as before and then triggers direct PDF download from returned `pdfPath`
  - consolidated payload validation/building in a shared client helper for preview + generate paths
- Verification:
  - `npm run test` (pass)
  - `npm run build` (pass; existing duplicate auto-import/sourcemap warnings remain)

## 2026-02-26 (Checklist activity card compact design alignment)

- Updated checklist activity card styling to match compact reference design in `app/components/operation/checklist/OperationActivityCard.vue`:
  - editable activity now uses standalone card shell (`rounded + border + white bg`)
  - reduced description, condition, textarea, upload, and save control sizing for tighter mobile visual density
  - fixed condition action button width classes to valid Tailwind utility (`w-24`)
  - restored note placeholder to `Type tool note here`
- Updated section/module activity layout in `app/components/operation/checklist/OperationSectionsChecklist.vue`:
  - module container simplified to compact slate block
  - removed integrated shared activity panel/divider pattern
  - activities now render as individual stacked cards to match screenshot structure
- Verification:
  - `npm run test` (pass)
  - `npm run build` (pass; existing duplicate auto-import/sourcemap warnings remain)

## 2026-02-26 (Checklist duplicate title + condition selection fix)

- Fixed duplicate section/module title rendering in `app/components/operation/checklist/OperationSectionsChecklist.vue`:
  - removed inner module title display so opened dropdown shows activities directly under the section header.
- Fixed condition button interaction regression in `app/components/operation/checklist/OperationSectionsChecklist.vue`:
  - restored activity loop index (`activityIndex`) in `v-for`
  - ensures `set-status` emits valid section/module/activity indices again.
- Verification:
  - `npm run test` (pass)
  - `npm run build` (pass; existing duplicate auto-import/sourcemap warnings remain)

## 2026-02-26 (Remove gap between section title and activities)

- Tightened section collapse spacing in `app/components/operation/checklist/OperationSectionsChecklist.vue`:
  - removed bottom margin on section trigger button
  - removed extra spacing on collapsible content container
  - removed top padding inside module wrapper
- Result: activity list now starts immediately under the opened section header.
- Verification:
  - `npm run test` (pass)
  - `npm run build` (pass; existing duplicate auto-import/sourcemap warnings remain)

## 2026-02-26 (Section header + activities unified container)

- Refactored section collapsible layout in `app/components/operation/checklist/OperationSectionsChecklist.vue` so section title and activity list are rendered inside one continuous container (single bordered block).
- Updated structure:
  - section root now owns rounded border/background (`Collapsible` class)
  - trigger button is borderless/flat inside same container
  - content uses a top divider (`border-t`) instead of separate outer box
- This removes visual separation and keeps header + activities as one integrated block.
- Verification:
  - `npm run test` (pass)
  - `npm run build` (pass; existing duplicate auto-import/sourcemap warnings remain)

## 2026-02-26 (Preserve checklist open state on save)

- Improved execute-page save UX so saving activity/tools does not collapse opened sections or trigger full-page loading spinner.
- Updated `app/composables/operation/useOperationDetail.ts`:
  - added `fetchOperationDetail({ silent?: boolean })`
  - `silent: true` skips toggling global `loading` state
  - preserves section open/closed state by section ID across checklist refetch
- Updated `app/composables/operation/useOperationSave.ts`:
  - tools save and activity save now call `fetchOperationDetail({ silent: true })`
  - keeps current checklist context open while still syncing latest server data after save
- Verification:
  - `npm run test` (pass)
  - `npm run build` (pass; existing duplicate auto-import/sourcemap warnings remain)

## 2026-02-26 (Tools execution card background refinement)

- Updated tools execution card styling in `app/components/operation/checklist/ToolsChecklistPanel.vue`:
  - tool card background switched to white (`bg-white`)
  - tool name/quantity header row now uses slate background (`bg-slate-100`) with rounded inset styling
- Keeps existing condition and notes behavior unchanged.
- Verification:
  - `npm run test` (pass)
  - `npm run build` (pass; existing duplicate auto-import/sourcemap warnings remain)

## 2026-02-26 (Tools execution controls + note area polish)

- Refined tools execution condition blocks in `app/components/operation/checklist/ToolsChecklistPanel.vue`:
  - wrapped pre/post controls in compact slate sub-panels (`rounded + border + bg-slate-50`)
  - updated condition labels to uppercase micro-label style for clearer hierarchy
  - normalized condition button sizing (`w-14`, rounded) for consistent visual rhythm
- Refined tool note fields in `app/components/operation/checklist/ToolsChecklistPanel.vue`:
  - increased textarea minimum height for easier mobile entry
  - aligned border/background treatment with white input surface
  - updated placeholders to `Type pre-condition note…` / `Type post-condition note…`
- Verification:
  - `npm run test` (pass)
  - `npm run build` (pass; existing duplicate auto-import/sourcemap warnings remain)

## 2026-02-26 (Draggable attachment ordering in field report)

- Added drag-and-drop ordering for selected attachment cards in `app/pages/operations/[id]/report.vue`.
- Users can now drag selected documentation cards inside each attachment note to set output order before preview/generate.
- Added a small helper hint (`Drag cards to set attachment order.`) shown when multiple images are selected and report is editable.
- Attachment order now follows the reordered `documentationIds` list sent in report preview/generate payload.

## 2026-02-26 (Attachment card reorder correction)

- Updated `app/pages/operations/[id]/report.vue` drag-and-drop behavior to reorder entire attachment note cards (note + selected images), not individual image cards.
- Restored selected-image grid to static display within each attachment card; remove action remains unchanged.
- Added per-card drag hint (`Drag this attachment card to reorder.`) and visual drop-target highlight.
- Report payload note ordering now follows the reordered attachment card sequence.
- Verification:
  - `npm run test` (pass)
  - `npm run build` (pass; existing duplicate auto-import/sourcemap warnings remain)

## 2026-02-26 (Users table UX and responsive fixes)

- Refactored `app/pages/users/index.vue` table rendering and responsive layout.
- Moved loading/error/empty states into table rows (`TableBody` + `TableRow` + `TableCell`), removing out-of-table status blocks.
- Added table skeleton rows that mimic user list columns while loading.
- Updated role labels in UI to title case for non-IM roles (`Observer`, `Staff`) while keeping backend filter values unchanged.
- Fixed filter checkbox behavior by removing duplicate click handlers and relying on `@update:checked` only.
- Added mobile-first responsive controls (search/filter/new button stack/wrap) and table swipe behavior on small screens (`overflow-x-auto` + wide minimum table width).
- Added visible table border container styling (`rounded + border + bg-white`).
- Verification:
  - `npm run test` (pass)
  - `npm run build` (pass; existing duplicate auto-import/sourcemap warnings remain)

## 2026-02-26 (Users mobile header + table frame/swipe refinement)

- Refined `app/pages/users/index.vue` mobile layout to better match provided reference:
  - header controls switched to one responsive row (`Search`, `Sort by`, `+ new`)
  - updated title to `Manage Users`
  - moved active-filter badge fully inside filter button to avoid viewport overflow
- Wrapped user table in a framed container (`rounded-xl + border + bg-white`) and constrained overflow handling:
  - added dedicated horizontal swipe area for table content (`overflow-x-auto`, `overscroll-behavior-x: contain`, `touch-action: pan-x`)
  - kept wide table (`min-w-[960px]`) so columns remain readable on mobile
  - added page-level horizontal overflow clipping to prevent whole-page sideways scroll
- Verification:
  - `npm run test` (pass)
  - `npm run build` (pass; existing duplicate auto-import/sourcemap warnings remain)

## 2026-02-26 (Users page rebuilt as responsive table demo)

- Replaced `app/pages/users/index.vue` with a Nuxt + Tailwind responsive table implementation using local dummy `users` data in `<script setup>`.
- Implemented requested structure:
  - responsive main layout with stable header (`Manage Users` + `+ New`) and separate footer pagination
  - table wrapped in dedicated horizontal scroll container (`overflow-x-auto`) with wide table layout (`min-w-[800px]`)
  - sticky table header (`thead.sticky.top-0`) for vertical scroll visibility
  - thin row borders and clean neutral color palette
- Added simple client-side search and pagination with `v-for` row rendering.
- Verification:
  - `npm run test` (pass)
  - `npm run build` (pass; existing duplicate auto-import/sourcemap warnings remain)

## 2026-02-26 (Revert users demo rewrite)

- Reverted `app/pages/users/index.vue` from dummy-data demo back to the API-backed users management implementation requested previously.
- Restored search/filter/pagination integration with `/api/users`, user actions, and dialog flows.

## 2026-02-26 (Users swipe scope + small-screen header stretch)

- Updated `app/pages/users/index.vue` header controls to fully adapt on small screens:
  - controls now stack to single-column on narrow widths and switch to row layout from `sm` breakpoint
  - filter and new buttons are full-width on mobile and auto-width on larger screens
- Kept table swipe confined to the table frame by preserving the dedicated scroll container (`overflow-x-auto`) and preventing page-level horizontal overflow in content shell.
- Updated `app/layouts/default.vue` main content wrapper with `overflow-x-hidden` so horizontal gestures do not shift the whole page while still allowing inner table scroll areas.

## 2026-02-26 (Users mobile overflow hardening follow-up)

- Further hardened users page mobile behavior in `app/pages/users/index.vue`:
  - table scroll wrapper now explicitly uses `w-full max-w-full` to keep scroll scope locked to table container width
  - reduced table minimum width from `960px` to `900px` to lower swipe distance while preserving readability
  - pagination container now wraps with `flex-wrap` + `gap-2` to prevent horizontal overflow on small screens

## 2026-02-26 (Try mentor-style swipeable table pattern)

- Pulled reference from `origin/review/manage-user` and applied the same ScrollArea-based table wrapper pattern on users page.
- Added new UI primitive files:
  - `app/components/ui/scroll-area/ScrollArea.vue`
  - `app/components/ui/scroll-area/ScrollBar.vue`
  - `app/components/ui/scroll-area/index.ts`
- Updated `app/pages/users/index.vue` to wrap users table with `ScrollArea` while keeping responsive table width constraints.
- Verification:
  - `npm run test` (pass)
  - `npm run build` (pass; existing duplicate auto-import and sourcemap/deprecation warnings remain)

## 2026-02-27 (Users page mobile responsiveness + WCAG improvements)

- Improved `app/pages/users/index.vue` responsiveness for mobile/tablet/desktop:
  - improved controls layout spacing and wrap behavior on small screens
  - kept table swipe localized to table area via `ScrollArea` + table container overflow behavior
- Improved accessibility and interaction support:
  - added ARIA labels for search, filter trigger, create button, table region, and per-row action menu trigger
  - added keyboard-focusable table scroll container (`tabindex="0"`) for keyboard horizontal scrolling
  - improved contrast for low-emphasis text in filter sections
- Improved mobile touch UX:
  - increased primary control/action targets to at least 44px (`h-11`/`min-h-11`)
  - enlarged filter checkboxes and touch rows
  - enlarged pagination and row action triggers for thumb use
- Re-applied mentor-style table scroll wrapper pattern without modifying base UI table components:
  - added `app/components/ui/scroll-area/ScrollArea.vue`
  - added `app/components/ui/scroll-area/ScrollBar.vue`
  - added `app/components/ui/scroll-area/index.ts`
  - wrapped users table with `ScrollArea` in `app/pages/users/index.vue`
  - aligned users-page header/table wrapper styling closer to `origin/review/manage-user`
  - final parity polish: header copy/casing and spacing/button classes adjusted to mentor style (`Manage user`, `Filter`, `+ New`, `Search`)
  - fixed narrow-width header behavior so search stretches fluidly while keeping `Filter` and `+ New` in a single compact row (`<md`) and preventing clipping around tablet/mobile breakpoints
  - tuned medium breakpoint layout (`md`) to prevent action clipping by reducing heading footprint and making controls area fluid with a bounded max width
- Verification:
  - `npm run test` (pass)
  - `npm run build` (pass; existing duplicate auto-import and Tailwind sourcemap/deprecation warnings remain)

## 2026-02-27 (Users header medium-breakpoint wrap stabilization)

- Updated `app/pages/users/index.vue` header layout so medium-width screens no longer compress title + controls into one crowded row.
- Changed header container to wrap at medium sizes and keep single-row only on large (`lg`) screens.
- Made the title consume its own row on `md` (`md:basis-full`) and kept controls full-width with bounded max width (`md:max-w-[560px]`).
- Preserved compact one-row controls (`Search`, `Filter`, `+ New`) behavior and table swipe setup.
- Verification:
  - `npm run test` (pass)
  - `npm run build` (pass; existing duplicate auto-import and Tailwind sourcemap/deprecation warnings remain)

## 2026-02-27 (Users controls stretch fix around 692px)

- Fixed users header control row in `app/pages/users/index.vue` so `Search`, `Filter`, and `+ New` keep stretching with viewport width at medium sizes.
- Updated controls wrapper breakpoint cap from `md:max-w-[560px]` to `md:max-w-none lg:max-w-[560px]`.
- Result: no early width clamp at medium range; width cap now applies only on large desktop.
- Verification:
  - `npm run test` (pass)
  - `npm run build` (pass; existing duplicate auto-import and Tailwind sourcemap/deprecation warnings remain)

## 2026-02-27 (Mobile header title alignment for users page)

- Updated `app/layouts/default.vue` mobile top header title behavior.
- Added `mobilePageTitle` computed mapping so users route shows `Manage Users` on mobile.
- Center-aligned mobile header title using absolute center positioning while keeping menu button left and avatar right.
- Kept desktop breadcrumb/title behavior unchanged.
- Verification:
  - `npm run test` (pass)
  - `npm run build` (pass; existing duplicate auto-import and Tailwind sourcemap/deprecation warnings remain)

## 2026-02-27 (Users controls fluid width before desktop breakpoint)

- Updated users page header responsive breakpoints in `app/pages/users/index.vue` to avoid medium-threshold layout jumps.
- Changed page spacing breakpoint from `md` to `sm` (`p-4 sm:p-6 lg:p-8`) so width behavior remains stable through tablet widths.
- Kept `Manage user` inline title hidden until desktop only (`lg:block`) to avoid non-desktop header reflow pressure.
- Made controls row (`Search`, `Filter`, `+ New`) fluid up to desktop by moving alignment/cap rules to `lg` only:
  - `lg:ml-auto`
  - `lg:max-w-[560px]`
- Delayed `+ New` horizontal padding increase to desktop only (`lg:px-6`) to prevent width jump in smaller layouts.
- Verification:
  - `npm run test` (pass)
  - `npm run build` (pass; existing duplicate auto-import and Tailwind sourcemap/deprecation warnings remain)

## 2026-02-27 (Operation-style responsive headers for users and tools)

- Refactored `app/pages/users/index.vue` header controls to mirror the stable operation-list flex pattern:
  - replaced grid-based control row with flex-based row (`Search` grows, `Filter` and `+ New` stay shrink-0)
  - preserved large-desktop cap/alignment (`lg:ml-auto lg:max-w-[560px]`)
- Refactored `app/pages/tools/index.vue` header controls with the same pattern:
  - removed nested/fragile header wrappers
  - applied fluid control row (`Search` + `+ New`) with desktop cap (`lg:max-w-[460px]`)
  - aligned spacing breakpoints to `p-4 sm:p-6 lg:p-8`
  - improved search input accessibility (`aria-label`, `name`, `autocomplete`, explicit `h-10 w-full`)
- Verification:
  - `npm run test` (pass)
  - `npm run build` (pass; existing duplicate auto-import and Tailwind sourcemap/deprecation warnings remain)

## 2026-02-27 (Users header regression analysis + width containment hardening)

- Investigated why users mobile header appeared shifted/clipped while tools/operations looked correct.
- Root-cause contributor identified in layout flex container sizing:
  - `app/layouts/default.vue` main content column now includes `min-w-0` to prevent wide children from expanding layout width.
- Simplified users table wrapper to reduce cross-component overflow interaction:
  - removed `ScrollArea` wrapper usage in `app/pages/users/index.vue`
  - switched to direct framed container + table min width (`min-w-[860px]`) for contained horizontal scrolling behavior
- Kept users header controls aligned to operation/tools flex pattern (`Search` grows, action buttons shrink-0).
- Verification:
  - `npm run test` (pass)
  - `npm run build` (pass; existing duplicate auto-import and Tailwind sourcemap/deprecation warnings remain)

## 2026-02-27 (Execute checklist tabs alignment at 640px)

- Updated checklist header layout in `app/pages/operations/[id]/execute.vue` for both editable and read-only modes.
- Ensured `Tools` and `Operation` tab buttons stay in one line with `justify-between` from `sm` (640px) and above:
  - editable section header uses `sm:flex-row sm:items-center sm:justify-between`
  - read-only section header uses `sm:flex-row sm:items-center sm:justify-between`
- Keeps stacked mobile layout below `sm`, and aligned single-line layout at/above `sm`.
